/* eslint-disable */

exports['shim - should match snapshot - 0'] = `import runtime from 'bare-stow/runtime'

const ipc = runtime.attach(Bare.IPC)

ipc.run(() => import("./entry.js"), ipc)
`

exports['shim with bare-rpc server - should match snapshot - 0'] =
  `import runtime from 'bare-stow/runtime'

const ipc = runtime.attach(Bare.IPC)

const { default: RPC } = await import('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)

ipc.run(() => import("./entry.js"), { rpc, ipc })
`

/* eslint-enable */
