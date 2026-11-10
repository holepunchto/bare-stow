module.exports = function start({ rpc }) {
  rpc.respond(1, (req, data) => data)

  rpc.respond(2, async (req) => {
    await new Promise((resolve) => req.signal.addEventListener('abort', resolve))

    rpc.event(2).send(req.signal.reason.code)
  })
}
