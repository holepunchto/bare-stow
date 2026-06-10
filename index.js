const path = require('path')
const { fileURLToPath } = require('url')
const pack = require('bare-pack')
const { resolve } = require('bare-module-traverse')
const id = require('bare-bundle-id')
const fs = require('./lib/fs')
const shim = require('./lib/shim')
const harness = require('./lib/harness')

module.exports = async function* stow(entry, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let { client, server, base, hosts, ...packOpts } = opts

  const t = harness(target)

  entry = new URL(entry)
  out = new URL(out)
  base = base ? new URL(base) : new URL('./', entry)

  if (hosts) {
    for (const host of hosts) {
      if (!t.hosts.includes(host)) {
        throw new Error(`Host '${host}' is not supported by target '${target}'`)
      }
    }
  } else {
    hosts = t.hosts
  }

  const shimURL = shim.url(base)
  const shimSource = shim(entry, shimURL, { server })

  const readModule = wrapReadModule(fs.readModule, shimURL, shimSource)

  const bundleURL = bundleURLFor(out, t)
  const bundleSpecifier = relativeSpecifier(out, bundleURL)

  const offloaded = []

  let writeFile

  if (isOffloadEnabled(t.offload)) writeFile = collectOffloaded(base, out, offloaded)

  const bundle = await pack(
    shimURL,
    {
      resolve: resolve.bare,
      ...packOpts,
      hosts,
      linked: t.linked,
      offload: t.offload,
      base: base
    },
    readModule,
    fs.listPrefix,
    writeFile
  )

  bundle.id = id(bundle).toString('hex')

  const harnessSource = t.generate({ bundleSpecifier, client })

  await fs.writeFile(out, harnessSource)
  yield { url: out }

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
  return function (url) {
    if (url.href === shimURL.href) return shimSource

    return readModule(url)
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

function bundleURLFor(out, target) {
  const dir = new URL('./', out)
  const base = path.basename(out.pathname, path.extname(out.pathname))

  return new URL(base + target.extension, dir)
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
