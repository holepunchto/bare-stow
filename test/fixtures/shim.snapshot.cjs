/* eslint-disable */

exports['shim - should match snapshot - 0'] = `import runtime from 'bare-stow-runtime/process'

const ipc = runtime.attach(Bare.IPC)

ipc.run(() => import("./entry.js"), ipc)
`

exports['shim with server - main - 0'] = `import runtime from 'bare-stow-runtime/process'
import * as server from "./__server__.mjs"

const ipc = runtime.attach(Bare.IPC)

const rpc = server.attach(ipc)

ipc.run(() => import("./entry.js"), { rpc, ipc })
`

exports['shim with server - server - 0'] = `import RPC from 'bare-rpc'

export function attach(ipc) {
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

/* eslint-enable */
