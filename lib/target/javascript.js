module.exports = function harness(context, target) {
  const { bundle, client, options } = context
  const { name, version, binding, url = false, setup, types } = target

  const esm = options.module === 'esm'

  const body = `\
${setup}
${client ? '\nconst rpc = client.attach(ipc)\n' : ''}
await ipc.ready

return ${client ? '{ ipc, rpc }' : '{ ipc }'}`

  const source = esm
    ? `\
import ${binding} from '${name}'
import stow from 'bare-stow-host'
${client ? `import * as client from ${JSON.stringify(client)}\n` : ''}
const bundle = ${url ? `new URL(import.meta.resolve(${JSON.stringify(bundle)}))` : `import.meta.resolve(${JSON.stringify(bundle)})`}

export async function start({ timeout, grace, ...opts } = {}) {
${indent(body, 2)}
}
`
    : `\
const ${binding} = require('${name}')
const stow = require('bare-stow-host')
${client ? `const client = require(${JSON.stringify(client)})\n` : ''}
const bundle = require.resolve(${JSON.stringify(bundle)})

module.exports = {
  async start({ timeout, grace, ...opts } = {}) {
${indent(body, 4)}
  }
}
`

  const handle = client
    ? `{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import(${JSON.stringify(client)}).attach> }`
    : `{ ipc: import('bare-stow-host').IPC }`

  return {
    source,
    dependencies: {
      [name]: version,
      'bare-stow-host': '^0.1.0'
    },
    types: `\
export function start(
  opts?: ${types} & Omit<import('bare-stow-host').IPCOptions, 'kill'>
): Promise<${handle}>
`
  }
}

function indent(source, spaces) {
  const pad = ' '.repeat(spaces)

  return source
    .split('\n')
    .map((line) => (line.length === 0 ? line : pad + line))
    .join('\n')
}
