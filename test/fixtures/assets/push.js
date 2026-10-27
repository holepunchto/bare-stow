const greeting = require.asset('./greeting.txt')
const other = require.asset('./dir/other.txt')

module.exports = function start(ipc) {
  ipc.end(greeting + other)
}
