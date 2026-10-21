exports.name = 'bare-sidecar'
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
  const { bundleSpecifier, ipc, rpc, module = 'cjs', client = null } = opts

  const esm = module === 'esm'

  const returned = client ? `{ ${ipc}, ${rpc} }` : `{ ${ipc} }`

  const handle = client
    ? `{ ${ipc}: import('bare-stow/host').IPC; ${rpc}: ${client.type} }`
    : `{ ${ipc}: import('bare-stow/host').IPC }`

  const source = esm
    ? `\
import Sidecar from 'bare-sidecar'
import stow from 'bare-stow/host'

const bundle = new URL(import.meta.resolve(${JSON.stringify(bundleSpecifier)}))

export async function start({ timeout, grace, ...opts } = {}) {
  const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

  const ${ipc} = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

  sidecar.on('exit', (code, signal) => ${ipc}.exited(code, signal))
${client ? '\n' + indent(client.source, 2) : ''}
  await ${ipc}.ready

  return ${returned}
}
`
    : `\
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = require.resolve(${JSON.stringify(bundleSpecifier)})

module.exports = {
  async start({ timeout, grace, ...opts } = {}) {
    const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

    const ${ipc} = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

    sidecar.on('exit', (code, signal) => ${ipc}.exited(code, signal))
${client ? '\n' + indent(client.source, 4) : ''}
    await ${ipc}.ready

    return ${returned}
  }
}
`

  return [
    { source },
    {
      extension: '.d.ts',
      source: `\
export function start(
  opts?: import('bare-sidecar').SidecarOptions & Omit<import('bare-stow/host').IPCOptions, 'kill'>
): Promise<${handle}>
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
