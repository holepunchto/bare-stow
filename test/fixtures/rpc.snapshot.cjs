/* eslint-disable */

exports['rpc bare-rpc client - source - 0'] = `const RPC = require('bare-rpc')

exports.attach = function attach(ipc) {
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

exports['rpc bare-rpc client - types - 0'] =
  `export function attach(ipc: import('bare-stow-host').IPC): import('bare-rpc')
`

exports['rpc bare-rpc client as esm - source - 0'] = `import RPC from 'bare-rpc'

export function attach(ipc) {
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

exports['rpc bare-rpc client as esm - types - 0'] =
  `export function attach(ipc: import('bare-stow-host').IPC): import('bare-rpc')
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

exports['rpc bare-rpc client as python - source - 0'] = `from bare_rpc import RPC, CommandRouter
from bare_stow_host import IPC

Client = RPC


def attach(ipc: IPC) -> Client:
    router = CommandRouter()
    rpc = RPC(
        ipc,
        on_request=router.dispatch_request,
        on_event=router.dispatch_event,
    )

    rpc.respond = router.on_request

    return rpc
`

exports['rpc bare-rpc client as kotlin - source - 0'] = `package com.example.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import to.holepunch.bare.stow.host.IPC
import to.holepunch.barerpc.BareRpc
import to.holepunch.barerpc.CommandRouter

class Client internal constructor(val rpc: BareRpc, val router: CommandRouter)

internal fun attach(ipc: IPC): Client {
  val scope = CoroutineScope(Dispatchers.Default)
  val router = CommandRouter()
  val rpc =
    BareRpc(
      send = ipc::write,
      onEvent = router::dispatch,
      onRequest = router::dispatch,
      scope = scope,
    )

  scope.launch {
    try {
      ipc.data.collect { rpc.receive(it) }
    } catch (error: Exception) {}

    rpc.close()
  }

  return Client(rpc, router)
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

  public func onRequest(_ command: UInt, _ handler: @escaping CommandRouter.RequestHandler) {
    delegate.router.on(request: command, handler)
  }

  public func onEvent(_ command: UInt, _ handler: @escaping CommandRouter.EventHandler) {
    delegate.router.on(event: command, handler)
  }
}

func attach(_ ipc: IPC) -> Client {
  let delegate = Delegate(router: CommandRouter())
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
