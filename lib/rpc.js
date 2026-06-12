const registry = {
  'bare-rpc': () => require('./rpc/bare-rpc')
}

module.exports = function rpc(name, resolve) {
  if (typeof name !== 'string') return validate(name)

  if (resolve) return validate(resolve(name))

  const load = registry[name]

  if (!load) throw new Error(`Unknown RPC library '${name}'`)

  return load()
}

function validate(rpc) {
  if (!rpc || typeof rpc.generate !== 'function') {
    throw new Error('RPC library must provide a generate() function')
  }

  return rpc
}
