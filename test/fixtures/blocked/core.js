module.exports = function start(ipc) {
  ipc.write(Buffer.from(String(Bare.pid)))

  setTimeout(() => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0)
  }, 100)
}
