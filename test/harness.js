const test = require('brittle')
const harness = require('../lib/harness')
const rpc = require('../lib/rpc')

test('harness react-native', (t) => {
  const target = harness('react-native')

  t.is(target.format, 'bundle.mjs')
  t.snapshot(generate(target, './core.bundle.mjs'))
})

test('harness pear-runtime', (t) => {
  const target = harness('pear-runtime')

  t.is(target.format, 'bundle')
  t.snapshot(generate(target, './core.bundle'))
})

test('harness bare-sidecar', (t) => {
  const target = harness('bare-sidecar')

  t.is(target.format, 'bundle')
  t.snapshot(generate(target, './core.bundle'))
})

test('harness bare-sidecar with bare-rpc client', (t) => {
  const target = harness('bare-sidecar')

  t.snapshot(generate(target, './core.bundle', client(target)))
})

test('harness react-native with bare-rpc client', (t) => {
  const target = harness('react-native')

  t.snapshot(generate(target, './core.bundle.mjs', client(target)))
})

test('harness pear-runtime with bare-rpc client', (t) => {
  const target = harness('pear-runtime')

  t.snapshot(generate(target, './core.bundle', client(target)))
})

test('harness accepts a target provider object', (t) => {
  const provided = harness('bare-sidecar')

  t.is(harness(provided), provided)
})

test('harness throws for unknown target', (t) => {
  t.exception(() => harness('something-else'), /Unknown target/)
})

test('harness throws for an invalid target provider', (t) => {
  t.exception(() => harness({ hosts: [] }), /generate\(\) function/)
})

function client(target) {
  return rpc('bare-rpc').generate({
    ipc: 'ipc',
    rpc: 'rpc',
    module: target.module,
    role: 'client'
  })
}

function generate(target, bundleSpecifier, client = null) {
  return target.generate({ bundleSpecifier, ipc: 'ipc', rpc: 'rpc', client })
}
