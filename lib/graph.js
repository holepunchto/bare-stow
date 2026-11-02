const { fileURLToPath, pathToFileURL } = require('url')
const bareLink = require('bare-link')
const strip = require('bare-type-stripper')
const { resolve } = require('bare-module-traverse')
const fs = require('./fs')
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
      '.cts': '.cjs'
    },
    hosts
  }
}

exports.readModule = function readModule(modules) {
  return async function (url) {
    if (modules.has(url.href)) return modules.get(url.href)

    const source = await fs.readModule(url)

    if (source === null) return null

    if (/\.(c|m)?ts$/.test(url.pathname)) return strip(source)

    return source
  }
}

// The layout must not depend on the hosts, as Swift packages only accept
// XCFrameworks. Resources linked outside of the directory are intermediate.
exports.link = async function* link(entries, dir, traversal, readModule) {
  for await (const resource of bareLink(
    entries.map((url) => fileURLToPath(url)),
    {
      ...traversal,
      out: fileURLToPath(dir),
      alwaysMultiHost: true,
      readModule,
      listPrefix: fs.listPrefix,
      resolveModule: fs.resolveModule
    }
  )) {
    const url = pathToFileURL(resource)

    if (url.href.startsWith(dir.href)) yield url
  }
}
