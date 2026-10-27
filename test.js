const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const Bundle = require('bare-bundle')
const stow = require('.')
const sidecar = require('./lib/target/bare-sidecar')
const javascript = require('./lib/language/javascript')

const fixtures = pathToFileURL(path.join(__dirname, 'test/fixtures') + '/')

require('./test/language')
require('./test/target')
require('./test/rpc')
require('./test/shim')
require('./test/kotlin')
require('./test/assets')
require('./test/link')
require('./test/python')
require('./test/swift')
require('./test/sidecar')
require('./test/worker')

test('stow writes the harness package and bundle', async (t) => {
  const dir = new URL('basic/', fixtures)

  t.alike(await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir)), [
    { url: new URL('out/javascript-sidecar/index.js', dir) },
    { url: new URL('out/javascript-sidecar/index.d.ts', dir) },
    { url: new URL('out/javascript-sidecar/package.json', dir) },
    { url: new URL('out/javascript-sidecar/index.bundle', dir) },
    ...prebuilds(dir)
  ])
})

test('stow strips types from a TypeScript entry', async (t) => {
  const dir = new URL('typescript/', fixtures)

  t.alike(await artifacts(new URL('core.ts', dir), new URL('out/javascript-sidecar', dir)), [
    { url: new URL('out/javascript-sidecar/index.js', dir) },
    { url: new URL('out/javascript-sidecar/index.d.ts', dir) },
    { url: new URL('out/javascript-sidecar/package.json', dir) },
    { url: new URL('out/javascript-sidecar/index.bundle', dir) },
    ...prebuilds(dir)
  ])
})

test('stow generates an esm harness package by default', async (t) => {
  const dir = new URL('basic/', fixtures)

  await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir))

  t.ok(read(dir, 'out/javascript-sidecar/index.js').includes('export async function start'))
  t.ok(read(dir, 'out/javascript-sidecar/index.js').includes("import Sidecar from 'bare-sidecar'"))
  t.is(JSON.parse(read(dir, 'out/javascript-sidecar/package.json')).type, 'module')
})

test('stow generates a cjs harness package when asked to', async (t) => {
  const dir = new URL('basic/', fixtures)

  await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    languageOptions: { module: 'cjs' }
  })

  t.ok(read(dir, 'out/javascript-sidecar/index.js').includes('module.exports'))
  t.ok(
    read(dir, 'out/javascript-sidecar/index.js').includes("const Sidecar = require('bare-sidecar')")
  )
  t.is(JSON.parse(read(dir, 'out/javascript-sidecar/package.json')).type, 'commonjs')
})

test('stow lets a target pin options over those given', async (t) => {
  const dir = new URL('basic/', fixtures)

  const target = {
    ...sidecar,
    languages: { javascript: { ...sidecar.languages.javascript, options: { module: 'cjs' } } }
  }

  await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    target,
    languageOptions: { module: 'esm' }
  })

  t.ok(read(dir, 'out/javascript-sidecar/index.js').includes('module.exports'))
})

test('stow throws for unknown or invalid language options', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
      languageOptions: { flavor: 'vanilla' }
    }),
    /Unknown option 'flavor' for language 'javascript'/
  )

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
      languageOptions: { module: 'amd' }
    }),
    /Option 'module' must be one of esm, cjs, got 'amd'/
  )
})

test('stow throws for an output that is not a valid package name', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/Javascript-Sidecar', dir)),
    /'Javascript-Sidecar' is not a valid package name/
  )
})

test('stow declares the dependencies of the generated modules', async (t) => {
  const dir = new URL('basic/', fixtures)

  await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    client: 'bare-rpc',
    server: 'bare-rpc'
  })

  t.alike(JSON.parse(read(dir, 'out/javascript-sidecar/package.json')), {
    name: 'javascript-sidecar',
    private: true,
    type: 'module',
    exports: {
      '.': {
        types: './index.d.ts',
        default: './index.js'
      }
    },
    dependencies: {
      'bare-sidecar': '^0.5.12',
      'bare-stow-host': '^0.1.0',
      'bare-rpc': '^1.3.2'
    }
  })
})

test('stow writes the rpc client next to the harness', async (t) => {
  const dir = new URL('basic/', fixtures)

  const written = await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    client: 'bare-rpc',
    server: 'bare-rpc'
  })

  t.alike(written.slice(0, 6), [
    { url: new URL('out/javascript-sidecar/index.js', dir) },
    { url: new URL('out/javascript-sidecar/index.d.ts', dir) },
    { url: new URL('out/javascript-sidecar/client.js', dir) },
    { url: new URL('out/javascript-sidecar/client.d.ts', dir) },
    { url: new URL('out/javascript-sidecar/package.json', dir) },
    { url: new URL('out/javascript-sidecar/index.bundle', dir) }
  ])

  t.ok(
    read(dir, 'out/javascript-sidecar/index.js').includes('import * as client from "./client.js"')
  )
})

test('stow throws without target', async (t) => {
  await t.exception(async () => {
    for await (const _ of stow(
      new URL('basic/core.js', fixtures),
      undefined,
      new URL('basic/out/javascript-sidecar', fixtures)
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

  const written = await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    hosts: ['darwin-arm64']
  })

  t.alike(written.slice(4), prebuilds(dir, ['darwin-arm64']))
})

test('stow defaults base to the closest directory containing every module', async (t) => {
  const dir = new URL('reroot/app/', fixtures)

  t.alike(await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir)), [
    { url: new URL('out/javascript-sidecar/index.js', dir) },
    { url: new URL('out/javascript-sidecar/index.d.ts', dir) },
    { url: new URL('out/javascript-sidecar/package.json', dir) },
    { url: new URL('out/javascript-sidecar/index.bundle', dir) },
    ...prebuilds(dir),
    { url: new URL('out/javascript-sidecar/index.bundle.d/node_modules/dummy/asset.txt', dir) }
  ])

  const bundle = Bundle.from(
    fs.readFileSync(fileURLToPath(new URL('out/javascript-sidecar/index.bundle', dir)))
  )

  const resolutions = Object.values(bundle.resolutions).flatMap((imports) => Object.values(imports))

  t.ok(
    resolutions.some((value) =>
      JSON.stringify(value).includes('/../index.bundle.d/node_modules/dummy/asset.txt')
    ),
    'the offloaded asset resolves into the directory of the bundle'
  )
})

test('stow throws when base does not contain every module', async (t) => {
  const base = new URL('reroot/app/', fixtures)

  await t.exception(
    artifacts(new URL('core.js', base), new URL('out/javascript-sidecar', base), { base }),
    /is outside base/
  )
})

test('stow accepts a language provider object', async (t) => {
  const dir = new URL('basic/', fixtures)

  const written = await artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
    language: { ...javascript }
  })

  t.alike(written.slice(0, 2), [
    { url: new URL('out/javascript-sidecar/index.js', dir) },
    { url: new URL('out/javascript-sidecar/index.d.ts', dir) }
  ])
})

test('stow throws for a language the target does not support', async (t) => {
  const dir = new URL('basic/', fixtures)

  const language = { ...javascript, name: 'other' }

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), { language }),
    /Target 'bare-sidecar' does not support language 'other'/
  )
})

test('stow throws for a language the rpc client does not support', async (t) => {
  const dir = new URL('basic/', fixtures)

  const language = { ...javascript, name: 'other' }

  const target = { ...sidecar, languages: { other: sidecar.languages.javascript } }

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
      target,
      language,
      client: 'bare-rpc'
    }),
    /RPC library 'bare-rpc' does not support language 'other'/
  )
})

test('stow throws for a linked target in a language without addons', async (t) => {
  const dir = new URL('basic/', fixtures)

  const target = { ...sidecar, linked: true }

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), { target }),
    /Language 'javascript' does not support linked addons/
  )
})

test('stow throws for host not supported by target', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    artifacts(new URL('core.js', dir), new URL('out/javascript-sidecar', dir), {
      hosts: ['ios-arm64']
    }),
    /Host 'ios-arm64' is not supported by target 'bare-sidecar'/
  )
})

async function artifacts(entry, out, opts = {}) {
  const { target = 'bare-sidecar', ...rest } = opts

  const written = []

  for await (const artifact of stow(entry, target, out, rest)) {
    written.push(artifact)
  }

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}

// The `bare-signals` addon of the shim runtime is offloaded alongside every
// bundle.
function prebuilds(dir, hosts = sidecar.hosts) {
  return hosts.map((host) => ({
    url: new URL(
      `out/javascript-sidecar/index.bundle.d/node_modules/bare-signals/prebuilds/${host}/bare-signals.bare`,
      dir
    )
  }))
}
