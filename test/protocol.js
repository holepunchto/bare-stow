const test = require('brittle')
const { Duplex } = require('streamx')
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

test('protocol reassembles partial frames', (t) => {
  t.plan(1)

  const [, right] = pair()
  const worker = protocol.attach(right)

  worker.on('data', (data) => {
    t.alike(data, Buffer.from('reassembled'))
  })

  const payload = Buffer.from('reassembled')
  const frame = Buffer.alloc(5 + payload.length)
  frame.writeUInt32LE(payload.length + 1, 0)
  frame.writeUInt8(0x01, 4)
  payload.copy(frame, 5)

  for (let i = 0; i < frame.length; i++) {
    right.push(Buffer.from([frame[i]]))
  }
})

test('protocol coalesces multiple frames in one chunk', (t) => {
  t.plan(2)

  const [, right] = pair()
  const worker = protocol.attach(right)

  const received = []

  worker.on('data', (data) => {
    received.push(data.toString())

    if (received.length === 2) {
      t.is(received[0], 'a')
      t.is(received[1], 'b')
    }
  })

  function frame(payload) {
    const buf = Buffer.alloc(5 + payload.length)
    buf.writeUInt32LE(payload.length + 1, 0)
    buf.writeUInt8(0x01, 4)
    payload.copy(buf, 5)
    return buf
  }

  right.push(Buffer.concat([frame(Buffer.from('a')), frame(Buffer.from('b'))]))
})

function pair() {
  let a, b

  a = new Duplex({
    write(data, cb) {
      b.push(Buffer.from(data))
      cb(null)
    }
  })

  b = new Duplex({
    write(data, cb) {
      a.push(Buffer.from(data))
      cb(null)
    }
  })

  return [a, b]
}
