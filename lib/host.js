const { Protocol, DEFAULT_GRACE } = require('./protocol')

class IPC extends Protocol {
  constructor(stream, opts = {}) {
    super(stream)

    const { kill = () => stream.destroy(), timeout = null, grace = DEFAULT_GRACE } = opts

    this._kill = kill
    this._grace = grace
    this._terminating = null

    this.send('configure', { grace })

    this._ready = new Promise((resolve, reject) => {
      const timer =
        timeout === null
          ? null
          : setTimeout(() => onerror(new Error('Worker timed out before ready')), timeout)

      const cleanup = () => {
        clearTimeout(timer)
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

    this._ready.catch(() => this.destroy())
  }

  get ready() {
    return this._ready
  }

  terminate() {
    if (this._stream.destroyed) return Promise.resolve(undefined)

    return new Promise((resolve) => {
      this.once('exit', resolve)

      this._terminate().then(() => {
        this.off('exit', resolve)
        resolve(undefined)
      })
    })
  }

  _destroy(err, cb) {
    if (this._stream.destroyed) return cb(null)

    this._terminate().then(() => cb(null))
  }

  _terminate() {
    if (this._terminating !== null) return this._terminating

    const timer = setTimeout(() => this._kill(), this._grace)

    this.send('terminate')

    this._terminating = new Promise((resolve) => {
      this._stream.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    return this._terminating
  }
}

exports.IPC = IPC

exports.wrap = function wrap(stream, opts) {
  return new IPC(stream, opts)
}
