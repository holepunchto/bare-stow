const libraries = {
  'bare-rpc': require('./rpc/bare-rpc')
}

module.exports = function rpc(name) {
  const r = libraries[name]

  if (!r) throw new Error(`Unknown RPC library '${name}'`)

  return r
}
