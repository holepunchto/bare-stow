const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const Bundle = require('bare-bundle')
const stow = require('..')
const sidecar = require('../lib/target/bare-sidecar')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('python harness package for a bundle without rpc', async (t) => {
  const dir = new URL('echo/', fixtures)

  const written = await build(dir, 'python-sidecar')

  t.alike(written, [
    { url: new URL('out/python-sidecar/python_sidecar/__init__.py', dir) },
    { url: new URL('out/python-sidecar/pyproject.toml', dir) },
    { url: new URL('out/python-sidecar/python_sidecar/index.bundle', dir) },
    ...sidecar.hosts.map((host) => ({
      url: new URL(
        `out/python-sidecar/python_sidecar/index.bundle.d/node_modules/bare-signals/prebuilds/${host}/bare-signals.bare`,
        dir
      )
    }))
  ])

  const harness = read(dir, 'out/python-sidecar/python_sidecar/__init__.py')

  t.ok(harness.includes('bundle = Path(__file__).parent / "index.bundle"'))
  t.absent(harness.includes('from .client import'))

  const manifest = read(dir, 'out/python-sidecar/pyproject.toml')

  t.ok(manifest.includes('name = "python_sidecar"'))
  t.ok(manifest.includes('"bare-sidecar>=0.1.0"'))
  t.ok(manifest.includes('"bare-stow-host>=0.1.0"'))
  t.absent(manifest.includes('bare-rpc'))
})

test('python harness package for a bundle with rpc', async (t) => {
  const dir = new URL('rpc/', fixtures)

  const written = await build(dir, 'python-sidecar', {
    client: 'bare-rpc',
    server: 'bare-rpc'
  })

  t.alike(written.slice(0, 4), [
    { url: new URL('out/python-sidecar/python_sidecar/__init__.py', dir) },
    { url: new URL('out/python-sidecar/python_sidecar/client.py', dir) },
    { url: new URL('out/python-sidecar/pyproject.toml', dir) },
    { url: new URL('out/python-sidecar/python_sidecar/index.bundle', dir) }
  ])

  t.ok(
    read(dir, 'out/python-sidecar/python_sidecar/__init__.py').includes(
      'from .client import Client, attach'
    )
  )
  t.ok(
    read(dir, 'out/python-sidecar/python_sidecar/client.py').includes(
      'from bare_rpc import RPC, CommandRouter'
    )
  )
  t.ok(read(dir, 'out/python-sidecar/pyproject.toml').includes('"bare-rpc>=0.1.0"'))

  const bundle = Bundle.from(
    fs.readFileSync(fileURLToPath(new URL('out/python-sidecar/python_sidecar/index.bundle', dir)))
  )

  t.ok(
    [...bundle.keys()].some((key) => key.endsWith('/rpc/__server__.mjs')),
    'the rpc server is packed into the bundle'
  )
})

test('python harness package for a TypeScript entry', async (t) => {
  const dir = new URL('typescript/', fixtures)

  await build(dir, 'python-sidecar', { entry: 'core.ts' })

  const bundle = Bundle.from(
    fs.readFileSync(fileURLToPath(new URL('out/python-sidecar/python_sidecar/index.bundle', dir)))
  )

  const entry = [...bundle.keys()].find((key) => key.endsWith('/typescript/core.js'))

  t.ok(entry, 'the entry is packed into the bundle')
  t.absent(bundle.read(entry).toString().includes('interface Message'), 'the types are stripped')
})

test('python harness package named after a hyphenated directory', async (t) => {
  const dir = new URL('basic/', fixtures)

  const written = await build(dir, 'python-sidecar')

  t.alike(written.slice(0, 3), [
    { url: new URL('out/python-sidecar/python_sidecar/__init__.py', dir) },
    { url: new URL('out/python-sidecar/pyproject.toml', dir) },
    { url: new URL('out/python-sidecar/python_sidecar/index.bundle', dir) }
  ])

  const manifest = read(dir, 'out/python-sidecar/pyproject.toml')

  t.ok(manifest.includes('packages = ["python_sidecar"]'))
  t.ok(
    manifest.includes(
      'artifacts = ["python_sidecar/index.bundle", "python_sidecar/index.bundle.d"]'
    )
  )
})

test('python harness package offloads addons next to the bundle', async (t) => {
  const dir = new URL('basic/', fixtures)

  await build(dir, 'python-sidecar-offload')

  for (const host of sidecar.hosts) {
    t.ok(
      fs.existsSync(
        fileURLToPath(
          new URL(
            `out/python-sidecar-offload/python_sidecar_offload/index.bundle.d/node_modules/bare-signals/prebuilds/${host}/bare-signals.bare`,
            dir
          )
        )
      ),
      `the ${host} prebuild is offloaded into the package`
    )
  }
})

test('python harness package for a target without python support', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    build(dir, 'python-worker', { target: 'bare-worker' }),
    /Target 'bare-worker' does not support language 'python'/
  )
})

async function build(dir, name, opts = {}) {
  const { target = 'bare-sidecar', entry = 'core.js', ...rest } = opts

  const written = []

  for await (const artifact of stow(new URL(entry, dir), target, new URL(`out/${name}`, dir), {
    language: 'python',
    ...rest
  })) {
    written.push(artifact)
  }

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}
