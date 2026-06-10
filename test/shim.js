const test = require('brittle')
const { isWindows } = require('which-runtime')
const shim = require('../lib/shim')

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
      server: 'bare-rpc'
    })
  )
})

test('shim node with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`), {
      server: 'bare-rpc'
    })
  )
})

test('shim throws for unknown server', (t) => {
  t.exception(
    () =>
      shim(new URL(`${root}/app/entry.js`), new URL(`${root}/app/__main__.js`), {
        server: 'something-else'
      }),
    /Unknown RPC library/
  )
})
