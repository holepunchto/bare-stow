const greeting = require.asset('./greeting.txt')

module.exports = function start(ipc) {
  ipc.end(greeting)
}
