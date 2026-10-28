const harness = require('./javascript')
const swift = require('./swift')

exports.name = 'bare-sidecar'
exports.isolation = 'process'
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
        name: 'bare-sidecar',
        version: '^0.5.12',
        binding: 'Sidecar',
        url: true,
        setup: `\
const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

const ipc = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

sidecar.on('exit', (code, signal) => ipc.exited(code, signal))`,
        types: "import('bare-sidecar').SidecarOptions"
      })
    }
  },
  python: { generate: python },
  swift: {
    generate(context) {
      return swift(context, {
        module: 'BareSidecar',
        conformance: 'extension Sidecar: @retroactive Transport {}',
        setup: `\
let sidecar = try await Sidecar.spawn(bundle)

let ipc = BareStowHost.IPC(sidecar, kill: { sidecar.kill() }, timeout: timeout, grace: grace)

Task {
  switch await sidecar.wait() {
  case .exit(let code): ipc.exited(code: code)
  case .signal(let signal): ipc.exited(code: nil, signal: signal)
  }
}`,
        dependencies: {
          'bare-sidecar-swift': {
            url: 'https://github.com/holepunchto/bare-sidecar-swift',
            from: '0.1.0',
            products: ['BareSidecar']
          }
        }
      })
    }
  }
}

function python({ bundle, client }) {
  const source = `\
import asyncio
from pathlib import Path
from typing import NamedTuple

from bare_sidecar import spawn
from bare_stow_host import DEFAULT_GRACE, IPC, wrap
${client ? `\nfrom ${client} import Client, attach\n` : ''}
bundle = Path(__file__).parent / ${JSON.stringify(bundle)}

_watching = set()


class Started(NamedTuple):
    ipc: IPC${client ? '\n    rpc: Client' : ''}


async def start(*, timeout=None, grace=DEFAULT_GRACE, **opts) -> Started:
    sidecar = await spawn(bundle, **opts)

    ipc = wrap(sidecar, kill=sidecar.kill, timeout=timeout, grace=grace)

    watching = asyncio.ensure_future(_watch(sidecar, ipc))
    _watching.add(watching)
    watching.add_done_callback(_watching.discard)
${client ? '\n    rpc = attach(ipc)\n' : ''}
    await ipc.ready

    return Started(ipc${client ? ', rpc' : ''})


async def _watch(sidecar, ipc):
    await sidecar.wait()

    ipc.exited(sidecar.exit_code, sidecar.signal_code)

    await sidecar.close()
`

  return {
    source,
    dependencies: {
      'bare-sidecar': '~=0.1.0',
      'bare-stow-host': '~=0.1.0'
    }
  }
}
