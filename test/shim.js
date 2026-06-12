const test = require('brittle')
const { isWindows } = require('which-runtime')
const shim = require('../lib/shim')
const rpc = require('../lib/rpc')

const root = isWindows ? 'file://c:' : 'file://'

test('shim react-native', (t) => {
  t.snapshot(shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`)))
})

test('shim pear-runtime', (t) => {
  t.snapshot(shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`)))
})

test('shim node', (t) => {
  t.snapshot(shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`)))
})

test('shim react-native with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`), {
      server: server()
    })
  )
})

test('shim node with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`), {
      server: server()
    })
  )
})

function server() {
  return rpc('bare-rpc').generate({ ipc: 'ipc', rpc: 'rpc', module: 'esm', role: 'server' })
}
