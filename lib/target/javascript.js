module.exports = function harness(context, target) {
  const { bundle, client, options } = context
  const { name, version, binding, url = false, handle, spawn, connect, types } = target

  const esm = options.module === 'esm'

  const params = `{ timeout, grace${client ? ', handlers = () => {}' : ''} } = {}`

  const start = `\
const ${handle} = ${spawn}

return await connect(${handle}, { timeout, grace${client ? ', handlers' : ''} })`

  const body = `\
${connect}
${client ? '\nconst rpc = client.attach(ipc, handlers)\n' : ''}
await ipc.ready

return ${client ? '{ ipc, rpc }' : '{ ipc }'}`

  const source = esm
    ? `\
import ${binding} from '${name}'
import stow from 'bare-stow-host'
${client ? `import * as client from ${JSON.stringify(client)}\n` : ''}
const bundle = ${url ? `new URL(import.meta.resolve(${JSON.stringify(bundle)}))` : `import.meta.resolve(${JSON.stringify(bundle)})`}

export async function start({ timeout, grace, ${client ? 'handlers, ' : ''}...opts } = {}) {
${indent(start, 2)}
}

export async function connect(${handle}, ${params}) {
${indent(body, 2)}
}
`
    : `\
const ${binding} = require('${name}')
const stow = require('bare-stow-host')
${client ? `const client = require(${JSON.stringify(client)})\n` : ''}
const bundle = require.resolve(${JSON.stringify(bundle)})

module.exports = { start, connect }

async function start({ timeout, grace, ${client ? 'handlers, ' : ''}...opts } = {}) {
${indent(start, 2)}
}

async function connect(${handle}, ${params}) {
${indent(body, 2)}
}
`

  const started = client
    ? `{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import(${JSON.stringify(client)}).attach> }`
    : `{ ipc: import('bare-stow-host').IPC }`

  return {
    source,
    dependencies: {
      [name]: version,
      'bare-stow-host': '^0.2.0'
    },
    types: `\
type ConnectOptions = Omit<import('bare-stow-host').IPCOptions, 'kill'>${client ? ` & { handlers?: import(${JSON.stringify(client)}).Handlers }` : ''}

export function start(opts?: ${types} & ConnectOptions): Promise<${started}>

export function connect(${handle}: import('${name}'), opts?: ConnectOptions): Promise<${started}>
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
