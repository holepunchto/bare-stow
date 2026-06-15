const path = require('path')
const { pathToFileURL } = require('url')
const test = require('brittle')
const stow = require('.')

const fixtures = pathToFileURL(path.join(__dirname, 'test/fixtures') + '/')

require('./test/target')
require('./test/rpc')
require('./test/host')
require('./test/protocol')
require('./test/shim')
require('./test/sidecar')

test('stow bare-sidecar yields harness + bundle', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', base) },
    { url: new URL('out/index.bundle', base) }
  ])
})

test('stow strips types from a TypeScript entry', async (t) => {
  const base = new URL('typescript/', fixtures)
  const entry = new URL('core.ts', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', base) },
    { url: new URL('out/index.bundle', base) }
  ])
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
    for await (const _ of stow(new URL('basic/core.js', fixtures), 'bare-sidecar')) {
      //
    }
  }, /'out' is required/)
})

test('stow accepts a subset of target hosts', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out, {
    base,
    hosts: ['darwin-arm64']
  })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', base) },
    { url: new URL('out/index.bundle', base) }
  ])
})

test('stow reroots offloaded assets resolved outside base', async (t) => {
  const base = new URL('reroot/app/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out, { base })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', base) },
    { url: new URL('out/index.bundle', base) },
    { url: new URL('out/node_modules/dummy/asset.txt', base) }
  ])
})

test('stow throws for host not supported by target', async (t) => {
  const base = new URL('basic/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  await t.exception(async () => {
    for await (const _ of stow(entry, 'bare-sidecar', out, {
      base,
      hosts: ['ios-arm64']
    })) {
      //
    }
  }, /Host 'ios-arm64' is not supported by target 'bare-sidecar'/)
})
