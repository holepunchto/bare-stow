const registry = {
  'bare-sidecar': () => require('./target/bare-sidecar'),
  'bare-worker': () => require('./target/bare-worker')
}

module.exports = function target(name, resolve) {
  if (typeof name !== 'string') return validate(name)

  const load = registry[name]

  if (load) return load()

  if (resolve) return validate(resolve(name))

  throw new Error(`Unknown target '${name}'`)
}

function validate(target) {
  if (!target || typeof target.generate !== 'function') {
    throw new Error('Target must provide a generate() function')
  }

  if (!Array.isArray(target.hosts)) {
    throw new Error('Target must provide a hosts array')
  }

  return target
}
