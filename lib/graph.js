const { fileURLToPath, pathToFileURL } = require('url')
const bareLink = require('bare-link')
const strip = require('bare-type-stripper')
const { resolve } = require('bare-module-traverse')
const { linked } = require('bare-addon-resolve')
const targets = require('./target')
const languages = require('./language')
const { select } = require('./provider')

exports.providers = function providers(target, opts = {}) {
  let {
    language = 'javascript',
    languageOptions,
    targetOptions,
    hosts,
    resolveTarget,
    resolveLanguage
  } = opts

  target = targets(target, resolveTarget)
  language = languages(language, resolveLanguage)

  const harness = select('Target', target, language.name)

  // A target may pin options that it can't do without, overriding those given.
  const options = { ...language.options(languageOptions), ...harness.options }

  targetOptions = targets.options(target, targetOptions)

  target = targets.resolve(target, { language: language.name, options, targetOptions })

  hosts = resolveHosts(hosts, target.hosts, target.name)

  return { target, language, harness, options, targetOptions, hosts }
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

// The graph is traversed the same way when packing it as when linking its
// addons.
exports.traversal = function traversal(opts, hosts) {
  return {
    ...opts,
    resolve: resolve.bare,
    aliases: {
      '.ts': '.js',
      '.mts': '.mjs',
      '.cts': '.cjs',
      ...opts.aliases
    },
    hosts
  }
}

exports.readModule = function readModule(modules, read) {
  return async function (url) {
    if (modules.has(url.href)) return modules.get(url.href)

    const source = await read(url)

    if (source === null) return null

    if (/\.(c|m)?ts$/.test(url.pathname)) return strip(source)

    return source
  }
}

// A linked addon is named after its package, so the packages of the modules of
// the bundle are matched against the names that they link as on the hosts.
exports.addons = async function addons(bundle, hosts, readModule) {
  const remaining = new Set(bundle.addons.filter((href) => href.startsWith('linked:')))
  const packages = new Set()

  for (const imports of Object.values(bundle.resolutions)) {
    if (typeof imports['#package'] === 'string') packages.add(imports['#package'])
  }

  const dirs = []

  for (const href of packages) {
    const url = new URL(href)
    const pkg = parse(await readModule(url))

    if (pkg?.addon !== true) continue

    const name = pkg.name.replace(/\//g, '__').replace(/^@/, '')

    let found = false

    for (const candidate of names(name, pkg.version ?? null, hosts)) {
      if (remaining.delete(candidate)) found = true
    }

    if (found) dirs.push(new URL('./', url))
  }

  const [missing] = remaining

  if (missing) throw new Error(`Cannot find the package of addon '${missing}'`)

  return dirs
}

function names(name, version, hosts) {
  const result = []
  const generator = linked(name, version, { hosts })

  for (let next = generator.next(); next.done !== true; next = generator.next(false)) {
    if (next.value.resolution) result.push(next.value.resolution.href)
  }

  return result
}

function parse(source) {
  if (source === null) return null

  try {
    return JSON.parse(source.toString())
  } catch {
    return null
  }
}

// The layout must not depend on the hosts, as Swift packages only accept
// XCFrameworks. Resources linked outside of the directory are intermediate.
exports.link = async function* link(packages, dir, traversal, hooks) {
  for await (const resource of bareLink.packages(
    packages.map((url) => fileURLToPath(url)),
    {
      ...traversal,
      out: fileURLToPath(dir),
      alwaysMultiHost: true,
      ...hooks
    }
  )) {
    const url = pathToFileURL(resource)

    if (url.href.startsWith(dir.href)) yield url
  }
}
