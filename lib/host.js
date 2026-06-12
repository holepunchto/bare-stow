const { Protocol } = require('./protocol')

class IPC extends Protocol {
  constructor(stream) {
    super(stream)

    this._ready = new Promise((resolve, reject) => {
      const onready = () => {
        this.off('ready', onready).off('error', onerror)
        resolve()
      }

      const onerror = (err) => {
        this.off('ready', onready).off('error', onerror)
        reject(err)
      }

      this.on('ready', onready).on('error', onerror)
    })

    this._ready.catch(() => {})
  }

  get ready() {
    return this._ready
  }

  terminate() {
    return new Promise((resolve) => {
      const cleanup = () => {
        this.off('exit', onexit)
        this._stream.off('close', onclose)
      }

      const onexit = (code) => {
        cleanup()
        resolve(code)
      }

      const onclose = () => {
        cleanup()
        resolve(undefined)
      }

      this.once('exit', onexit).send('terminate')
      this._stream.once('close', onclose)
    })
  }

  _destroy(err, cb) {
    if (this._stream.destroyed) return cb(null)

    this.send('terminate')
    this._stream.once('close', () => cb(null))
  }
}

exports.IPC = IPC

exports.wrap = function wrap(stream) {
  return new IPC(stream)
}
