module.exports = function start() {
  setTimeout(() => {
    throw new Error('uncaught')
  }, 10)
}
