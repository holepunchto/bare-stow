const path = require('path')
const { fileURLToPath } = require('url')
const pack = require('bare-pack')
const id = require('bare-bundle-id')
const strip = require('bare-type-stripper')
const fs = require('./lib/fs')
const shim = require('./lib/shim')
const harness = require('./lib/target')
const rpc = require('./lib/rpc')
const resolve = require('./lib/resolve')

module.exports = async function* stow(entry, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let { client, server, base, hosts, resolveTarget, resolveRPC, ...packOpts } = opts

  const t = harness(target, resolveTarget)

  const targetName = typeof target === 'string' ? target : t.name

  entry = new URL(entry)
  out = new URL(out)
  base = base ? new URL(base) : new URL('./', entry)

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

  const shimURL = shim.url(base)

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

  if (isOffloadEnabled(t.offload)) writeFile = collectOffloaded(base, out, offloaded)

  const bundle = await pack(
    shimURL,
    {
      ...packOpts,
      resolve,
      aliases: {
        '.ts': '.js',
        '.mts': '.mjs',
        '.cts': '.cjs'
      },
      base,
      hosts,
      linked: t.linked,
      offload: t.offload
    },
    readModule,
    fs.listPrefix,
    writeFile
  )

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

function collectOffloaded(base, out, sink) {
  const dir = new URL('./', out)

  return function writeFile(url, source) {
    let relative

    const nm = url.pathname.indexOf('/node_modules/')

    if (nm >= 0) {
      relative = url.pathname.slice(nm + 1)
    } else if (url.pathname.startsWith(base.pathname)) {
      relative = url.pathname.slice(base.pathname.length)
    } else {
      relative = url.pathname.replace(/^\//, '')
    }

    sink.push({ url: new URL(relative, dir), source })

    return null
  }
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
