const registry = {
  'react-native': () => require('./harness/react-native'),
  'pear-runtime': () => require('./harness/pear-runtime'),
  node: () => require('./harness/node')
}

module.exports = function harness(target, resolve) {
  if (typeof target !== 'string') return validate(target)

  if (resolve) return validate(resolve(target))

  const load = registry[target]

  if (!load) throw new Error(`Unknown target '${target}'`)

  return load()
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
