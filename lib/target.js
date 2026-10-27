const { registry, validateLanguages } = require('./provider')

const providers = {
  'bare-kit': () => require('./target/bare-kit'),
  'bare-sidecar': () => require('./target/bare-sidecar'),
  'bare-worker': () => require('./target/bare-worker')
}

const properties = [
  'isolation',
  'linked',
  'linking',
  'offload',
  'format',
  'encoding',
  'extension',
  'hosts'
]

module.exports = registry('target', providers, function validate(target) {
  validateLanguages('Target', target?.languages)

  return target
})

module.exports.options = function options(target, given = {}) {
  if (typeof target.options === 'function') return target.options(given)

  for (const option of Object.keys(given)) {
    throw new Error(`Unknown option '${option}' for target '${target.name}'`)
  }

  return {}
}

// A property may instead be a function of the language of the harness, the
// options it resolved, and the options of the target, such as hosts that differ
// between languages.
module.exports.resolve = function resolve(target, context) {
  const resolved = { linking: 'package', ...target }

  for (const property of properties) {
    if (typeof target[property] === 'function') resolved[property] = target[property](context)
  }

  if (resolved.isolation !== 'process' && resolved.isolation !== 'thread') {
    throw new Error("Target must provide an isolation of 'process' or 'thread'")
  }

  if (resolved.linking !== 'package' && resolved.linking !== 'app') {
    throw new Error("Target must provide a linking of 'package' or 'app'")
  }

  if (!Array.isArray(resolved.hosts)) {
    throw new Error('Target must provide a hosts array')
  }

  return resolved
}
