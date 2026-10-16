module.exports = function start() {
  return function () {
    console.log('stopping')

    return new Promise(() => setInterval(() => {}, 1000))
  }
}
