/* eslint-disable */

exports['harness bare-sidecar - harness - 0'] = `const path = require('path')
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start(opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    const ipc = stow.wrap(sidecar)

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness bare-sidecar - types - 0'] =
  `export function start(opts?: import('bare-sidecar').SidecarOptions): Promise<{ ipc: import('bare-stow/host').IPC }>
`

exports['harness bare-sidecar with bare-rpc client - harness - 0'] = `const path = require('path')
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start(opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    const ipc = stow.wrap(sidecar)

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(ipc, router)

    rpc.respond = router.respond.bind(router)

    await ipc.ready

    return { ipc, rpc }
  }
}
`

exports['harness bare-sidecar with bare-rpc client - types - 0'] =
  `export function start(opts?: import('bare-sidecar').SidecarOptions): Promise<{ ipc: import('bare-stow/host').IPC; rpc: import('bare-rpc') }>
`

exports['harness bare-sidecar as esm - harness - 0'] = `import Sidecar from 'bare-sidecar'
import stow from 'bare-stow/host'
import { fileURLToPath } from 'url'

const bundle = fileURLToPath(new URL("./core.bundle", import.meta.url))

export async function start(opts = {}) {
  const sidecar = new Sidecar(bundle, opts)

  const ipc = stow.wrap(sidecar)

  await ipc.ready

  return { ipc }
}
`

exports['harness bare-sidecar as esm - types - 0'] =
  `export function start(opts?: import('bare-sidecar').SidecarOptions): Promise<{ ipc: import('bare-stow/host').IPC }>
`

exports['harness bare-sidecar as esm with bare-rpc client - harness - 0'] =
  `import Sidecar from 'bare-sidecar'
import stow from 'bare-stow/host'
import { fileURLToPath } from 'url'

const bundle = fileURLToPath(new URL("./core.bundle", import.meta.url))

export async function start(opts = {}) {
  const sidecar = new Sidecar(bundle, opts)

  const ipc = stow.wrap(sidecar)

  const { default: RPC } = await import('bare-rpc')

  const router = new RPC.CommandRouter()
  const rpc = new RPC(ipc, router)

  rpc.respond = router.respond.bind(router)

  await ipc.ready

  return { ipc, rpc }
}
`

exports['harness bare-sidecar as esm with bare-rpc client - types - 0'] =
  `export function start(opts?: import('bare-sidecar').SidecarOptions): Promise<{ ipc: import('bare-stow/host').IPC; rpc: import('bare-rpc') }>
`

/* eslint-enable */
