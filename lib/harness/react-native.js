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

  const returned = setup ? '{ rpc, ipc, worklet }' : '{ ipc, worklet }'

  return `\
import { Worklet } from 'react-native-bare-kit'
import bundle from ${JSON.stringify(bundleSpecifier)}

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = worklet.IPC
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
