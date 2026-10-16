const path = require('path')
const { fileURLToPath } = require('url')

module.exports = exports = function shim(entry, shimURL, opts = {}) {
  // `server` is a pre-rendered RPC server setup fragment (binding `rpc`), or
  // null. The bundler resolves the RPC library and renders it; the shim only
  // decides where the fragment goes.
  const { server = null } = opts

  const specifier = relativeSpecifier(shimURL, entry)

  const arg = server ? '{ rpc, ipc }' : 'ipc'

  return `\
import runtime from 'bare-stow/runtime'

const ipc = runtime.attach(Bare.IPC)
${server ? '\n' + server : ''}
ipc.run(() => import(${JSON.stringify(specifier)}), ${arg})
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
