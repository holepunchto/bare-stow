const path = require('path')
const { fileURLToPath } = require('url')
const pack = require('bare-pack')
const id = require('bare-bundle-id')
const strip = require('bare-type-stripper')
const { resolve } = require('bare-module-traverse')
const fs = require('./lib/fs')
const shim = require('./lib/shim')
const harness = require('./lib/target')
const rpc = require('./lib/rpc')

module.exports = async function* stow(entry, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let { client, server, base, hosts, resolveTarget, resolveRPC, ...packOpts } = opts

  const t = harness(target, resolveTarget)

  const targetName = typeof target === 'string' ? target : t.name

  entry = new URL(entry)
  out = new URL(out)

  // The target may pin a module system; otherwise it follows the output path.
  const module = t.module || (await resolveModule(out))

  if (hosts) {
    for (const host of hosts) {
      if (!t.hosts.includes(host)) {
        throw new Error(`Host '${host}' is not supported by target '${targetName}'`)
      }
    }
  } else {
    hosts = t.hosts
  }

  const shimURL = shim.url(new URL('./', entry))

  // The server only contributes runtime wiring to the shim; the shim is not a
  // typed, host-facing module so it has no declaration artifact.
  const serverSetup = server
    ? fragment(
        rpc(server, resolveRPC).generate({
          ipc: 'ipc',
          rpc: 'rpc',
          module: 'esm',
          role: 'server'
        }),
        null
      )
    : null

  const shimSource = shim(entry, shimURL, { server: serverSetup })

  const readModule = wrapReadModule(fs.readModule, shimURL, shimSource)

  const bundleURL = siblingURL(out, t.extension)
  const bundleSpecifier = relativeSpecifier(out, bundleURL)

  const offloaded = []

  let writeFile

  if (isOffloadEnabled(t.offload)) writeFile = collectOffloaded(offloaded)

  // The base of the bundle depends on where its modules live, so the graph is
  // packed unbased and unmounted once that is known.
  let bundle = await pack(
    shimURL,
    {
      ...packOpts,
      resolve: resolve.bare,
      aliases: {
        '.ts': '.js',
        '.mts': '.mjs',
        '.cts': '.cjs'
      },
      hosts,
      linked: t.linked,
      offload: t.offload
    },
    readModule,
    fs.listPrefix,
    writeFile
  )

  base = resolveBase(base, bundle)

  bundle = rerootOffloaded(bundle.unmount(base), base, out, offloaded)

  bundle.id = id(bundle).toString('hex')

  // The client contributes both runtime wiring (spliced into the harness) and a
  // type expression (spliced into the harness declaration), so it is resolved
  // into both channels before handing it to the target.
  let clientSetup = null

  if (client) {
    const artifacts = rpc(client, resolveRPC).generate({
      ipc: 'ipc',
      rpc: 'rpc',
      role: 'client',
      module
    })

    clientSetup = {
      source: fragment(artifacts, null),
      type: fragment(artifacts, '.d.ts')
    }
  }

  const artifacts = t.generate({
    bundleSpecifier,
    ipc: 'ipc',
    rpc: 'rpc',
    module,
    client: clientSetup
  })

  // The first artifact is the harness written to `out`; any further artifacts
  // are siblings named after `out` with the artifact's own extension.
  for (const artifact of artifacts) {
    const url = artifact.extension ? siblingURL(out, artifact.extension) : out

    await fs.writeFile(url, artifact.source)
    yield { url }
  }

  await fs.writeFile(bundleURL, encodeBundle(bundle, t.format, t.encoding ?? 'utf8'))
  yield { url: bundleURL }

  for (const artifact of offloaded) {
    await fs.writeFile(artifact.url, artifact.source)
    yield { url: artifact.url }
  }
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

function wrapReadModule(readModule, shimURL, shimSource) {
  return async function (url) {
    if (url.href === shimURL.href) return shimSource

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

// Offloaded files are written next to the harness, so their resolutions are
// rewritten to point beside the bundle, along with the directories that hold
// them, as `bare-pack` does for a bundle packed with a base.
function rerootOffloaded(bundle, base, out, offloaded) {
  if (offloaded.length === 0) return bundle

  const dir = new URL('./', out)
  const rewrites = new Map()

  for (const file of offloaded) {
    const relative = offloadedPath(file.url, base)

    let key = '/' + path.posix.relative(base.pathname, file.url.pathname)
    let value = '/../' + relative

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

async function resolveModule(out) {
  switch (path.extname(out.pathname)) {
    case '.mjs':
      return 'esm'
    case '.cjs':
      return 'cjs'
  }

  // For an ambiguous extension (e.g. '.js') the module system follows the
  // `type` of the closest enclosing `package.json`, defaulting to CommonJS.
  return (await packageType(new URL('./', out))) === 'module' ? 'esm' : 'cjs'
}

async function packageType(dir) {
  while (true) {
    let source = null

    try {
      source = await fs.readFile(new URL('package.json', dir))
    } catch {
      // No `package.json` in this directory; keep searching upwards.
    }

    if (source !== null) return JSON.parse(source).type ?? null

    const parent = new URL('../', dir)

    if (parent.pathname === dir.pathname) return null

    dir = parent
  }
}

function siblingURL(out, extension) {
  const dir = new URL('./', out)
  const base = path.basename(out.pathname, path.extname(out.pathname))

  return new URL(base + extension, dir)
}

function fragment(artifacts, extension) {
  for (const artifact of artifacts) {
    if ((artifact.extension ?? null) === extension) return artifact.source
  }

  return null
}

function relativeSpecifier(from, to) {
  if (from.protocol === 'file:' && to.protocol === 'file:') {
    const fromDir = path.dirname(fileURLToPath(from))
    const toPath = fileURLToPath(to)

    let relative = path.relative(fromDir, toPath).split(path.sep).join('/')

    if (!relative.startsWith('.')) relative = './' + relative

    return relative
  }

  return to.href
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
