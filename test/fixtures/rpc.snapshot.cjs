/* eslint-disable */

exports['rpc bare-rpc client - should match snapshot - 0'] = `const RPC = require('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)
`

exports['rpc bare-rpc server - should match snapshot - 0'] = `import RPC from 'bare-rpc'

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)
`

/* eslint-enable */
