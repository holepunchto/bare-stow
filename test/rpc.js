const test = require('brittle')
const rpc = require('../lib/rpc')

test('rpc bare-rpc client', (t) => {
  const [setup, types] = rpc('bare-rpc').generate({
    ipc: 'ipc',
    rpc: 'rpc',
    module: 'cjs',
    role: 'client'
  })

  t.snapshot(setup.source, 'setup')
  t.snapshot(types.source, 'types')
})

test('rpc bare-rpc server', (t) => {
  const [setup, types] = rpc('bare-rpc').generate({
    ipc: 'ipc',
    rpc: 'rpc',
    module: 'esm',
    role: 'server'
  })

  t.snapshot(setup.source, 'setup')
  t.snapshot(types.source, 'types')
})

test('rpc accepts an rpc provider object', (t) => {
  const provided = rpc('bare-rpc')

  t.is(rpc(provided), provided)
})

test('rpc resolves an unknown library through resolve', (t) => {
  const provided = rpc('bare-rpc')

  t.is(
    rpc('something-else', () => provided),
    provided
  )
})

test('rpc prefers the built-in registry over resolve', (t) => {
  let called = false

  const provider = rpc('bare-rpc', () => {
    called = true
  })

  t.is(provider.name, 'bare-rpc')
  t.absent(called)
})

test('rpc throws for unknown library', (t) => {
  t.exception(() => rpc('something-else'), /Unknown RPC library/)
})

test('rpc throws for an invalid rpc provider', (t) => {
  t.exception(() => rpc({}), /generate\(\) function/)
})
