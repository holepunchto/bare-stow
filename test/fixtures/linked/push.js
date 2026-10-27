const hrtime = require('bare-hrtime')

module.exports = function start(ipc) {
  ipc.end(String(hrtime()[0]))
}
