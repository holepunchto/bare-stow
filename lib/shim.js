const javascript = require('./language/javascript')
const { select } = require('./provider')

// The bundle runs in Bare, so its side of every provider is JavaScript. The
// shims are CommonJS, which loads in any graph, such as one whose ES modules are
// converted to CommonJS. They load the entry with `require()` rather than
// `import()` for engines without ES module support, and wrap a CommonJS entry
// as `import()` would so that the runtime always finds it at `entry.default`.
module.exports = function shim(entry, isolation, server = null) {
  if (server) server = select('RPC library', server, javascript.name)

  const dir = new URL('./', entry)
  const url = new URL('__main__.cjs', dir)
  const serverURL = server ? new URL('__server__.cjs', dir) : null

  const modules = new Map()

  if (server) {
    modules.set(
      serverURL.href,
      server.generate({ role: 'server', options: { module: 'cjs' } }).source
    )
  }

  modules.set(
    url.href,
    `\
const runtime = require('${isolation === 'process' ? 'bare-stow-runtime/process' : 'bare-stow-runtime'}')
${server ? `const server = require(${JSON.stringify(javascript.reference(url, serverURL))})\n` : ''}
const ipc = runtime.attach(Bare.IPC)
${server ? '\nconst rpc = server.attach(ipc)\n' : ''}
ipc.run(() => {
  const entry = require(${JSON.stringify(javascript.reference(url, entry))})
  return entry.__esModule || entry[Symbol.toStringTag] === 'Module' ? entry : { default: entry }
}, ${server ? '{ rpc, ipc }' : 'ipc'})
`
  )

  return { url, modules }
}
