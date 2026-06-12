exports.name = 'bare-rpc'

exports.generate = function generate(opts) {
  const { ipc, rpc } = opts

  const esm = opts.module === 'esm'

  return [
    {
      source: `\
${esm ? "const { default: RPC } = await import('bare-rpc')" : "const RPC = require('bare-rpc')"}

const router = new RPC.CommandRouter()
const ${rpc} = new RPC(${ipc}, router)

${rpc}.respond = router.respond.bind(router)
`
    },
    {
      extension: '.d.ts',
      source: "import('bare-rpc')"
    }
  ]
}
