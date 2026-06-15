const path = require('path')
const { fileURLToPath } = require('url')

module.exports = exports = function shim(entry, shimURL, opts = {}) {
  // `server` is a pre-rendered RPC server setup fragment (binding `rpc`), or
  // null. The bundler resolves the RPC library and renders it; the shim only
  // decides where the fragment goes.
  const { server = null } = opts

  const specifier = relativeSpecifier(shimURL, entry)

  const setup = server

  const arg = setup ? '{ rpc, ipc }' : 'ipc'

  return `\
import protocol from 'bare-stow/protocol'

const ipc = protocol.attach(Bare.IPC)
${setup ? '\n' + setup : ''}
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
  const entry = await import(${JSON.stringify(specifier)})
  const start = entry.default

  stop = await start(${arg}, ready) || null

  ready()
} catch (err) {
  shutdown(1, err)
}
`
}

exports.url = function url(base) {
  return new URL('__main__.mjs', base)
}

function relativeSpecifier(from, to) {
  if (from.protocol === 'file:' && to.protocol === 'file:') {
    const fromPath = path.dirname(fileURLToPath(from))
    const toPath = fileURLToPath(to)

    let relative = path.relative(fromPath, toPath).split(path.sep).join('/')

    if (!relative.startsWith('.')) relative = './' + relative

    return relative
  }

  return to.href
}
