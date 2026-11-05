// The harness qualifies `BareStowHost.IPC` as runtimes such as Bare Kit declare
// an `IPC` of their own.
module.exports = function harness(context, target) {
  const { bundle, client } = context
  const {
    module,
    conformance,
    fields = {},
    params = [],
    handle,
    spawn,
    setup,
    dependencies
  } = target

  const started = { ...fields, ipc: 'BareStowHost.IPC' }

  if (client) started.rpc = 'RPC'

  const options = [
    'timeout: TimeInterval? = nil',
    'grace: TimeInterval = BareStowHost.IPC.defaultGrace',
    ...(client ? ['handlers: Handlers? = nil'] : [])
  ]

  const forwarded = ['timeout', 'grace', ...(client ? ['handlers'] : [])].map(
    (name) => `${name}: ${name}`
  )

  const body = `\
${setup}
${client ? '\nlet rpc = attach(ipc, handlers)\n' : ''}
try await ipc.ready()

return Started(${Object.keys(started)
    .map((name) => `${name}: ${name}`)
    .join(', ')})`

  const resource = `let bundle = Bundle.module.url(forResource: ${JSON.stringify(bundle)}, withExtension: nil)!`

  // Targets that spawn the bundle let hosts connect to one they spawned, such
  // as from another entry.
  const start = handle
    ? `\
${resource}

let ${handle.name} = ${spawn}

return try await connect(${[handle.name, ...forwarded].join(', ')})`
    : `${resource}\n\n${body}`

  const functions = [func('start', [...params, ...options], start)]

  if (handle) {
    functions.push(func('connect', [`_ ${handle.name}: ${handle.type}`, ...options], body))
  }

  const source = `\
import ${module}
${client ? 'import BareRPC\n' : ''}import BareStowHost
import Foundation

${conformance}

public struct Started: Sendable {
${Object.entries(started)
  .map(([name, type]) => `  public let ${name}: ${type}`)
  .join('\n')}
}

${functions.join('\n\n')}
`

  return {
    source,
    dependencies: {
      ...dependencies,
      'bare-stow-host-swift': {
        url: 'https://github.com/holepunchto/bare-stow-host-swift',
        from: '0.2.1',
        products: ['BareStowHost']
      }
    }
  }
}

function func(name, params, body) {
  return `\
public func ${name}(
${params.map((param) => '  ' + param).join(',\n')}
) async throws -> Started {
${indent(body)}
}`
}

function indent(source) {
  return source
    .split('\n')
    .map((line) => (line.length === 0 ? line : '  ' + line))
    .join('\n')
}
