const runtime = require('bare-stow-runtime/process')

const ipc = runtime.attach(Bare.IPC)

ipc.run(() => require('./core.js'), ipc)
