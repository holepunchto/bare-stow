const { Duplex, Writable, isStreamx } = require('streamx')

const CONTROL = 0x00
const USER = 0x01

exports.CONTROL = CONTROL
exports.USER = USER

const HEADER_LENGTH = 5

class Protocol extends Duplex {
  constructor(stream) {
    super()

    this._stream = stream
    this._buffer = []
    this._buffered = 0
    this._frame = -1

    stream
      .on('data', (chunk) => this._ondata(chunk))
      .on('end', () => this.push(null))
      .on('close', () => this.destroy())
      .on('error', (err) => this.destroy(err))
  }

  send(type, payload) {
    const frame = encodeFrame(CONTROL, Buffer.from(JSON.stringify({ type, ...payload })))

    if (isStreamx(this._stream)) {
      this._stream.write(frame)

      return Writable.drained(this._stream)
    }

    return new Promise((resolve) => this._stream.write(frame, resolve))
  }

  _write(data, cb) {
    const frame = encodeFrame(USER, data)

    if (isStreamx(this._stream)) {
      const ok = this._stream.write(frame)

      if (ok) return cb(null)

      this._stream.once('drain', () => cb(null))
    } else {
      this._stream.write(frame, cb)
    }
  }

  _destroy(cb) {
    this._stream.destroy()
    cb(null)
  }

  _ondata(chunk) {
    this._buffer.push(chunk)
    this._buffered += chunk.byteLength

    if (this._frame === -1) this._onbeforeframe()
    else this._onafterframe()
  }

  _onbeforeframe() {
    if (this._buffered < 4) return

    const buffer = this._buffer.length === 1 ? this._buffer[0] : Buffer.concat(this._buffer)

    this._buffer = [buffer]
    this._frame = 4 + buffer.readUInt32LE(0)

    this._onafterframe()
  }

  _onafterframe() {
    if (this._buffered < this._frame) return

    const buffer = this._buffer.length === 1 ? this._buffer[0] : Buffer.concat(this._buffer)
    const frame = this._frame

    this._buffered -= frame
    this._buffer = this._buffered > 0 ? [buffer.subarray(frame)] : []
    this._frame = -1

    this._onframe(buffer.subarray(0, frame))
    this._onbeforeframe()
  }

  _onframe(frame) {
    const tag = frame.readUInt8(4)
    const payload = frame.subarray(HEADER_LENGTH)

    if (tag === USER) {
      this.push(Buffer.from(payload))
    } else if (tag === CONTROL) {
      let message

      try {
        message = JSON.parse(payload.toString())
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
  const length = data.length + 1
  const frame = Buffer.alloc(HEADER_LENGTH + data.length)

  frame.writeUInt32LE(length, 0)
  frame.writeUInt8(tag, 4)

  data.copy(frame, HEADER_LENGTH)

  return frame
}
