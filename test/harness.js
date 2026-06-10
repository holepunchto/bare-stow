const test = require('brittle')
const harness = require('../lib/harness')

test('harness react-native', (t) => {
  const target = harness('react-native')

  t.is(target.format, 'bundle.mjs')
  t.snapshot(target.generate({ bundleSpecifier: './core.bundle.mjs' }))
})

test('harness pear-runtime', (t) => {
  const target = harness('pear-runtime')

  t.is(target.format, 'bundle')
  t.snapshot(target.generate({ bundleSpecifier: './core.bundle' }))
})

test('harness node', (t) => {
  const target = harness('node')

  t.is(target.format, 'bundle')
  t.snapshot(target.generate({ bundleSpecifier: './core.bundle' }))
})

test('harness node with bare-rpc client', (t) => {
  const target = harness('node')

  t.snapshot(target.generate({ bundleSpecifier: './core.bundle', client: 'bare-rpc' }))
})

test('harness react-native with bare-rpc client', (t) => {
  const target = harness('react-native')

  t.snapshot(target.generate({ bundleSpecifier: './core.bundle.mjs', client: 'bare-rpc' }))
})

test('harness pear-runtime with bare-rpc client', (t) => {
  const target = harness('pear-runtime')

  t.snapshot(target.generate({ bundleSpecifier: './core.bundle', client: 'bare-rpc' }))
})

test('harness throws for unknown target', (t) => {
  t.exception(() => harness('something-else'), /Unknown target/)
})

test('harness throws for unknown client', (t) => {
  const target = harness('node')

  t.exception(
    () => target.generate({ bundleSpecifier: './core.bundle', client: 'something-else' }),
    /Unknown RPC library/
  )
})
