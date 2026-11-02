const javascript = require('./language/javascript')
const { select } = require('./provider')

// The bundle runs in Bare, so its side of every provider is JavaScript.
module.exports = function shim(entry, isolation, server = null) {
  if (server) server = select('RPC library', server, javascript.name)

  const dir = new URL('./', entry)
  const url = new URL('__main__.mjs', dir)
  const serverURL = server ? new URL('__server__.mjs', dir) : null

  const modules = new Map()

  if (server) {
    modules.set(
      serverURL.href,
      server.generate({ role: 'server', options: { module: 'esm' } }).source
    )
  }

  modules.set(
    url.href,
    `\
import runtime from '${isolation === 'process' ? 'bare-stow-runtime/process' : 'bare-stow-runtime'}'
${server ? `import * as server from ${JSON.stringify(javascript.reference(url, serverURL))}\n` : ''}
const ipc = runtime.attach(Bare.IPC)
${server ? '\nconst rpc = server.attach(ipc)\n' : ''}
ipc.run(() => import(${JSON.stringify(javascript.reference(url, entry))}), ${server ? '{ rpc, ipc }' : 'ipc'})
`
  )

  return { url, modules }
}
