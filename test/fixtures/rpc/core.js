module.exports = function start({ rpc }) {
  rpc.respond(1, (req, data) => data)
}
