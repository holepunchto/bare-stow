const path = require('path')
const swift = require('./swift')

exports.name = 'bare-kit'
exports.isolation = 'thread'
exports.linked = (context) => !isJvm(context)
exports.linking = linking
exports.offload = isJvm
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.hosts = (context) => (isJvm(context) ? desktop : hosts[context.language])

// On the JVM, the harness extracts the bundle from the resources of its module,
// so the addons and assets of the bundle are offloaded beside it rather than
// linked.
function isJvm({ language, options }) {
  return language === 'kotlin' && options.platform === 'jvm'
}

function linking(context) {
  const { targetOptions } = context

  if (isJvm(context) && targetOptions.linking === 'app') {
    throw new Error("Option 'linking' must be 'package' for the JVM")
  }

  return targetOptions.linking
}

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
  from: '2.3.0',
  products: ['BareKit']
}

const bareKitKotlin = {
  'com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin': 'v0.2.+'
}

const desktop = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64'
]

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
        conformance: 'extension BareKit.IPC: @retroactive BareStowHost.Transport {}',
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

function kotlin(context) {
  const { client, options } = context

  const platform = options.platform === 'jvm' ? jvm(context) : android(context)

  const imports = [
    ...platform.imports,
    'kotlin.time.Duration',
    'kotlinx.coroutines.CoroutineScope',
    'kotlinx.coroutines.Dispatchers',
    'kotlinx.coroutines.launch',
    'to.holepunch.bare.kit.Ipc as WorkletIpc',
    'to.holepunch.bare.kit.Worklet',
    'to.holepunch.bare.stow.host.Ipc',
    ...(client ? ['to.holepunch.bare.rpc.Rpc'] : [])
  ].sort()

  const source = `\
package ${options.package}

${imports.map((name) => 'import ' + name).join('\n')}

class Started(val worklet: Worklet, val ipc: Ipc${client ? ', val rpc: Rpc' : ''})
${platform.declarations}
suspend fun start(
${platform.params}\
  options: Worklet.Options = Worklet.Options(),
  timeout: Duration? = null,
  grace: Duration = Ipc.DEFAULT_GRACE,${client ? '\n  handlers: Handlers = {},' : ''}
): Started {
  val worklet = ${platform.worklet}

  val transport =
    try {
      WorkletIpc(worklet)
    } catch (error: Throwable) {
      worklet.close()
      throw error
    }

  try {
    ${platform.start}
  } catch (error: Throwable) {
    transport.close()
    worklet.close()
    throw error
  }

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
    worklet.close()
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
      'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin': 'v0.2.2'
    }
  }
}

function android({ bundle, resources }) {
  return {
    imports: ['android.content.Context'],
    declarations: '',
    params: '  context: Context,\n',
    worklet: 'Worklet(context, options)',
    start: resources
      ? `worklet.start(${JSON.stringify(resources + '.bundle')}, context.assets.open(${JSON.stringify(bundle)}).use { it.readBytes() })`
      : `worklet.start(${JSON.stringify(bundle)})`
  }
}

// The bundle and the files listed beside it are extracted once per process, to
// a directory of its own that is removed on exit.
function jvm({ bundle }) {
  const dir = path.posix.dirname(bundle)
  const name = '/' + path.posix.basename(bundle)

  return {
    imports: ['java.io.File', 'java.nio.file.Files', 'kotlinx.coroutines.withContext'],
    declarations: `
private val bundle: File by lazy {
  val dir = Files.createTempDirectory("bare-stow").toFile()

  Runtime.getRuntime().addShutdownHook(Thread { dir.deleteRecursively() })

  val loader = Started::class.java.classLoader

  fun open(name: String) = loader.getResourceAsStream(${JSON.stringify(dir)} + name)!!

  val listed = open(${JSON.stringify(name + '.files')}).bufferedReader().use { it.readLines() }

  for (name in listOf(${JSON.stringify(name)}) + listed) {
    val file = File(dir, name)

    file.parentFile.mkdirs()

    open(name).use { input -> file.outputStream().use { input.copyTo(it) } }
  }

  File(dir, ${JSON.stringify(name)})
}
`,
    params: '',
    worklet: 'Worklet(options)',
    start: 'worklet.start(withContext(Dispatchers.IO) { bundle }.path)'
  }
}
