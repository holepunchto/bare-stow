const path = require('path')
const swift = require('./swift')

exports.name = 'bare-kit'
exports.isolation = 'thread'
exports.linked = true
exports.offload = false
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.hosts = ({ language }) => hosts[language]

const hosts = {
  kotlin: ['android-arm64', 'android-arm', 'android-x64', 'android-ia32'],
  swift: ['darwin-arm64', 'darwin-x64', 'ios-arm64', 'ios-arm64-simulator', 'ios-x64-simulator']
}

exports.languages = {
  kotlin: { generate: kotlin },
  swift: {
    generate(context) {
      return swift(context, {
        module: 'BareKit',
        conformance: 'extension BareKit.IPC: @retroactive Transport {}',
        fields: { worklet: 'Worklet' },
        params: ['options: Worklet.Options = Worklet.Options()'],
        setup: `\
let worklet = try Worklet(options: options)

let transport = try BareKit.IPC(worklet: worklet)

try worklet.start(bundle)

let ipc = BareStowHost.IPC(
  transport, kill: { worklet.terminate() }, timeout: timeout, grace: grace)

Task { ipc.exited(code: await worklet.wait()) }`,
        dependencies: {
          'bare-kit-swift': {
            url: 'https://github.com/holepunchto/bare-kit-swift',
            from: '2.0.0',
            products: ['BareKit']
          }
        }
      })
    }
  }
}

function kotlin({ bundle, client, options }) {
  const source = `\
package ${options.package}

import android.content.Context
import kotlin.time.Duration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import to.holepunch.bare.kit.IPC as WorkletIPC
import to.holepunch.bare.kit.Worklet
import to.holepunch.bare.stow.host.IPC
import to.holepunch.bare.stow.host.Transport

class Started(val worklet: Worklet, val ipc: IPC${client ? ', val rpc: Client' : ''})

suspend fun start(
  context: Context,
  options: Worklet.Options = Worklet.Options(),
  timeout: Duration? = null,
  grace: Duration = IPC.DEFAULT_GRACE,
): Started {
  val source = context.assets.open(${JSON.stringify(bundle)}).use { it.readBytes() }

  val worklet = Worklet(context, options)

  val transport = WorkletIPC(worklet)

  worklet.start(${JSON.stringify('/' + path.posix.basename(bundle))}, source)

  val ipc =
    IPC(
      object : Transport {
        override val data: Flow<ByteArray> = transport.data

        override suspend fun write(data: ByteArray) = transport.write(data)
      },
      kill = { worklet.terminate() },
      timeout = timeout,
      grace = grace,
    )

  CoroutineScope(Dispatchers.Default).launch {
    ipc.exited(worklet.wait())

    transport.close()
  }
${client ? '\n  val rpc = attach(ipc)\n' : ''}
  ipc.ready()

  return Started(worklet, ipc${client ? ', rpc' : ''})
}
`

  return {
    source,
    dependencies: {
      'com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin': 'v0.1.0',
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.1.0'
    }
  }
}
