const path = require('path')
const { fileURLToPath } = require('url')
const rpc = require('./rpc')

module.exports = exports = function shim(entry, shimURL, opts = {}) {
  const { server } = opts

  const specifier = relativeSpecifier(shimURL, entry)
  const setup = server ? rpc(server).generate({ ipc: 'ipc' }) : null
  const arg = setup ? '{ rpc, ipc }' : 'ipc'

  return `\
const entry = require(${JSON.stringify(specifier)})
const start = entry.default || entry

const ipc = Bare.IPC
${setup ? '\n' + setup : ''}
start(${arg})
`
}

exports.url = function url(base) {
  return new URL('__main__.js', base)
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
