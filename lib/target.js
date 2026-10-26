const { registry, validateLanguages } = require('./provider')

const providers = {
  'bare-kit': () => require('./target/bare-kit'),
  'bare-sidecar': () => require('./target/bare-sidecar'),
  'bare-worker': () => require('./target/bare-worker')
}

const properties = ['isolation', 'linked', 'offload', 'format', 'encoding', 'extension', 'hosts']

module.exports = registry('target', providers, function validate(target) {
  validateLanguages('Target', target?.languages)

  return target
})

// A property may instead be a function of the language of the harness and the
// options it resolved, such as hosts that differ between languages.
module.exports.resolve = function resolve(target, context) {
  const resolved = { ...target }

  for (const property of properties) {
    if (typeof target[property] === 'function') resolved[property] = target[property](context)
  }

  if (resolved.isolation !== 'process' && resolved.isolation !== 'thread') {
    throw new Error("Target must provide an isolation of 'process' or 'thread'")
  }

  if (!Array.isArray(resolved.hosts)) {
    throw new Error('Target must provide a hosts array')
  }

  return resolved
}
