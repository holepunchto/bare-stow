const { registry, validateLanguages } = require('./provider')

const providers = {
  'bare-rpc': () => require('./rpc/bare-rpc')
}

module.exports = registry('RPC library', providers, function validate(rpc) {
  validateLanguages('RPC library', rpc?.languages)

  return rpc
})
