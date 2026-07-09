const { Duplex, Writable } = require('bare-stream')
const FramedStream = require('framed-stream')
const b4a = require('b4a')

const CONTROL = 0x00
const USER = 0x01

exports.CONTROL = CONTROL
exports.USER = USER

class Protocol extends Duplex {
  constructor(stream) {
    super()

    this._stream = new FramedStream(stream)
    this._stream
      .on('data', (frame) => this._onframe(frame))
      .on('end', () => this.push(null))
      .on('close', () => this.destroy())
      .on('error', (err) => this.destroy(err))
  }

  send(type, payload) {
    this._stream.write(encodeFrame(CONTROL, b4a.from(JSON.stringify({ type, ...payload }))))

    return Writable.drained(this._stream)
  }

  _write(data, encoding, cb) {
    const ok = this._stream.write(encodeFrame(USER, data))

    if (ok) return cb(null)

    this._stream.once('drain', () => cb(null))
  }

  _destroy(err, cb) {
    this._stream.destroy()
    cb(null)
  }

  _onframe(frame) {
    const tag = frame[0]
    const payload = frame.subarray(1)

    if (tag === USER) {
      this.push(b4a.from(payload))
    } else if (tag === CONTROL) {
      let message

      try {
        message = JSON.parse(b4a.toString(payload))
      } catch {
        return
      }

      if (message.type === 'error') {
        const err = new Error(message.message)

        if (message.stack) err.stack = message.stack

        this.destroy(err)
      } else if (message.type === 'exit') {
        this.emit('exit', message.code)
      } else {
        this.emit(message.type, message)
      }
    }
  }
}

exports.Protocol = Protocol

exports.attach = function attach(stream) {
  return new Protocol(stream)
}

function encodeFrame(tag, data) {
  const frame = b4a.allocUnsafe(data.byteLength + 1)

  frame[0] = tag
  frame.set(data, 1)

  return frame
}
