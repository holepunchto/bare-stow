const test = require('brittle')
const { Duplex } = require('bare-stream')
const protocol = require('../lib/protocol')

test('protocol round-trips user frames', (t) => {
  t.plan(1)

  const [left, right] = pair()
  const host = protocol.attach(left)
  const worker = protocol.attach(right)

  worker.on('data', (data) => {
    t.alike(data, Buffer.from('hello'))
  })

  host.write(Buffer.from('hello'))
})

test('protocol round-trips plain Uint8Array frames (no Buffer methods)', (t) => {
  t.plan(1)

  // React Native / Hermes delivers plain Uint8Arrays, which lack Buffer's
  // .copy/.readUInt32LE — the transport must not rely on them.
  const [left, right] = rawPair()
  const host = protocol.attach(left)
  const worker = protocol.attach(right)

  worker.on('data', (data) => {
    t.alike(Uint8Array.from(data), Uint8Array.from([1, 2, 3, 4, 5]))
  })

  host.write(new Uint8Array([1, 2, 3, 4, 5]))
})

test('protocol round-trips control frames', (t) => {
  t.plan(1)

  const [left, right] = pair()
  const host = protocol.attach(left)
  const worker = protocol.attach(right)

  worker.on('ready', () => t.pass('ready'))

  host.send('ready')
})

test('protocol carries control payloads', (t) => {
  t.plan(1)

  const [left, right] = pair()
  const host = protocol.attach(left)
  const worker = protocol.attach(right)

  host.on('exit', (code) => t.is(code, 42))

  worker.send('exit', { code: 42 })
})

function pair() {
  let a, b

  a = new Duplex({
    write(data, encoding, cb) {
      b.push(Buffer.from(data))
      cb(null)
    }
  })

  b = new Duplex({
    write(data, encoding, cb) {
      a.push(Buffer.from(data))
      cb(null)
    }
  })

  return [a, b]
}

// Like pair() but relays plain Uint8Arrays, as a Hermes transport would —
// nothing here upgrades the bytes to a Buffer.
function rawPair() {
  let a, b

  a = new Duplex({
    write(data, encoding, cb) {
      b.push(Uint8Array.from(data))
      cb(null)
    }
  })

  b = new Duplex({
    write(data, encoding, cb) {
      a.push(Uint8Array.from(data))
      cb(null)
    }
  })

  return [a, b]
}
