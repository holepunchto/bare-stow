exports.name = 'bare-sidecar'
exports.linked = false
exports.offload = true
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.module = 'cjs'
exports.hosts = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64'
]

exports.generate = function generate(opts) {
  const { bundleSpecifier, ipc, rpc, client = null } = opts

  const returned = client ? `{ ${ipc}, ${rpc} }` : `{ ${ipc} }`

  const handle = client
    ? `{ ${ipc}: import('bare-stow/host').IPC; ${rpc}: ${client.type} }`
    : `{ ${ipc}: import('bare-stow/host').IPC }`

  return [
    {
      source: `\
const path = require('path')
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, ${JSON.stringify(bundleSpecifier)})

module.exports = {
  async start(opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    const ${ipc} = stow.wrap(sidecar)
${client ? '\n' + indent(client.source, 4) : ''}
    await ${ipc}.ready

    return ${returned}
  }
}
`
    },
    {
      extension: '.d.ts',
      source: `\
export function start(opts?: import('bare-sidecar').SidecarOptions): Promise<${handle}>
`
    }
  ]
}

function indent(source, spaces) {
  const pad = ' '.repeat(spaces)
  return source
    .split('\n')
    .map((line) => (line.length === 0 ? line : pad + line))
    .join('\n')
}
