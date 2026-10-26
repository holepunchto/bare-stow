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

  return {
    source,
    dependencies: {
      'com.github.holepunchto.bare-rpc-kotlin:bare-rpc-kotlin': 'v0.3.0',
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.1.0'
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
import asyncio
from contextlib import suppress

from bare_rpc import RPC, CommandRouter
from bare_stow_host import IPC, WorkerError

Client = RPC

_pumping = set()


def attach(ipc: IPC) -> Client:
    router = CommandRouter()
    rpc = RPC(
        ipc.write,
        on_request=router.dispatch_request,
        on_event=router.dispatch_event,
    )

    rpc.respond = router.on_request

    pumping = asyncio.ensure_future(_pump(ipc, rpc))
    _pumping.add(pumping)
    pumping.add_done_callback(_pumping.discard)

    return rpc


async def _pump(ipc, rpc):
    with suppress(WorkerError):
        async for data in ipc:
            await rpc.receive(data)

    rpc.close()
`

  return {
    source,
    dependencies: {
      'bare-rpc': '>=0.1.0',
      'bare-stow-host': '>=0.1.0'
    }
  }
}

function javascript(opts) {
  const esm = opts.options.module === 'esm'

  const body = `\
  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  return rpc
}
`

  const source = esm
    ? `\
import RPC from 'bare-rpc'

export function attach(ipc) {
${body}`
    : `\
const RPC = require('bare-rpc')

exports.attach = function attach(ipc) {
${body}`

  const types = `\
export function attach(ipc: import('bare-stow-host').IPC): import('bare-rpc')
`

  return { source, types, dependencies: { 'bare-rpc': '^1.3.2' } }
}
