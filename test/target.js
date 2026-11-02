const test = require('brittle')
const targets = require('../lib/target')

test('harness bare-sidecar', (t) => {
  snapshot(t, targets('bare-sidecar'), { module: 'cjs' })
})

test('harness bare-sidecar with client', (t) => {
  snapshot(t, targets('bare-sidecar'), { module: 'cjs' }, './core.client.js')
})

test('harness bare-sidecar as esm', (t) => {
  snapshot(t, targets('bare-sidecar'), { module: 'esm' })
})

test('harness bare-sidecar as esm with client', (t) => {
  snapshot(t, targets('bare-sidecar'), { module: 'esm' }, './core.client.mjs')
})

test('harness bare-worker', (t) => {
  snapshot(t, targets('bare-worker'), { module: 'cjs' })
})

test('harness bare-worker with client', (t) => {
  snapshot(t, targets('bare-worker'), { module: 'cjs' }, './core.client.js')
})

test('harness bare-worker as esm', (t) => {
  snapshot(t, targets('bare-worker'), { module: 'esm' })
})

test('harness bare-worker as esm with client', (t) => {
  snapshot(t, targets('bare-worker'), { module: 'esm' }, './core.client.mjs')
})

test('harness bare-sidecar as python', (t) => {
  const { source, dependencies } = targets('bare-sidecar').languages.python.generate({
    bundle: 'index.bundle',
    client: null,
    options: {}
  })

  t.snapshot(source, 'harness')
  t.alike(dependencies, { 'bare-sidecar': '~=0.1.0', 'bare-stow-host': '~=0.1.0' })
})

test('harness bare-sidecar as python with client', (t) => {
  const { source } = targets('bare-sidecar').languages.python.generate({
    bundle: 'index.bundle',
    client: '.client',
    options: {}
  })

  t.snapshot(source, 'harness')
})

test('harness bare-sidecar as swift', (t) => {
  const { source, dependencies } = targets('bare-sidecar').languages.swift.generate({
    bundle: 'index.bundle',
    client: null,
    options: {}
  })

  t.snapshot(source, 'harness')
  t.alike(Object.keys(dependencies), ['bare-sidecar-swift', 'bare-stow-host-swift'])
})

test('harness bare-sidecar as swift with client', (t) => {
  const { source } = targets('bare-sidecar').languages.swift.generate({
    bundle: 'index.bundle',
    client: 'Client.swift',
    options: {}
  })

  t.snapshot(source, 'harness')
})

test('harness bare-kit as swift', (t) => {
  const { source, dependencies } = targets('bare-kit').languages.swift.generate({
    bundle: 'index.bundle',
    client: null,
    options: {}
  })

  t.snapshot(source, 'harness')
  t.alike(Object.keys(dependencies), ['bare-kit-swift', 'bare-stow-host-swift'])
})

test('harness bare-kit as swift with client', (t) => {
  const { source } = targets('bare-kit').languages.swift.generate({
    bundle: 'index.bundle',
    client: 'Client.swift',
    options: {}
  })

  t.snapshot(source, 'harness')
})

test('harness bare-kit as kotlin', (t) => {
  const { source, dependencies } = targets('bare-kit').languages.kotlin.generate({
    bundle: 'com/example/core/index.bundle',
    client: null,
    options: { package: 'com.example.core' }
  })

  t.snapshot(source, 'harness')
  t.alike(Object.keys(dependencies), [
    'com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin',
    'com.github.holepunchto.bare-stow-host-kotlin:bare-stow-host-kotlin'
  ])
})

test('harness accepts a target provider object', (t) => {
  const provided = targets('bare-sidecar')

  t.is(targets(provided), provided)
})

test('harness resolves an unknown target through resolve', (t) => {
  const provided = targets('bare-sidecar')

  t.is(
    targets('something-else', () => provided),
    provided
  )
})

test('harness prefers the built-in registry over resolve', (t) => {
  let called = false

  const target = targets('bare-sidecar', () => {
    called = true
  })

  t.is(target.name, 'bare-sidecar')
  t.absent(called)
})

test('harness throws for unknown target', (t) => {
  t.exception(() => targets('something-else'), /Unknown target/)
})

test('harness throws for a target provider without languages', (t) => {
  t.exception(() => targets({ hosts: [] }), /languages object/)
})

test('harness throws for a target language without generate()', (t) => {
  t.exception(
    () => targets({ hosts: [], languages: { javascript: {} } }),
    /generate\(\) function for language 'javascript'/
  )
})

test('harness throws for a target provider without isolation', (t) => {
  t.exception(() => targets.resolve({ hosts: [] }, context), /isolation/)
  t.exception(() => targets.resolve({ isolation: 'fiber', hosts: [] }, context), /isolation/)
})

test('harness throws for a target provider without hosts', (t) => {
  t.exception(() => targets.resolve({ isolation: 'process' }, context), /hosts array/)
})

test('harness resolves the properties of a target from the language', (t) => {
  const target = {
    name: 'resolved',
    isolation: ({ language }) => (language === 'javascript' ? 'process' : 'thread'),
    linked: false,
    hosts: ({ options }) => [options.host],
    languages: {}
  }

  t.alike(targets.resolve(target, { language: 'javascript', options: { host: 'linux-x64' } }), {
    ...target,
    isolation: 'process',
    linking: 'package',
    hosts: ['linux-x64']
  })
})

test('harness bare-kit supports hosts by language', (t) => {
  const target = targets('bare-kit')

  const targetOptions = targets.options(target)

  t.alike(targets.resolve(target, { language: 'kotlin', options: {}, targetOptions }).hosts, [
    'android-arm64',
    'android-arm',
    'android-x64',
    'android-ia32'
  ])
  t.alike(targets.resolve(target, { language: 'swift', options: {}, targetOptions }).hosts, [
    'darwin-arm64',
    'darwin-x64',
    'ios-arm64',
    'ios-arm64-simulator',
    'ios-x64-simulator'
  ])
})

const context = { language: 'javascript', options: {} }

function snapshot(t, target, options, client = null) {
  const { source, types } = target.languages.javascript.generate({
    bundle: './index.bundle',
    client,
    options
  })

  t.snapshot(source, 'harness')
  t.snapshot(types, 'types')
}
