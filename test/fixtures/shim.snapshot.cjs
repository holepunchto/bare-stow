/* eslint-disable */

exports['shim react-native - should match snapshot - 0'] = `const entry = require("./entry.js")
const start = entry.default || entry

const ipc = Bare.IPC

start(ipc)
`

exports['shim pear-runtime - should match snapshot - 0'] = `const entry = require("./entry.js")
const start = entry.default || entry

const ipc = Bare.IPC

start(ipc)
`

exports['shim node - should match snapshot - 0'] = `const entry = require("./entry.js")
const start = entry.default || entry

const ipc = Bare.IPC

start(ipc)
`

exports['shim react-native with bare-rpc server - should match snapshot - 0'] = `const entry = require("./entry.js")
const start = entry.default || entry

const ipc = Bare.IPC

const RPC = require('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)

start({ rpc, ipc })
`

exports['shim node with bare-rpc server - should match snapshot - 0'] = `const entry = require("./entry.js")
const start = entry.default || entry

const ipc = Bare.IPC

const RPC = require('bare-rpc')

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)

start({ rpc, ipc })
`

/* eslint-enable */
