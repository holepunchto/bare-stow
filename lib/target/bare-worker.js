const harness = require('./javascript')

exports.name = 'bare-worker'
exports.isolation = 'thread'
exports.linked = false
exports.offload = true
exports.format = 'bundle'
exports.encoding = null
exports.extension = '.bundle'
exports.hosts = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64'
]

exports.languages = {
  javascript: {
    generate(context) {
      return harness(context, {
        name: 'bare-worker',
        version: '^4.3.0',
        binding: 'Worker',
        setup: `\
const worker = new Worker(bundle, opts)

const ipc = stow.wrap(worker.IPC, { kill: () => worker.terminate(), timeout, grace })

worker.IPC.on('end', () => worker.IPC.destroy())

worker.on('exit', (code) => ipc.exited(code))`,
        types: "import('bare-worker').WorkerOptions"
      })
    }
  }
}
