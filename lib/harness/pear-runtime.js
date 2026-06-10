const rpc = require('../rpc')

exports.linked = false
exports.offload = true
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.hosts = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64'
]

exports.generate = function generate(opts) {
  const { bundleSpecifier, client: clientName } = opts

  const setup = clientName ? rpc(clientName).generate({ ipc: 'ipc' }) : null

  const returned = setup ? '{ rpc, ipc }' : '{ ipc }'

  return `\
const path = require('path')

const bundle = path.join(__dirname, ${JSON.stringify(bundleSpecifier)})

module.exports = {
  async start (pear) {
    const ipc = pear.run(bundle)
${setup ? '\n' + indent(setup, 4) : ''}
    return ${returned}
  }
}
`
}

function indent(source, spaces) {
  const pad = ' '.repeat(spaces)
  return source
    .split('\n')
    .map((line) => (line.length === 0 ? line : pad + line))
    .join('\n')
}
