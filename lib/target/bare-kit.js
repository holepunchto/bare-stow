const swift = require('./swift')

exports.name = 'bare-kit'
exports.isolation = 'thread'
exports.linked = true
exports.linking = ({ targetOptions }) => targetOptions.linking
exports.offload = false
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.hosts = ({ language }) => hosts[language]

// Applications with several bundles link their addons once with `link()`.
exports.options = function options(given = {}) {
  const { linking = 'package', ...unknown } = given

  for (const option of Object.keys(unknown)) {
    throw new Error(`Unknown option '${option}' for target 'bare-kit'`)
  }

  if (linking !== 'package' && linking !== 'app') {
    throw new Error(`Option 'linking' must be 'package' or 'app', got '${linking}'`)
  }

  return { linking }
}

const bareKitSwift = {
  url: 'https://github.com/holepunchto/bare-kit-swift',
  from: '2.0.0',
  products: ['BareKit']
}

const bareKitKotlin = {
  'com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin': 'v0.1.1'
}

const hosts = {
  kotlin: ['android-arm64', 'android-arm', 'android-x64', 'android-ia32'],
  swift: ['darwin-arm64', 'darwin-x64', 'ios-arm64', 'ios-arm64-simulator', 'ios-x64-simulator']
}

exports.languages = {
  kotlin: {
    generate: kotlin,
    link() {
      return { source: null, dependencies: bareKitKotlin }
    }
  },
  swift: {
    // Re-exports Bare Kit, so that code linking the module can run worklets.
    link() {
      return {
        source: '@_exported import BareKit\n',
        dependencies: { 'bare-kit-swift': bareKitSwift }
      }
    },
    generate(context) {
      const start = context.resources
        ? `try worklet.start(${JSON.stringify(context.resources + '.bundle')}, source: Data(contentsOf: bundle))`
        : 'try worklet.start(bundle)'

      return swift(context, {
        module: 'BareKit',
        conformance: 'extension BareKit.IPC: @retroactive Transport {}',
        fields: { worklet: 'Worklet' },
        params: ['options: Worklet.Options = Worklet.Options()'],
        setup: `\
let worklet = try Worklet(options: options)

let transport = try BareKit.IPC(worklet: worklet)

${start}

let ipc = BareStowHost.IPC(
  transport, kill: { worklet.terminate() }, timeout: timeout, grace: grace)

Task { ipc.exited(code: await worklet.wait()) }`,
        dependencies: { 'bare-kit-swift': bareKitSwift }
      })
    }
  }
}

function kotlin({ bundle, client, resources, options }) {
  const start = resources
    ? `worklet.start(${JSON.stringify(resources + '.bundle')}, context.assets.open(${JSON.stringify(bundle)}).use { it.readBytes() })`
    : `worklet.start(${JSON.stringify(bundle)})`

  const source = `\
package ${options.package}

import android.content.Context
import kotlin.time.Duration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import to.holepunch.bare.kit.Ipc as WorkletIpc
import to.holepunch.bare.kit.Worklet
import to.holepunch.bare.stow.host.Ipc

class Started(val worklet: Worklet, val ipc: Ipc${client ? ', val rpc: Client' : ''})

suspend fun start(
  context: Context,
  options: Worklet.Options = Worklet.Options(),
  timeout: Duration? = null,
  grace: Duration = Ipc.DEFAULT_GRACE,${client ? '\n  handlers: Handlers = {},' : ''}
): Started {
  val worklet = Worklet(context, options)

  val transport = WorkletIpc(worklet)

  ${start}

  val ipc =
    Ipc(
      transport.data,
      transport::write,
      kill = { worklet.terminate() },
      timeout = timeout,
      grace = grace,
    )

  CoroutineScope(Dispatchers.Default).launch {
    ipc.exited(worklet.wait())

    transport.close()
  }
${client ? '\n  val rpc = attach(ipc, handlers)\n' : ''}
  ipc.ready()

  return Started(worklet, ipc${client ? ', rpc' : ''})
}
`

  return {
    source,
    dependencies: {
      ...bareKitKotlin,
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.1.1'
    }
  }
}
