const path = require('path')
const { fileURLToPath, pathToFileURL } = require('url')
const pack = require('bare-pack')
const link = require('bare-link')
const id = require('bare-bundle-id')
const strip = require('bare-type-stripper')
const { resolve } = require('bare-module-traverse')
const fs = require('./lib/fs')
const shim = require('./lib/shim')
const targets = require('./lib/target')
const rpcs = require('./lib/rpc')
const languages = require('./lib/language')
const { select } = require('./lib/provider')

module.exports = async function* stow(entry, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let {
    language = 'javascript',
    languageOptions,
    client,
    server,
    base,
    hosts,
    resolveTarget,
    resolveRPC,
    resolveLanguage,
    ...packOpts
  } = opts

  entry = await fs.resolveModule(new URL(entry))
  out = new URL(out)

  if (!out.pathname.endsWith('/')) out.pathname += '/'

  target = targets(target, resolveTarget)
  language = languages(language, resolveLanguage)

  const harness = select('Target', target, language.name)

  if (client) client = select('RPC library', rpcs(client, resolveRPC), language.name)
  if (server) server = rpcs(server, resolveRPC)

  // A target may pin options that it can't do without, overriding those given.
  const options = { ...language.options(languageOptions), ...harness.options }

  target = targets.resolve(target, { language: language.name, options })

  hosts = resolveHosts(hosts, target.hosts, target.name)

  const layout = language.layout(out, options)

  const bundleURL = new URL('index' + target.extension, layout.artifacts ?? layout.harness)

  if (client) {
    client = {
      url: language.sibling(layout.harness, 'client'),
      ...client.generate({ role: 'client', options })
    }
  }

  const files = [
    {
      url: layout.harness,
      ...harness.generate({
        bundle: language.reference(layout.harness, bundleURL),
        client: client && language.reference(layout.harness, client.url),
        options
      })
    }
  ]

  if (client) files.push(client)

  const main = shim(entry, target.isolation, server)

  const readModule = wrapReadModule(fs.readModule, main.modules)

  const offloaded = []

  let writeFile

  if (isOffloadEnabled(target.offload)) writeFile = collectOffloaded(offloaded)

  // The graph is traversed the same way when packing it as when linking its
  // addons.
  const traversal = {
    ...packOpts,
    resolve: resolve.bare,
    aliases: {
      '.ts': '.js',
      '.mts': '.mjs',
      '.cts': '.cjs'
    },
    hosts
  }

  // The base of the bundle depends on where its modules live, so the graph is
  // packed unbased and unmounted once that is known.
  let bundle = await pack(
    main.url,
    { ...traversal, linked: target.linked, offload: target.offload },
    readModule,
    fs.listPrefix,
    fs.resolveModule,
    writeFile
  )

  base = resolveBase(base, bundle)

  bundle = rerootOffloaded(bundle.unmount(base), base, bundleURL, offloaded)

  bundle.id = id(bundle).toString('hex')

  // The manifest lists the offloaded files only once it's known there are any.
  const artifacts = offloaded.length > 0 ? [bundleURL, offloadURL(bundleURL)] : [bundleURL]

  const addons = []

  if (target.linked) {
    if (!layout.addons) {
      throw new Error(`Language '${language.name}' does not support linked addons`)
    }

    // The addons are those of the bundled graph, so linking starts from the
    // shim and reads the graph the way packing does. The layout must not
    // depend on the hosts, as Swift packages only accept XCFrameworks, and the
    // resources linked outside of the directory are intermediate.
    for await (const resource of link(fileURLToPath(main.url), {
      ...traversal,
      out: fileURLToPath(layout.addons),
      alwaysMultiHost: true,
      readModule,
      listPrefix: fs.listPrefix,
      resolveModule: fs.resolveModule
    })) {
      const url = pathToFileURL(resource)

      if (!url.href.startsWith(layout.addons.href)) continue

      addons.push(url)
      yield { url }
    }
  }

  files.push({
    url: layout.manifest,
    source: language.manifest({
      name: layout.name,
      dependencies: Object.assign({}, ...files.map((file) => file.dependencies)),
      options,
      hosts,
      artifacts: artifacts.map((url) => language.reference(layout.manifest, url)),
      addons: addons.map((url) => language.reference(layout.manifest, url))
    })
  })

  for (const file of files) {
    await fs.writeFile(file.url, file.source)
    yield { url: file.url }

    if (file.types) {
      const typesURL = language.types(file.url)

      await fs.writeFile(typesURL, file.types)
      yield { url: typesURL }
    }
  }

  await fs.writeFile(bundleURL, encodeBundle(bundle, target.format, target.encoding ?? 'utf8'))
  yield { url: bundleURL }

  // Offloaded files are collected in the order their reads complete, so they
  // are sorted to keep the output stable.
  offloaded.sort((a, b) => (a.url.href < b.url.href ? -1 : a.url.href > b.url.href ? 1 : 0))

  for (const artifact of offloaded) {
    await fs.writeFile(artifact.url, artifact.source)
    yield { url: artifact.url }
  }
}

function resolveHosts(hosts, supported, name) {
  if (!hosts) return supported

  for (const host of hosts) {
    if (!supported.includes(host)) {
      throw new Error(`Host '${host}' is not supported by target '${name}'`)
    }
  }

  return hosts
}

function resolveBase(base, graph) {
  const modules = [...graph.keys()].map((href) => new URL(href))

  if (base) {
    base = new URL(base)

    if (!base.pathname.endsWith('/')) base.pathname += '/'

    for (const url of modules) {
      if (url.protocol === base.protocol && !url.href.startsWith(base.href)) {
        throw new Error(`Module '${url.href}' is outside base '${base.href}'`)
      }
    }

    return base
  }

  let common = null

  for (const url of modules) {
    if (url.protocol !== 'file:') continue

    const dir = new URL('./', url)

    if (common === null) common = dir

    while (!dir.href.startsWith(common.href)) {
      const parent = new URL('../', common)

      if (parent.href === common.href) throw new Error('Modules share no common base')

      common = parent
    }
  }

  return common
}

function isOffloadEnabled(offload) {
  if (offload === true) return true
  if (offload && (offload.addons || offload.assets)) return true

  return false
}

function wrapReadModule(readModule, modules) {
  return async function (url) {
    if (modules.has(url.href)) return modules.get(url.href)

    const source = await readModule(url)

    if (source === null) return null

    if (/\.(c|m)?ts$/.test(url.pathname)) return strip(source)

    return source
  }
}

function collectOffloaded(sink) {
  return function writeFile(url, source) {
    sink.push({ url, source })

    return null
  }
}

// Offloaded files are written to a directory named after the bundle rather than
// next to the harness, as a mirrored `node_modules` beside the harness would
// shadow the packages it imports. Their resolutions are rewritten to point into
// that directory, along with the directories that hold them.
function offloadURL(bundleURL) {
  return new URL(path.basename(bundleURL.pathname) + '.d/', bundleURL)
}

function rerootOffloaded(bundle, base, bundleURL, offloaded) {
  if (offloaded.length === 0) return bundle

  const dir = offloadURL(bundleURL)
  const name = path.basename(dir.pathname)
  const rewrites = new Map()

  for (const file of offloaded) {
    const relative = offloadedPath(file.url, base)

    let key = '/' + path.posix.relative(base.pathname, file.url.pathname)
    let value = '/../' + name + '/' + relative

    rewrites.set(key, value)

    for (;;) {
      key = key.substring(0, key.lastIndexOf('/'))

      if (isTerminator(key)) break

      value = value.substring(0, value.lastIndexOf('/'))

      if (isTerminator(value)) break

      rewrites.set(key, value)
    }

    file.url = new URL(relative, dir)
  }

  const resolutions = {}

  for (const [href, imports] of Object.entries(bundle.resolutions)) {
    resolutions[href] = rewriteImports(imports, rewrites)
  }

  bundle.resolutions = resolutions
  bundle.addons = bundle.addons.map((href) => rewrites.get(href) || href)
  bundle.assets = bundle.assets.map((href) => rewrites.get(href) || href)

  return bundle
}

function offloadedPath(url, base) {
  const nm = url.pathname.indexOf('/node_modules/')

  if (nm >= 0) return url.pathname.slice(nm + 1)

  if (url.pathname.startsWith(base.pathname)) return url.pathname.slice(base.pathname.length)

  return url.pathname.replace(/^\//, '')
}

function rewriteImports(imports, rewrites) {
  if (typeof imports === 'string') return rewrites.get(imports) || imports

  if (typeof imports !== 'object' || imports === null) return imports

  const rewritten = {}

  for (const [condition, value] of Object.entries(imports)) {
    rewritten[condition] = rewriteImports(value, rewrites)
  }

  return rewritten
}

function isTerminator(input) {
  return input === '' || input.endsWith('/') || input.endsWith(':')
}

function encodeBundle(bundle, format, encoding) {
  const data = bundle.toBuffer()

  switch (format) {
    case 'bundle':
      return data
    case 'bundle.cjs':
      return `module.exports = ${JSON.stringify(data.toString(encoding))}\n`
    case 'bundle.mjs':
      return `export default ${JSON.stringify(data.toString(encoding))}\n`
    case 'bundle.json':
      return JSON.stringify(data.toString(encoding)) + '\n'
    default:
      throw new Error(`Unknown format '${format}'`)
  }
}
