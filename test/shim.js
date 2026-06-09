const test = require('brittle')
const shim = require('../lib/shim')

test('shim react-native', (t) => {
  t.snapshot(shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js')))
})

test('shim pear-runtime', (t) => {
  t.snapshot(shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js')))
})

test('shim node', (t) => {
  t.snapshot(shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js')))
})

test('shim react-native with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js'), {
      server: 'bare-rpc'
    })
  )
})

test('shim node with bare-rpc server', (t) => {
  t.snapshot(
    shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js'), {
      server: 'bare-rpc'
    })
  )
})

test('shim throws for unknown server', (t) => {
  t.exception(
    () =>
      shim(new URL('file:///app/entry.js'), new URL('file:///app/__main__.js'), {
        server: 'something-else'
      }),
    /Unknown RPC library/
  )
})
