const test = require('brittle')
const harness = require('../lib/target')
const rpc = require('../lib/rpc')

test('harness bare-sidecar', (t) => {
  const target = harness('bare-sidecar')

  snapshot(t, target, './core.bundle')
})

test('harness bare-sidecar with bare-rpc client', (t) => {
  const target = harness('bare-sidecar')

  snapshot(t, target, './core.bundle', client(target))
})

test('harness accepts a target provider object', (t) => {
  const provided = harness('bare-sidecar')

  t.is(harness(provided), provided)
})

test('harness resolves an unknown target through resolve', (t) => {
  const provided = harness('bare-sidecar')

  t.is(
    harness('something-else', () => provided),
    provided
  )
})

test('harness prefers the built-in registry over resolve', (t) => {
  let called = false

  const target = harness('bare-sidecar', () => {
    called = true
  })

  t.is(target.name, 'bare-sidecar')
  t.absent(called)
})

test('harness throws for unknown target', (t) => {
  t.exception(() => harness('something-else'), /Unknown target/)
})

test('harness throws for an invalid target provider', (t) => {
  t.exception(() => harness({ hosts: [] }), /generate\(\) function/)
})

function client(target) {
  const artifacts = rpc('bare-rpc').generate({
    ipc: 'ipc',
    rpc: 'rpc',
    module: target.module,
    role: 'client'
  })

  return {
    source: artifacts.find((artifact) => !artifact.extension).source,
    type: artifacts.find((artifact) => artifact.extension === '.d.ts').source
  }
}

function snapshot(t, target, bundleSpecifier, client = null) {
  const [harness, types] = target.generate({
    bundleSpecifier,
    ipc: 'ipc',
    rpc: 'rpc',
    client
  })

  t.snapshot(harness.source, 'harness')
  t.snapshot(types.source, 'types')
}
