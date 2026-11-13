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

  return {
    source,
    dependencies: {
      'com.github.holepunchto.bare-rpc-kotlin:bare-rpc-kotlin': 'v0.6.+',
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.2.+'
    }
  }
}

function swift() {
  const source = `\
import BareRPC
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

  return {
    source,
    dependencies: {
      'bare-rpc-swift': {
        url: 'https://github.com/holepunchto/bare-rpc-swift',
        from: '3.0.0',
        products: ['BareRPC']
      },
      'bare-stow-host-swift': {
        url: 'https://github.com/holepunchto/bare-stow-host-swift',
        from: '0.2.1',
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

Handlers = Callable[[CommandRouter], None]


def attach(ipc: IPC, handlers: Handlers) -> RPC:
    router = CommandRouter()

    handlers(router)

    return RPC(ipc, handler=router)
`

  return {
    source,
    dependencies: {
      'bare-rpc': '~=0.3.0',
      'bare-stow-host': '~=0.2.1'
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
  const rpc = new RPC(ipc, router, { AbortController })

  rpc.respond = router.respond.bind(router)

  return rpc
}
`
    : `\
  const router = new RPC.CommandRouter()

  handlers(router)

  return new RPC(ipc, router, { AbortController })
}
`

  const source = esm
    ? `\
import AbortController from 'bare-abort-controller'
import RPC from 'bare-rpc'

export function attach(${params}) {
${body}`
    : `\
const AbortController = require('bare-abort-controller')
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

  return {
    source,
    types,
    dependencies: { 'bare-abort-controller': '^1.1.2', 'bare-rpc': '^2.0.0' }
  }
}
