const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('sidecar harness echoes user data', async (t) => {
  const harness = await bundle('echo')
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

async function bundle(name) {
  const base = new URL(name + '/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  for await (const _ of stow(entry, 'node', out, { base })) {
    //
  }

  return require(fileURLToPath(out))
}
