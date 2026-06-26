const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const { isBare } = require('which-runtime')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

// `bare-worker` runs the bundle on a Bare thread, so the harness can only be
// started under Bare.
const opts = { skip: !isBare }

test('worker harness echoes user data', opts, async (t) => {
  const harness = await bundle('echo')
  const { ipc } = await harness.start()

  const echo = new Promise((resolve) => ipc.once('data', resolve))

  ipc.write(Buffer.from('hello'))

  t.alike(await echo, Buffer.from('hello'))

  const code = await ipc.terminate()

  t.is(code, 0)
})

test('worker harness preserves write order', opts, async (t) => {
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

async function bundle(name) {
  const base = new URL(name + '/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/worker.js', base)

  for await (const _ of stow(entry, 'bare-worker', out, { base })) {
    //
  }

  return require(fileURLToPath(out))
}
