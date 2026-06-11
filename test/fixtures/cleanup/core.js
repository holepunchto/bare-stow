module.exports = function start(ipc) {
  return async function () {
    await new Promise((resolve) => setTimeout(resolve, 50))

    ipc.write(Buffer.from('goodbye'))
  }
}
