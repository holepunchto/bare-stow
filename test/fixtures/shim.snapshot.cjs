/* eslint-disable */

exports['shim react-native - should match snapshot - 0'] =
  `import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)

let stop = null
let readied = false
let exited = false

function ready() {
  if (readied) return
  readied = true

  ipc.send('ready')
}

async function shutdown(code, err = null) {
  if (exited) return
  exited = true

  try {
    if (stop) await stop()
  } catch (e) {
    err = err || e
  }

  if (err) ipc.send('error', { message: err.message, stack: err.stack })

  await ipc.send('exit', { code })

  Bare.exit(code)
}

ipc.on('terminate', () => shutdown(0))

Bare
  .on('beforeExit', (exitCode) => shutdown(exitCode))
  .on('uncaughtException', (err) => shutdown(1, err))
  .on('unhandledRejection', (err) => shutdown(1, err))

try {
  const entry = await import("./entry.js")
  const start = entry.default || entry

  stop = await start(ipc, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`

exports['shim pear-runtime - should match snapshot - 0'] =
  `import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)

let stop = null
let readied = false
let exited = false

function ready() {
  if (readied) return
  readied = true

  ipc.send('ready')
}

async function shutdown(code, err = null) {
  if (exited) return
  exited = true

  try {
    if (stop) await stop()
  } catch (e) {
    err = err || e
  }

  if (err) ipc.send('error', { message: err.message, stack: err.stack })

  await ipc.send('exit', { code })

  Bare.exit(code)
}

ipc.on('terminate', () => shutdown(0))

Bare
  .on('beforeExit', (exitCode) => shutdown(exitCode))
  .on('uncaughtException', (err) => shutdown(1, err))
  .on('unhandledRejection', (err) => shutdown(1, err))

try {
  const entry = await import("./entry.js")
  const start = entry.default || entry

  stop = await start(ipc, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`

exports['shim bare-sidecar - should match snapshot - 0'] =
  `import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)

let stop = null
let readied = false
let exited = false

function ready() {
  if (readied) return
  readied = true

  ipc.send('ready')
}

async function shutdown(code, err = null) {
  if (exited) return
  exited = true

  try {
    if (stop) await stop()
  } catch (e) {
    err = err || e
  }

  if (err) ipc.send('error', { message: err.message, stack: err.stack })

  await ipc.send('exit', { code })

  Bare.exit(code)
}

ipc.on('terminate', () => shutdown(0))

Bare
  .on('beforeExit', (exitCode) => shutdown(exitCode))
  .on('uncaughtException', (err) => shutdown(1, err))
  .on('unhandledRejection', (err) => shutdown(1, err))

try {
  const entry = await import("./entry.js")
  const start = entry.default || entry

  stop = await start(ipc, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`

exports['shim react-native with bare-rpc server - should match snapshot - 0'] =
  `import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)

import RPC from 'bare-rpc'

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)

let stop = null
let readied = false
let exited = false

function ready() {
  if (readied) return
  readied = true

  ipc.send('ready')
}

async function shutdown(code, err = null) {
  if (exited) return
  exited = true

  try {
    if (stop) await stop()
  } catch (e) {
    err = err || e
  }

  if (err) ipc.send('error', { message: err.message, stack: err.stack })

  await ipc.send('exit', { code })

  Bare.exit(code)
}

ipc.on('terminate', () => shutdown(0))

Bare
  .on('beforeExit', (exitCode) => shutdown(exitCode))
  .on('uncaughtException', (err) => shutdown(1, err))
  .on('unhandledRejection', (err) => shutdown(1, err))

try {
  const entry = await import("./entry.js")
  const start = entry.default || entry

  stop = await start({ rpc, ipc }, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`

exports['shim bare-sidecar with bare-rpc server - should match snapshot - 0'] =
  `import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)

import RPC from 'bare-rpc'

const router = new RPC.CommandRouter()
const rpc = new RPC(ipc, router)

rpc.respond = router.respond.bind(router)

let stop = null
let readied = false
let exited = false

function ready() {
  if (readied) return
  readied = true

  ipc.send('ready')
}

async function shutdown(code, err = null) {
  if (exited) return
  exited = true

  try {
    if (stop) await stop()
  } catch (e) {
    err = err || e
  }

  if (err) ipc.send('error', { message: err.message, stack: err.stack })

  await ipc.send('exit', { code })

  Bare.exit(code)
}

ipc.on('terminate', () => shutdown(0))

Bare
  .on('beforeExit', (exitCode) => shutdown(exitCode))
  .on('uncaughtException', (err) => shutdown(1, err))
  .on('unhandledRejection', (err) => shutdown(1, err))

try {
  const entry = await import("./entry.js")
  const start = entry.default || entry

  stop = await start({ rpc, ipc }, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`

/* eslint-enable */
