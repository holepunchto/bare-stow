const pack = require('bare-pack')
const fs = require('./fs')
const assets = require('./assets')
const shim = require('./shim')
const graph = require('./graph')
const rpcs = require('./rpc')
const transformer = require('./transform')

module.exports = async function* link(entries, target, out, opts = {}) {
  if (!target) throw new Error("'target' is required")
  if (!out) throw new Error("'out' is required")

  let {
    language,
    languageOptions,
    targetOptions,
    server,
    hosts,
    transforms,
    transformOptions,
    resolveTarget,
    resolveRPC,
    resolveTransform,
    resolveLanguage,
    readModule = fs.readModule,
    listPrefix = fs.listPrefix,
    resolveModule = fs.resolveModule,
    ...packOpts
  } = opts

  entries = await Promise.all([].concat(entries).map((entry) => resolveModule(new URL(entry))))

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
  targetOptions = resolved.targetOptions
  hosts = resolved.hosts

  if (!target.linked) throw new Error(`Target '${target.name}' does not link addons`)

  if (typeof harness.link !== 'function') {
    throw new Error(
      `Target '${target.name}' does not support linking for language '${language.name}'`
    )
  }

  if (server) server = rpcs(server, resolveRPC)

  transforms = transformer(transforms, transformOptions, resolveTransform)

  const layout = language.layout(out, options)

  if (!layout.addons) throw new Error(`Language '${language.name}' does not support linked addons`)

  const traversal = graph.traversal(packOpts, hosts)

  const context = {
    target: target.name,
    language: language.name,
    options,
    targetOptions,
    hosts
  }

  const packages = new Map()
  const linked = new Map()

  // Each graph is packed and transformed as `stow()` does, so that the addons
  // and assets are those that its bundle loads.
  for (const entry of entries) {
    const main = shim(entry, target.isolation, server)

    const hooks = {
      readModule: graph.readModule(main.modules, readModule),
      listPrefix,
      resolveModule
    }

    let bundle = await pack(
      main.url,
      { ...traversal, linked: true },
      hooks.readModule,
      hooks.listPrefix,
      hooks.resolveModule
    )

    bundle = await transformer.apply(transforms, bundle, context)

    for (const url of await graph.addons(bundle, hosts, hooks.readModule)) {
      packages.set(url.href, url)
    }

    await collectAssets(bundle, hooks.readModule, linked)
  }

  const addons = []

  for await (const url of graph.link([...packages.values()], layout.addons, traversal, {
    readModule,
    listPrefix,
    resolveModule
  })) {
    addons.push(url)
    yield { url }
  }

  if (linked.size > 0) {
    if (!layout.resources) {
      throw new Error(`Language '${language.name}' does not support linked assets`)
    }

    for await (const url of assets.write(layout.resources, assets.app, linked.values())) {
      yield { url }
    }
  }

  const generated = harness.link({ options, targetOptions })

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

async function collectAssets(bundle, readModule, collected) {
  for (const key of bundle.assets) {
    const url = new URL(key)
    const relative = await assets.path(url, readModule)
    const source = bundle.read(key)
    const existing = collected.get(relative)

    if (existing && !existing.source.equals(source)) {
      throw new Error(`Assets '${existing.url.href}' and '${url.href}' both link as '${relative}'`)
    }

    collected.set(relative, { path: relative, url, source })
  }
}
