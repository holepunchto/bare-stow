/* eslint-disable */

exports['harness react-native - should match snapshot - 0'] = `import { Worklet } from 'react-native-bare-kit'
import bundle from "./core.bundle.mjs"

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = worklet.IPC

    return { ipc, worklet }
  }
}
`

exports['harness pear-runtime - should match snapshot - 0'] = `const path = require('path')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (pear) {
    const ipc = pear.run(bundle)

    return { ipc }
  }
}
`

exports['harness node - should match snapshot - 0'] = `const path = require('path')
const Sidecar = require('bare-sidecar')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    return { ipc: sidecar, sidecar }
  }
}
`

exports['harness node with bare-rpc client - should match snapshot - 0'] = `const path = require('path')
const Sidecar = require('bare-sidecar')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (opts = {}) {
    const sidecar = new Sidecar(bundle, opts)

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(sidecar, router)

    rpc.respond = router.respond.bind(router)

    return { rpc, ipc: sidecar, sidecar }
  }
}
`

exports['harness react-native with bare-rpc client - should match snapshot - 0'] = `import { Worklet } from 'react-native-bare-kit'
import bundle from "./core.bundle.mjs"

export default {
  async start (opts = {}) {
    const worklet = new Worklet(opts)

    worklet.start('/core.bundle', bundle)

    const ipc = worklet.IPC

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(ipc, router)

    rpc.respond = router.respond.bind(router)

    return { rpc, ipc, worklet }
  }
}
`

exports['harness pear-runtime with bare-rpc client - should match snapshot - 0'] = `const path = require('path')

const bundle = path.join(__dirname, "./core.bundle")

module.exports = {
  async start (pear) {
    const ipc = pear.run(bundle)

    const RPC = require('bare-rpc')

    const router = new RPC.CommandRouter()
    const rpc = new RPC(ipc, router)

    rpc.respond = router.respond.bind(router)

    return { rpc, ipc }
  }
}
`

/* eslint-enable */
