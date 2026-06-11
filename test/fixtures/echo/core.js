module.exports = function start(ipc) {
  ipc.on('data', (data) => ipc.write(data))
}
