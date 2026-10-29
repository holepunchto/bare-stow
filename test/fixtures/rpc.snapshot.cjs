/* eslint-disable */

exports['rpc bare-rpc client - source - 0'] = `const RPC = require('bare-rpc')

exports.attach = function attach(ipc, handlers) {
  const router = new RPC.CommandRouter()

  handlers(router)

  return new RPC(ipc, router)
}
`

exports['rpc bare-rpc client - types - 0'] =
  `export type Handlers = (router: import('bare-rpc').CommandRouter) => void

export function attach(ipc: import('bare-stow-host').IPC, handlers: Handlers): import('bare-rpc')
`

exports['rpc bare-rpc client as esm - source - 0'] = `import RPC from 'bare-rpc'

export function attach(ipc, handlers) {
  const router = new RPC.CommandRouter()

  handlers(router)

  return new RPC(ipc, router)
}
`

exports['rpc bare-rpc client as esm - types - 0'] =
  `export type Handlers = (router: import('bare-rpc').CommandRouter) => void

export function attach(ipc: import('bare-stow-host').IPC, handlers: Handlers): import('bare-rpc')
`

exports['rpc bare-rpc server - source - 0'] = `import RPC from 'bare-rpc'

export function attach(ipc) {
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

exports['rpc bare-rpc server - types - 0'] =
  `export function attach(ipc: import('bare-stow-host').IPC): import('bare-rpc')
`

exports['rpc bare-rpc client as python - source - 0'] = `from collections.abc import Callable

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

exports['rpc bare-rpc client as kotlin - source - 0'] = `package com.example.core

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

exports['rpc bare-rpc client as swift - source - 0'] = `import BareRPC
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

/* eslint-enable */
