module.exports = function start(ipc, ready) {
  ipc.on('data', (data) => ipc.write(data))

  ready()

  return new Promise(() => {})
}
