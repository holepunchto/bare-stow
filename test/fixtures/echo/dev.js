const runtime = require('bare-stow-runtime/process')

const ipc = runtime.attach(Bare.IPC)

ipc.run(() => import('./core.js'), ipc)
