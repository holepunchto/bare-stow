exports.generate = function generate(opts) {
  const { ipc } = opts

  return `\
const RPC = require('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(${ipc}, router)

rpc.respond = router.respond.bind(router)
`
}
