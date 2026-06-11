const rpc = require('../rpc')

exports.linked = true
exports.offload = false
exports.format = 'bundle.mjs'
exports.encoding = 'utf8'
exports.extension = '.bundle.mjs'
exports.hosts = [
  'ios-arm64',
  'ios-arm64-simulator',
  'ios-x64-simulator',
  'android-arm',
  'android-arm64',
  'android-ia32',
  'android-x64'
]

exports.generate = function generate(opts) {
  const { bundleSpecifier, client: clientName } = opts

  const setup = clientName ? rpc(clientName).generate({ ipc: 'ipc' }) : null

  const returned = setup ? '{ ipc, rpc }' : '{ ipc }'

  return `\
import { Worklet } from 'react-native-bare-kit'
import stow from 'bare-stow/host'
import bundle from ${JSON.stringify(bundleSpecifier)}

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = stow.wrap(worklet.IPC)
${setup ? '\n' + indent(setup, 4) : ''}
    await ipc.ready

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
