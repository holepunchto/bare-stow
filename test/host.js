const test = require('brittle')
const { Duplex } = require('bare-stream')
const protocol = require('../lib/protocol')
const host = require('../lib/host')

test('host wrap resolves ready when worker signals', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.send('ready')

  await ipc.ready

  t.pass('ready resolved')
})

test('host wrap rejects ready when worker errors before ready', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.on('terminate', () => right.destroy())
  worker.send('error', { message: 'boom' })

  await t.exception(ipc.ready, /boom/)
})

test('host wrap emits exit with code', (t) => {
  t.plan(1)

  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  ipc.on('exit', (code) => t.is(code, 7))

  worker.send('exit', { code: 7 })
})

test('host wrap is the user duplex', (t) => {
  t.plan(1)

  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  ipc.on('data', (data) => t.alike(data, Buffer.from('payload')))

  worker.write(Buffer.from('payload'))
})

test('host terminate resolves to exit code', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.on('terminate', () => worker.send('exit', { code: 0 }))
  worker.send('ready')
  await ipc.ready

  const code = await ipc.terminate()

  t.is(code, 0)
})

test('host destroy sends terminate to worker', (t) => {
  t.plan(2)

  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.on('terminate', () => {
    t.pass('worker received terminate')
    right.destroy()
  })
  ipc.on('close', () => t.pass('host closed'))

  ipc.destroy()
})

test('host emits close when underlying stream closes', (t) => {
  t.plan(1)

  const [left] = pair()
  const ipc = host.wrap(left)

  ipc.on('close', () => t.pass('close fired'))

  left.destroy()
})

function pair() {
  let a, b

  a = new Duplex({
    write(data, encoding, cb) {
      b.push(Buffer.from(data))
      cb(null)
    },
    destroy(err, cb) {
      if (!b.destroyed) b.destroy()
      cb(null)
    }
  })

  b = new Duplex({
    write(data, encoding, cb) {
      a.push(Buffer.from(data))
      cb(null)
    },
    destroy(err, cb) {
      if (!a.destroyed) a.destroy()
      cb(null)
    }
  })

  return [a, b]
}
