const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const { isBare, isWindows } = require('which-runtime')
const Sidecar = require('bare-sidecar')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

// On Windows, a child process is killed along with its host and SIGTERM can't
// be handled, so the sidecar never outlives its host to run `stop()`.
const outlivesHost = { skip: isWindows }

test('sidecar harness echoes user data', async (t) => {
  const harness = await bundle('echo')
  const { ipc } = await harness.start()

  const echo = new Promise((resolve) => ipc.once('data', resolve))

  ipc.write(Buffer.from('hello'))

  t.alike(await echo, Buffer.from('hello'))

  const code = await ipc.terminate()

  t.is(code, 0)
})

test('sidecar cjs harness echoes user data', async (t) => {
  const out = await build('echo', { languageOptions: { module: 'cjs' } }, 'javascript-sidecar-cjs')
  const harness = require(fileURLToPath(out))
  const { ipc } = await harness.start()

  const echo = new Promise((resolve) => ipc.once('data', resolve))

  ipc.write(Buffer.from('hello'))

  t.alike(await echo, Buffer.from('hello'))

  const code = await ipc.terminate()

  t.is(code, 0)
})

test('sidecar harness preserves write order', async (t) => {
  const harness = await bundle('echo')
  const { ipc } = await harness.start()

  const received = []
  const done = new Promise((resolve) => {
    ipc.on('data', (chunk) => {
      received.push(chunk.toString())
      if (received.length === 3) resolve()
    })
  })

  ipc.write(Buffer.from('one'))
  ipc.write(Buffer.from('two'))
  ipc.write(Buffer.from('three'))

  await done

  t.alike(received, ['one', 'two', 'three'])

  await ipc.terminate()
})

test('sidecar harness resolves start when ready is called explicitly', async (t) => {
  const harness = await bundle('ready')
  const { ipc } = await harness.start()

  const echo = new Promise((resolve) => ipc.once('data', resolve))

  ipc.write(Buffer.from('ping'))

  t.alike(await echo, Buffer.from('ping'))

  await ipc.terminate()
})

test('sidecar harness runs stop on terminate', async (t) => {
  const harness = await bundle('stop')
  const { ipc } = await harness.start()

  const goodbye = new Promise((resolve) => ipc.once('data', resolve))
  const exit = ipc.terminate()

  t.alike(await goodbye, Buffer.from('goodbye'))
  t.is(await exit, 0)
})

test('sidecar harness awaits async stop before exit', async (t) => {
  const harness = await bundle('cleanup')
  const { ipc } = await harness.start()

  const goodbye = new Promise((resolve) => ipc.once('data', resolve))
  const exit = ipc.terminate()

  t.alike(await goodbye, Buffer.from('goodbye'))
  t.is(await exit, 0)
})

test('sidecar harness rejects start when entry throws', async (t) => {
  const harness = await bundle('error')

  await t.exception(harness.start(), /boom/)
})

test('sidecar harness rejects start when entry throws at top level', async (t) => {
  const harness = await bundle('load')

  await t.exception(harness.start(), /load/)
})

test('sidecar harness rejects start when entry exits before ready', async (t) => {
  const harness = await bundle('exit')

  await t.exception(harness.start(), /exited with code 3/)
})

test('sidecar harness surfaces uncaught exceptions', async (t) => {
  const harness = await bundle('uncaught')
  const { ipc } = await harness.start()

  const err = await new Promise((resolve) => ipc.once('error', resolve))

  t.is(err.message, 'uncaught')
})

test('sidecar harness surfaces unhandled rejections', async (t) => {
  const harness = await bundle('rejection')
  const { ipc } = await harness.start()

  const err = await new Promise((resolve) => ipc.once('error', resolve))

  t.is(err.message, 'rejected')
})

test('sidecar harness rejects start when ready times out', async (t) => {
  const harness = await bundle('hang')

  await t.exception(harness.start({ timeout: 100 }), /timed out before ready/)
})

test('sidecar harness kills on terminate when stop never finishes', async (t) => {
  const harness = await bundle('stall')
  const { ipc } = await harness.start({ grace: 100 })

  t.is(await ipc.terminate(), undefined)
})

test('sidecar harness kills on destroy when stop never finishes', async (t) => {
  t.plan(1)

  const harness = await bundle('stall')
  const { ipc } = await harness.start({ grace: 100 })

  ipc.on('close', () => t.pass('closed'))
  ipc.destroy()
})

test('sidecar harness reports a worker that exits abruptly', async (t) => {
  const harness = await bundle('crash')
  const { ipc } = await harness.start()

  const err = await new Promise((resolve) => ipc.once('error', resolve))

  t.is(err.message, 'Worker exited with code 5')
  t.is(err.exitCode, 5)
})

test('sidecar harness reports a worker that is killed', outlivesHost, async (t) => {
  const harness = await bundle('blocked')
  const { ipc } = await harness.start()

  const pid = Number(await new Promise((resolve) => ipc.once('data', resolve)))

  const error = new Promise((resolve) => ipc.once('error', resolve))

  kill(pid, 'SIGKILL')

  const err = await error

  t.is(err.message, 'Worker was killed by SIGKILL')
  t.is(err.signalCode, 'SIGKILL')
})

test('sidecar harness kills a blocked worker after the grace period', async (t) => {
  const harness = await bundle('blocked')
  const { ipc } = await harness.start({ grace: 100 })

  const pid = Number(await new Promise((resolve) => ipc.once('data', resolve)))

  // Give the worker time to block its event loop.
  await new Promise((resolve) => setTimeout(resolve, 200))

  t.is(await ipc.terminate(), undefined)
  t.absent(isRunning(pid), 'the process is gone')
})

test('sidecar harness runs stop when the host crashes', outlivesHost, async (t) => {
  const output = await orphan('orphan', 'crash')

  t.ok(output.includes('stopped'))
})

test(
  'sidecar harness exits when the host crashes and stop never finishes',
  outlivesHost,
  async (t) => {
    const output = await orphan('stall', 'crash')

    t.ok(output.includes('stopping'))
  }
)

test('sidecar harness runs stop on SIGTERM when the host exits', outlivesHost, async (t) => {
  const output = await orphan('orphan', 'exit')

  t.ok(output.includes('stopped'))
})

test(
  'sidecar harness exits on SIGTERM when the host exits and stop never finishes',
  outlivesHost,
  async (t) => {
    const output = await orphan('stall', 'exit')

    t.ok(output.includes('stopping'))
  }
)

function isRunning(pid) {
  try {
    kill(pid, 0)

    return true
  } catch {
    return false
  }
}

function kill(pid, signal) {
  if (isBare) require('bare-os').kill(pid, signal)
  else process.kill(pid, signal)
}

test('sidecar harness round-trips rpc requests', async (t) => {
  const harness = await bundle('rpc', { client: 'bare-rpc', server: 'bare-rpc' })
  const { ipc, rpc } = await harness.start()

  const req = rpc.request(1)

  req.send(Buffer.from('ping'))

  t.alike(await req.reply(), Buffer.from('ping'))

  await ipc.terminate()
})

async function build(name, opts, pkg = 'javascript-sidecar') {
  const dir = new URL(name + '/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL(`out/${pkg}/`, dir)

  for await (const _ of stow(entry, 'bare-sidecar', out, opts)) {
    //
  }

  return new URL('index.js', out)
}

async function bundle(name, opts) {
  return import((await build(name, opts)).href)
}

// Starts the harness from a separate host process that either exits or crashes
// without terminating it. The sidecar inherits the host stdout, so the output
// only ends once the sidecar has exited as well.
async function orphan(name, mode) {
  const out = await build(name, { languageOptions: { module: 'cjs' } }, 'javascript-sidecar-orphan')

  const host = new Sidecar(
    fileURLToPath(new URL('orphan/host.js', fixtures)),
    [fileURLToPath(out), mode],
    { stdio: ['ignore', 'pipe', 'inherit'] }
  )

  const chunks = []

  host.stdout.on('data', (chunk) => chunks.push(chunk))

  await new Promise((resolve) => host.stdout.on('end', resolve))

  return Buffer.concat(chunks).toString()
}
