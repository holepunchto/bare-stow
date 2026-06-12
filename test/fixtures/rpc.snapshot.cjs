/* eslint-disable */

exports['rpc bare-rpc client - setup - 0'] = `const RPC = require('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)
`

exports['rpc bare-rpc client - types - 0'] = "import('bare-rpc')"

exports['rpc bare-rpc server - setup - 0'] = `const { default: RPC } = await import('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)
`

exports['rpc bare-rpc server - types - 0'] = "import('bare-rpc')"

/* eslint-enable */
