exports.name = 'bare-worker'
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
import Worker from 'bare-worker'
import stow from 'bare-stow/host'
import { fileURLToPath } from 'bare-url'

const bundle = fileURLToPath(new URL(${JSON.stringify(bundleSpecifier)}, import.meta.url))

export async function start(opts = {}) {
  const worker = new Worker(bundle, opts)

  const ${ipc} = stow.wrap(worker.IPC)
${client ? '\n' + indent(client.source, 2) : ''}
  await ${ipc}.ready

  return ${returned}
}
`
    : `\
const path = require('bare-path')
const Worker = require('bare-worker')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, ${JSON.stringify(bundleSpecifier)})

module.exports = {
  async start(opts = {}) {
    const worker = new Worker(bundle, opts)

    const ${ipc} = stow.wrap(worker.IPC)
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
export function start(opts?: import('bare-worker').WorkerOptions): Promise<${handle}>
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
