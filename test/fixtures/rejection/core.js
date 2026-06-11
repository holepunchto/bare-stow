module.exports = function start() {
  setTimeout(() => {
    Promise.reject(new Error('rejected'))
  }, 10)
}
