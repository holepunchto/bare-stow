const test = require('brittle')
const rpcs = require('../lib/rpc')

test('rpc bare-rpc client', (t) => {
  snapshot(t, 'client', { module: 'cjs' })
})

test('rpc bare-rpc client as esm', (t) => {
  snapshot(t, 'client', { module: 'esm' })
})

test('rpc bare-rpc server', (t) => {
  snapshot(t, 'server', { module: 'esm' })
})

test('rpc bare-rpc client as python', (t) => {
  const { source, dependencies } = rpcs('bare-rpc').languages.python.generate({
    role: 'client',
    options: {}
  })

  t.snapshot(source, 'source')
  t.alike(dependencies, { 'bare-rpc': '>=0.1.0', 'bare-stow-host': '>=0.1.0' })
})

test('rpc bare-rpc client as kotlin', (t) => {
  const { source, dependencies } = rpcs('bare-rpc').languages.kotlin.generate({
    role: 'client',
    options: { package: 'com.example.core' }
  })

  t.snapshot(source, 'source')
  t.alike(Object.keys(dependencies), [
    'com.github.holepunchto.bare-rpc-kotlin:bare-rpc-kotlin',
    'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin'
  ])
})

test('rpc bare-rpc client as swift', (t) => {
  const { source, dependencies } = rpcs('bare-rpc').languages.swift.generate({
    role: 'client',
    options: {}
  })

  t.snapshot(source, 'source')
  t.alike(Object.keys(dependencies), ['bare-rpc-swift', 'bare-stow-host-swift'])
})

test('rpc accepts an rpc provider object', (t) => {
  const provided = rpcs('bare-rpc')

  t.is(rpcs(provided), provided)
})

test('rpc resolves an unknown library through resolve', (t) => {
  const provided = rpcs('bare-rpc')

  t.is(
    rpcs('something-else', () => provided),
    provided
  )
})

test('rpc prefers the built-in registry over resolve', (t) => {
  let called = false

  const provider = rpcs('bare-rpc', () => {
    called = true
  })

  t.is(provider.name, 'bare-rpc')
  t.absent(called)
})

test('rpc throws for unknown library', (t) => {
  t.exception(() => rpcs('something-else'), /Unknown RPC library/)
})

test('rpc throws for an rpc provider without languages', (t) => {
  t.exception(() => rpcs({}), /languages object/)
})

test('rpc throws for an rpc language without generate()', (t) => {
  t.exception(
    () => rpcs({ languages: { javascript: {} } }),
    /generate\(\) function for language 'javascript'/
  )
})

function snapshot(t, role, options) {
  const { source, types } = rpcs('bare-rpc').languages.javascript.generate({ role, options })

  t.snapshot(source, 'source')
  t.snapshot(types, 'types')
}
