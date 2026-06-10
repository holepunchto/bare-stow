const path = require('path')
const { pathToFileURL } = require('url')
const test = require('brittle')
const stow = require('.')

const fixtures = pathToFileURL(path.join(__dirname, 'test/fixtures') + '/')

require('./test/harness')
require('./test/shim')

test('stow react-native yields harness + bundle', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'react-native', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [{ url: out }, { url: new URL('out/index.bundle.mjs', base) }])
})

test('stow pear-runtime yields harness + bundle', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'pear-runtime', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [{ url: out }, { url: new URL('out/index.bundle', base) }])
})

test('stow node yields harness + bundle', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'node', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [{ url: out }, { url: new URL('out/index.bundle', base) }])
})

test('stow throws without target', async (t) => {
  await t.exception(async () => {
    for await (const _ of stow(
      new URL('basic/core.js', fixtures),
      undefined,
      new URL('basic/out/index.js', fixtures)
    )) {
      //
    }
  }, /'target' is required/)
})

test('stow throws without out', async (t) => {
  await t.exception(async () => {
    for await (const _ of stow(new URL('basic/core.js', fixtures), 'node')) {
      //
    }
  }, /'out' is required/)
})

test('stow accepts a subset of target hosts', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'node', out, {
    base,
    hosts: ['darwin-arm64']
  })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [{ url: out }, { url: new URL('out/index.bundle', base) }])
})

test('stow reroots offloaded assets resolved outside base', async (t) => {
  const base = new URL('reroot/app/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'node', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.bundle', base) },
    { url: new URL('out/node_modules/dummy/asset.txt', base) }
  ])
})

test('stow throws for host not supported by target', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  await t.exception(async () => {
    for await (const _ of stow(entry, 'node', out, {
      base,
      hosts: ['ios-arm64']
    })) {
      //
    }
  }, /Host 'ios-arm64' is not supported by target 'node'/)
})
