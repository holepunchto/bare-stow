const test = require('brittle')
const rpc = require('../lib/rpc')

test('rpc bare-rpc client', (t) => {
  t.snapshot(rpc('bare-rpc').generate({ ipc: 'ipc', rpc: 'rpc', module: 'cjs', role: 'client' }))
})

test('rpc bare-rpc server', (t) => {
  t.snapshot(rpc('bare-rpc').generate({ ipc: 'ipc', rpc: 'rpc', module: 'esm', role: 'server' }))
})

test('rpc accepts an rpc provider object', (t) => {
  const provided = rpc('bare-rpc')

  t.is(rpc(provided), provided)
})

test('rpc throws for unknown library', (t) => {
  t.exception(() => rpc('something-else'), /Unknown RPC library/)
})

test('rpc throws for an invalid rpc provider', (t) => {
  t.exception(() => rpc({}), /generate\(\) function/)
})
