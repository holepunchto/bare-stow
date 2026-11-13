/* eslint-disable */

exports['shim - should match snapshot - 0'] = `const runtime = require('bare-stow-runtime/process')

const ipc = runtime.attach(Bare.IPC)

ipc.run(() => require("./entry.js"), ipc)
`

exports['shim with server - main - 0'] = `const runtime = require('bare-stow-runtime/process')
const server = require("./__server__.cjs")

const ipc = runtime.attach(Bare.IPC)

const rpc = server.attach(ipc)

ipc.run(() => require("./entry.js"), { rpc, ipc })
`

exports['shim with server - server - 0'] = `const AbortController = require('bare-abort-controller')
const RPC = require('bare-rpc')

exports.attach = function attach(ipc) {
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router, { AbortController })

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

/* eslint-enable */
