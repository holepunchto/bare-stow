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
