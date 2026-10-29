// The harness qualifies `BareStowHost.IPC` as runtimes such as Bare Kit declare
// an `IPC` of their own.
module.exports = function harness(context, target) {
  const { bundle, client } = context
  const { module, conformance, fields = {}, params = [], setup, dependencies } = target

  const started = { ...fields, ipc: 'BareStowHost.IPC' }

  if (client) started.rpc = 'Client'

  const source = `\
import ${module}
import BareStowHost
import Foundation

${conformance}

public struct Started: Sendable {
${Object.entries(started)
  .map(([name, type]) => `  public let ${name}: ${type}`)
  .join('\n')}
}

public func start(
${[
  ...params,
  'timeout: TimeInterval? = nil',
  'grace: TimeInterval = BareStowHost.IPC.defaultGrace',
  ...(client ? ['handlers: Handlers? = nil'] : [])
]
  .map((param) => '  ' + param)
  .join(',\n')}
) async throws -> Started {
  let bundle = Bundle.module.url(forResource: ${JSON.stringify(bundle)}, withExtension: nil)!

${setup.replace(/^(?=.)/gm, '  ')}
${client ? '\n  let rpc = attach(ipc, handlers)\n' : ''}
  try await ipc.ready()

  return Started(${Object.keys(started)
    .map((name) => `${name}: ${name}`)
    .join(', ')})
}
`

  return {
    source,
    dependencies: {
      ...dependencies,
      'bare-stow-host-swift': {
        url: 'https://github.com/holepunchto/bare-stow-host-swift',
        from: '0.1.0',
        products: ['BareStowHost']
      }
    }
  }
}
