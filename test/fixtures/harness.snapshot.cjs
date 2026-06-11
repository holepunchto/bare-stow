/* eslint-disable */

exports['harness react-native - should match snapshot - 0'] =
  `import { Worklet } from 'react-native-bare-kit'
import stow from 'bare-stow/host'
import bundle from "./core.bundle.mjs"

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = stow.wrap(worklet.IPC)

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness pear-runtime - should match snapshot - 0'] = `const path = require('path')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (pear) {
    const ipc = stow.wrap(pear.run(bundle))

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness node - should match snapshot - 0'] = `const path = require('path')
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    const ipc = stow.wrap(sidecar)

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness node with bare-rpc client - should match snapshot - 0'] =
  `const path = require('path')
const Sidecar = require('bare-sidecar')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (opts = {}) {
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

exports['harness react-native with bare-rpc client - should match snapshot - 0'] =
  `import { Worklet } from 'react-native-bare-kit'
import stow from 'bare-stow/host'
import bundle from "./core.bundle.mjs"

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = stow.wrap(worklet.IPC)

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(ipc, router)

    rpc.respond = router.respond.bind(router)

    await ipc.ready

    return { ipc, rpc }
  }
}
`

exports['harness pear-runtime with bare-rpc client - should match snapshot - 0'] =
  `const path = require('path')
const stow = require('bare-stow/host')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (pear) {
    const ipc = stow.wrap(pear.run(bundle))

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(ipc, router)

    rpc.respond = router.respond.bind(router)

    await ipc.ready

    return { ipc, rpc }
  }
}
`

/* eslint-enable */
