module.exports = function start(ipc) {
  return function () {
    ipc.write(Buffer.from('goodbye'))
  }
}
