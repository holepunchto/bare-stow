module.exports = function rpc(name) {
  switch (name) {
    case 'bare-rpc':
      return require('./rpc/bare-rpc')
    default:
      throw new Error(`Unknown RPC library '${name}'`)
  }
}
