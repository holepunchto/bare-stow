exports.generate = function generate(opts) {
  const { ipc, esm = false } = opts

  return `\
${esm ? "import RPC from 'bare-rpc'" : "const RPC = require('bare-rpc')"}

const router = new RPC.CommandRouter()
const rpc = new RPC(${ipc}, router)

rpc.respond = router.respond.bind(router)
`
}
