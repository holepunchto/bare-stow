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

test('host wrap rejects ready when worker exits before ready', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.on('terminate', () => right.destroy())
  worker.send('exit', { code: 1 })

  await t.exception(ipc.ready, /exited with code 1 before ready/)
})

test('host wrap rejects ready when stream closes before ready', async (t) => {
  const [left] = pair()
  const ipc = host.wrap(left)

  left.destroy()

  await t.exception(ipc.ready, /closed before ready/)
})

test('host wrap ignores exit after ready', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  worker.send('ready')
  await ipc.ready

  worker.send('exit', { code: 1 })
  right.destroy()

  t.is(await ipc.ready, undefined)
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

test('host wrap rejects ready and terminates the worker on timeout', (t) => {
  t.plan(2)

  const [left, right] = pair()
  const ipc = host.wrap(left, { timeout: 10 })
  const worker = protocol.attach(right)

  worker.on('terminate', () => {
    t.pass('worker received terminate')
    right.destroy()
  })

  t.exception(ipc.ready, /timed out before ready/)
})

test('host terminate kills the worker after the grace period', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left, { grace: 10 })
  const worker = protocol.attach(right)

  worker.send('ready')
  await ipc.ready

  t.is(await ipc.terminate(), undefined)
  t.ok(left.destroyed)
})

test('host terminate calls kill after the grace period', async (t) => {
  t.plan(2)

  const [left, right] = pair()
  const ipc = host.wrap(left, {
    grace: 10,
    kill() {
      t.pass('kill called')
      right.destroy()
    }
  })
  const worker = protocol.attach(right)

  worker.send('ready')
  await ipc.ready

  t.is(await ipc.terminate(), undefined)
})

test('host destroy kills the worker after the grace period', (t) => {
  t.plan(1)

  const [left] = pair()
  const ipc = host.wrap(left, { grace: 10 })

  ipc.on('close', () => t.ok(left.destroyed))

  ipc.destroy()
})

test('host terminate resolves once the stream has closed', async (t) => {
  const [left] = pair()
  const ipc = host.wrap(left)

  left.destroy()

  await t.exception(ipc.ready, /closed before ready/)

  t.is(await ipc.terminate(), undefined)
})

test('host exited before ready rejects ready with the exit code', async (t) => {
  const [left] = pair()
  const ipc = host.wrap(left, { grace: 10 })

  ipc.exited(3)

  const err = await ipc.ready.catch((err) => err)

  t.is(err.message, 'Worker exited with code 3')
  t.is(err.exitCode, 3)
})

test('host exited after ready emits an error with the signal', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left, { grace: 10 })
  const worker = protocol.attach(right)

  worker.send('ready')
  await ipc.ready

  const error = new Promise((resolve) => ipc.once('error', resolve))

  ipc.exited(null, 'SIGKILL')

  const err = await error

  t.is(err.message, 'Worker was killed by SIGKILL')
  t.is(err.signalCode, 'SIGKILL')
})

test('host exited is ignored after an exit frame', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left)
  const worker = protocol.attach(right)

  ipc.on('error', () => t.fail('reported as an error'))

  worker.send('ready')
  await ipc.ready

  worker.send('exit', { code: 0 })
  await new Promise((resolve) => ipc.once('exit', resolve))

  ipc.exited(0)

  t.absent(ipc.destroying)
})

test('host exited is ignored while terminating', async (t) => {
  const [left, right] = pair()
  const ipc = host.wrap(left, { grace: 10 })
  const worker = protocol.attach(right)

  ipc.on('error', () => t.fail('reported as an error'))

  worker.send('ready')
  await ipc.ready

  const terminated = ipc.terminate()

  ipc.exited(null, 'SIGKILL')

  t.is(await terminated, undefined)
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
