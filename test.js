const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const Bundle = require('bare-bundle')
const stow = require('.')
const sidecar = require('./lib/target/bare-sidecar')

const fixtures = pathToFileURL(path.join(__dirname, 'test/fixtures') + '/')

require('./test/target')
require('./test/rpc')
require('./test/host')
require('./test/protocol')
require('./test/shim')
require('./test/sidecar')
require('./test/worker')

test('stow bare-sidecar yields harness + bundle', async (t) => {
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.js', dir)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out)) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', dir) },
    { url: new URL('out/index.bundle', dir) }
  ])
})

test('stow strips types from a TypeScript entry', async (t) => {
  const dir = new URL('typescript/', fixtures)
  const entry = new URL('core.ts', dir)
  const out = new URL('out/index.js', dir)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out)) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', dir) },
    { url: new URL('out/index.bundle', dir) }
  ])
})

test('stow generates an esm harness for a .mjs output', async (t) => {
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.mjs', dir)

  for await (const _ of stow(entry, 'bare-sidecar', out)) {
    //
  }

  const source = fs.readFileSync(fileURLToPath(out), 'utf8')

  t.ok(source.includes('export async function start'))
  t.ok(source.includes("import Sidecar from 'bare-sidecar'"))
})

test('stow generates a cjs harness for a .cjs output', async (t) => {
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.cjs', dir)

  for await (const _ of stow(entry, 'bare-sidecar', out)) {
    //
  }

  const source = fs.readFileSync(fileURLToPath(out), 'utf8')

  t.ok(source.includes('module.exports'))
  t.ok(source.includes("const Sidecar = require('bare-sidecar')"))
})

test('stow generates an esm harness for a .js output under "type": "module"', async (t) => {
  const dir = new URL('esm/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.js', dir)

  // The fixture declares `"type": "module"`, so a `.js` output resolves to ESM.
  for await (const _ of stow(entry, 'bare-sidecar', out)) {
    //
  }

  const source = fs.readFileSync(fileURLToPath(out), 'utf8')

  t.ok(source.includes('export async function start'))
})

test('stow lets a target override the path-derived module system', async (t) => {
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.mjs', dir)

  // Pin the target to CommonJS even though the output path implies ESM.
  const target = { ...sidecar, module: 'cjs' }

  for await (const _ of stow(entry, target, out)) {
    //
  }

  const source = fs.readFileSync(fileURLToPath(out), 'utf8')

  t.ok(source.includes('module.exports'))
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
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.js', dir)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out, {
    hosts: ['darwin-arm64']
  })) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', dir) },
    { url: new URL('out/index.bundle', dir) }
  ])
})

test('stow defaults base to the closest directory containing every module', async (t) => {
  const dir = new URL('reroot/app/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.js', dir)

  const artifacts = []

  for await (const artifact of stow(entry, 'bare-sidecar', out)) {
    artifacts.push(artifact)
  }

  t.alike(artifacts, [
    { url: out },
    { url: new URL('out/index.d.ts', dir) },
    { url: new URL('out/index.bundle', dir) },
    { url: new URL('out/node_modules/dummy/asset.txt', dir) }
  ])

  const bundle = Bundle.from(fs.readFileSync(fileURLToPath(new URL('out/index.bundle', dir))))

  const resolutions = Object.values(bundle.resolutions).flatMap((imports) => Object.values(imports))

  t.ok(
    resolutions.some((value) => JSON.stringify(value).includes('/../node_modules/dummy/asset.txt')),
    'the offloaded asset resolves next to the bundle'
  )
})

test('stow throws when base does not contain every module', async (t) => {
  const base = new URL('reroot/app/', fixtures)
  const entry = new URL('core.js', base)
  const out = new URL('out/index.js', base)

  await t.exception(async () => {
    for await (const _ of stow(entry, 'bare-sidecar', out, { base })) {
      //
    }
  }, /is outside base/)
})

test('stow throws for host not supported by target', async (t) => {
  const dir = new URL('basic/', fixtures)
  const entry = new URL('core.js', dir)
  const out = new URL('out/index.js', dir)

  await t.exception(async () => {
    for await (const _ of stow(entry, 'bare-sidecar', out, {
      hosts: ['ios-arm64']
    })) {
      //
    }
  }, /Host 'ios-arm64' is not supported by target 'bare-sidecar'/)
})
