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

Handlers = Callable[[CommandRouter], None]


def attach(ipc: IPC, handlers: Handlers) -> RPC:
    router = CommandRouter()

    handlers(router)

    return RPC(ipc, handler=router)
`

exports['rpc bare-rpc client as kotlin - source - 0'] = `package com.example.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import to.holepunch.bare.rpc.CommandRouter
import to.holepunch.bare.rpc.Rpc
import to.holepunch.bare.rpc.Transport
import to.holepunch.bare.stow.host.Ipc

typealias Handlers = CommandRouter.() -> Unit

internal fun attach(ipc: Ipc, handlers: Handlers): Rpc {
  val router = CommandRouter().apply(handlers)

  return Rpc(
    Transport(ipc.data, ipc::write, ipc::close),
    CoroutineScope(Dispatchers.Default),
    router,
  )
}
`

exports['rpc bare-rpc client as swift - source - 0'] = `import BareRPC
import BareStowHost
import Foundation

public typealias Handlers = (CommandRouter) -> Void

extension BareStowHost.IPC: @retroactive BareRPC.Transport {}

func attach(_ ipc: IPC, _ handlers: Handlers?) -> RPC {
  let router = CommandRouter()

  handlers?(router)

  return RPC(ipc, handler: router)
}
`

/* eslint-enable */
