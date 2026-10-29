exports.name = 'bare-rpc'

exports.languages = {
  javascript: { generate: javascript },
  kotlin: { generate: kotlin },
  python: { generate: python },
  swift: { generate: swift }
}

function kotlin({ options }) {
  const source = `\
package ${options.package}

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import to.holepunch.bare.rpc.CommandRouter
import to.holepunch.bare.rpc.Rpc
import to.holepunch.bare.stow.host.Ipc

typealias Client = Rpc

typealias Handlers = CommandRouter.() -> Unit

internal fun attach(ipc: Ipc, handlers: Handlers): Client {
  val router = CommandRouter().apply(handlers)

  return Rpc(
    ipc.data,
    ipc::write,
    CoroutineScope(Dispatchers.Default),
    onEvent = router::dispatch,
    onRequest = router::dispatch,
  )
}
`

  return {
    source,
    dependencies: {
      'com.github.holepunchto.bare-rpc-kotlin:bare-rpc-kotlin': 'v0.4.0',
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.1.1'
    }
  }
}

function swift() {
  const source = `\
import BareRPC
import BareStowHost
import Foundation

public final class Client: @unchecked Sendable {
  public let rpc: RPC

  private let delegate: Delegate

  fileprivate init(rpc: RPC, delegate: Delegate) {
    self.rpc = rpc
    self.delegate = delegate
  }

  public func request(_ command: UInt, data: Data? = nil) async throws -> Data? {
    try await rpc.request(command, data: data)
  }

  public func event(_ command: UInt, data: Data? = nil) async {
    await rpc.event(command, data: data)
  }
}

public typealias Handlers = (CommandRouter) -> Void

func attach(_ ipc: IPC, _ handlers: Handlers?) -> Client {
  let router = CommandRouter()

  handlers?(router)

  let delegate = Delegate(router: router)
  let rpc = RPC(delegate: delegate)

  Task {
    for await frame in delegate.frames {
      try? await ipc.write(frame)
    }
  }

  Task {
    do {
      for try await data in ipc {
        await rpc.receive(data)
      }
    } catch {}

    delegate.finish()
  }

  return Client(rpc: rpc, delegate: delegate)
}

private final class Delegate: RPCDelegate, @unchecked Sendable {
  let router: CommandRouter
  let frames: AsyncStream<Data>

  private let continuation: AsyncStream<Data>.Continuation

  init(router: CommandRouter) {
    self.router = router
    (frames, continuation) = AsyncStream.makeStream()
  }

  func rpc(_ rpc: RPC, send data: Data) {
    continuation.yield(data)
  }

  func rpc(_ rpc: RPC, didReceiveRequest request: IncomingRequest) async throws {
    await router.dispatch(request)
  }

  func rpc(_ rpc: RPC, didReceiveEvent event: IncomingEvent) async {
    await router.dispatch(event)
  }

  func finish() {
    continuation.finish()
  }
}
`

  return {
    source,
    dependencies: {
      'bare-rpc-swift': {
        url: 'https://github.com/holepunchto/bare-rpc-swift',
        from: '1.1.0',
        products: ['BareRPC']
      },
      'bare-stow-host-swift': {
        url: 'https://github.com/holepunchto/bare-stow-host-swift',
        from: '0.1.0',
        products: ['BareStowHost']
      }
    }
  }
}

function python() {
  const source = `\
from collections.abc import Callable

from bare_rpc import RPC, CommandRouter
from bare_stow_host import IPC

Client = RPC

Handlers = Callable[[CommandRouter], None]


def attach(ipc: IPC, handlers: Handlers) -> Client:
    router = CommandRouter()

    handlers(router)

    return RPC(
        ipc,
        on_request=router.dispatch_request,
        on_event=router.dispatch_event,
    )
`

  return {
    source,
    dependencies: {
      'bare-rpc': '~=0.1.0',
      'bare-stow-host': '~=0.1.0'
    }
  }
}

function javascript({ role, options }) {
  const esm = options.module === 'esm'

  // The bundle registers its handlers in `start()`, before it signals ready.
  const server = role === 'server'

  const params = server ? 'ipc' : 'ipc, handlers'

  const body = server
    ? `\
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`
    : `\
  const router = new RPC.CommandRouter()

  handlers(router)

  return new RPC(ipc, router)
}
`

  const source = esm
    ? `\
import RPC from 'bare-rpc'

export function attach(${params}) {
${body}`
    : `\
const RPC = require('bare-rpc')

exports.attach = function attach(${params}) {
${body}`

  const types = server
    ? `\
export function attach(ipc: import('bare-stow-host').IPC): import('bare-rpc')
`
    : `\
export type Handlers = (router: import('bare-rpc').CommandRouter) => void

export function attach(ipc: import('bare-stow-host').IPC, handlers: Handlers): import('bare-rpc')
`

  return { source, types, dependencies: { 'bare-rpc': '^1.3.9' } }
}
