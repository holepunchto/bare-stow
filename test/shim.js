const test = require('brittle')
const { isWindows } = require('which-runtime')
const shim = require('../lib/shim')
const rpc = require('../lib/rpc')

const root = isWindows ? 'file://c:' : 'file://'

test('shim', (t) => {
  t.snapshot(shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`)))
})

test('shim with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`), {
      server: server()
    })
  )
})

function server() {
  const [setup] = rpc('bare-rpc').generate({
    ipc: 'ipc',
    rpc: 'rpc',
    module: 'esm',
    role: 'server'
  })

  return setup.source
}
