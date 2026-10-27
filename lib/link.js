const pack = require('bare-pack')
const fs = require('./fs')
const assets = require('./assets')
const shim = require('./shim')
const graph = require('./graph')
const rpcs = require('./rpc')

module.exports = async function* link(entries, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let {
    language,
    languageOptions,
    targetOptions,
    server,
    hosts,
    resolveTarget,
    resolveRPC,
    resolveLanguage,
    ...packOpts
  } = opts

  entries = await Promise.all([].concat(entries).map((entry) => fs.resolveModule(new URL(entry))))

  if (entries.length === 0) throw new Error("'entries' must not be empty")
  out = new URL(out)

  if (!out.pathname.endsWith('/')) out.pathname += '/'

  const resolved = graph.providers(target, {
    language,
    languageOptions,
    targetOptions,
    hosts,
    resolveTarget,
    resolveLanguage
  })

  const { harness, options } = resolved

  target = resolved.target
  language = resolved.language
  hosts = resolved.hosts

  if (!target.linked) throw new Error(`Target '${target.name}' does not link addons`)

  if (typeof harness.link !== 'function') {
    throw new Error(
      `Target '${target.name}' does not support linking for language '${language.name}'`
    )
  }

  if (server) server = rpcs(server, resolveRPC)

  const layout = language.layout(out, options)

  if (!layout.addons) throw new Error(`Language '${language.name}' does not support linked addons`)

  // Every shim imports the same runtime and RPC server, so one covers them all.
  const main = shim(entries[0], target.isolation, server)

  const traversal = graph.traversal(packOpts, hosts)
  const readModule = graph.readModule(main.modules)

  const addons = []

  for await (const url of graph.link(
    [main.url, ...entries.slice(1)],
    layout.addons,
    traversal,
    readModule
  )) {
    addons.push(url)
    yield { url }
  }

  const linked = await collectAssets(entries, traversal, readModule)

  if (linked.length > 0) {
    if (!layout.resources) {
      throw new Error(`Language '${language.name}' does not support linked assets`)
    }

    for await (const url of assets.write(layout.resources, assets.app, linked)) yield { url }
  }

  const generated = harness.link({ options })

  const files = []

  if (generated.source) files.push({ url: layout.harness, source: generated.source })

  files.push({
    url: layout.manifest,
    source: language.manifest({
      name: layout.name,
      dependencies: generated.dependencies || {},
      options,
      hosts,
      artifacts: [],
      addons: addons.map((url) => language.reference(layout.manifest, url))
    })
  })

  for (const file of files) {
    await fs.writeFile(file.url, file.source)
    yield { url: file.url }
  }
}

async function collectAssets(entries, traversal, readModule) {
  const collected = new Map()

  for (const entry of entries) {
    const bundle = await pack(
      entry,
      { ...traversal, linked: true },
      readModule,
      fs.listPrefix,
      fs.resolveModule
    )

    for (const key of bundle.assets) {
      const url = new URL(key)
      const relative = await assets.path(url)
      const source = bundle.read(key)
      const existing = collected.get(relative)

      if (existing && !existing.source.equals(source)) {
        throw new Error(
          `Assets '${existing.url.href}' and '${url.href}' both link as '${relative}'`
        )
      }

      collected.set(relative, { path: relative, url, source })
    }
  }

  return [...collected.values()]
}
