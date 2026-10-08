const { Protocol } = require('./protocol')

class IPC extends Protocol {
  constructor(stream) {
    super(stream)

    this._ready = new Promise((resolve, reject) => {
      const cleanup = () => {
        this.off('ready', onready).off('error', onerror).off('exit', onexit).off('close', onclose)
      }

      const onready = () => {
        cleanup()
        resolve()
      }

      const onerror = (err) => {
        cleanup()
        reject(err)
      }

      const onexit = (code) => {
        // An error frame precedes the exit frame and is emitted on destroy
        if (this.destroying) return
        onerror(new Error(`Worker exited with code ${code} before ready`))
      }

      const onclose = () => onerror(new Error('Worker closed before ready'))

      this.on('ready', onready).on('error', onerror).on('exit', onexit).on('close', onclose)
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
