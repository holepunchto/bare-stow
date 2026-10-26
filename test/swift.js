const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const stow = require('..')
const sidecar = require('../lib/target/bare-sidecar')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('swift harness package for a bundle without rpc', async (t) => {
  const dir = new URL('echo/', fixtures)

  const written = await build(dir, 'swift-sidecar')

  t.alike(written, [
    { url: new URL('out/swift-sidecar/Sources/SwiftSidecar/Harness.swift', dir) },
    { url: new URL('out/swift-sidecar/Package.swift', dir) },
    { url: new URL('out/swift-sidecar/Sources/SwiftSidecar/index.bundle', dir) },
    ...sidecar.hosts.map((host) => ({
      url: new URL(
        `out/swift-sidecar/Sources/SwiftSidecar/index.bundle.d/node_modules/bare-signals/prebuilds/${host}/bare-signals.bare`,
        dir
      )
    }))
  ])

  const harness = read(dir, 'out/swift-sidecar/Sources/SwiftSidecar/Harness.swift')

  t.ok(harness.includes('Bundle.module.url(forResource: "index.bundle", withExtension: nil)'))
  t.absent(harness.includes('attach(ipc)'))

  const manifest = read(dir, 'out/swift-sidecar/Package.swift')

  t.ok(manifest.includes('name: "SwiftSidecar"'))
  t.ok(manifest.includes('.product(name: "BareSidecar", package: "bare-sidecar-swift")'))
  t.ok(manifest.includes('.product(name: "BareStowHost", package: "bare-stow-host-swift")'))
  t.absent(manifest.includes('bare-rpc-swift'))
  t.ok(manifest.includes('resources: [.copy("index.bundle"), .copy("index.bundle.d")]'))
})

test('swift harness package for a bundle with rpc', async (t) => {
  const dir = new URL('rpc/', fixtures)

  const written = await build(dir, 'swift-sidecar', { client: 'bare-rpc', server: 'bare-rpc' })

  t.alike(written.slice(0, 4), [
    { url: new URL('out/swift-sidecar/Sources/SwiftSidecar/Harness.swift', dir) },
    { url: new URL('out/swift-sidecar/Sources/SwiftSidecar/Client.swift', dir) },
    { url: new URL('out/swift-sidecar/Package.swift', dir) },
    { url: new URL('out/swift-sidecar/Sources/SwiftSidecar/index.bundle', dir) }
  ])

  t.ok(
    read(dir, 'out/swift-sidecar/Sources/SwiftSidecar/Harness.swift').includes(
      'let rpc = attach(ipc)'
    )
  )
  t.ok(read(dir, 'out/swift-sidecar/Sources/SwiftSidecar/Client.swift').includes('import BareRPC'))

  const manifest = read(dir, 'out/swift-sidecar/Package.swift')

  t.ok(
    manifest.includes(
      '.package(url: "https://github.com/holepunchto/bare-rpc-swift", from: "1.1.0")'
    )
  )
  t.ok(manifest.includes('.product(name: "BareRPC", package: "bare-rpc-swift")'))
})

test('swift harness package declares each dependency once', async (t) => {
  const dir = new URL('rpc/', fixtures)

  await build(dir, 'swift-sidecar-dependencies', { client: 'bare-rpc', server: 'bare-rpc' })

  const manifest = read(dir, 'out/swift-sidecar-dependencies/Package.swift')

  t.is(
    manifest.split('.package(url: "https://github.com/holepunchto/bare-stow-host-swift"').length,
    2
  )
})

test('swift harness package for a bundle on bare-kit', async (t) => {
  const dir = new URL('echo/', fixtures)

  const written = await build(dir, 'swift-kit', { target: 'bare-kit' })

  t.alike(written, [
    { url: new URL('out/swift-kit/Sources/SwiftKit/Harness.swift', dir) },
    { url: new URL('out/swift-kit/Package.swift', dir) },
    { url: new URL('out/swift-kit/Sources/SwiftKit/index.bundle', dir) }
  ])

  t.ok(read(dir, 'out/swift-kit/Sources/SwiftKit/Harness.swift').includes('import BareKit'))

  const manifest = read(dir, 'out/swift-kit/Package.swift')

  t.ok(manifest.includes('platforms: [.macOS(.v13), .iOS(.v15)]'))
  t.ok(manifest.includes('.product(name: "BareKit", package: "bare-kit-swift")'))
  t.ok(manifest.includes('resources: [.copy("index.bundle")]'))
})

test('swift harness package links the addons of a bundle on bare-kit', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = await build(dir, 'swift-kit', { target: 'bare-kit' })

  t.ok(
    written.some(
      ({ url }) =>
        url.href === new URL('out/swift-kit/Frameworks/bare-hrtime.2.1.2.xcframework', dir).href
    )
  )

  const manifest = read(dir, 'out/swift-kit/Package.swift')

  t.ok(manifest.includes('        "bare-hrtime.2.1.2",'))
  t.ok(
    manifest.includes(
      '.binaryTarget(name: "bare-hrtime.2.1.2", path: "Frameworks/bare-hrtime.2.1.2.xcframework")'
    )
  )
})

test('swift harness package links the addons imported by the shim', async (t) => {
  const dir = new URL('echo/', fixtures)

  const server = {
    name: 'linked-server',
    languages: {
      javascript: {
        generate: () => ({
          source: "import 'bare-hrtime'\n\nexport function attach(ipc) {\n  return ipc\n}\n"
        })
      }
    }
  }

  await build(dir, 'swift-kit-server', { target: 'bare-kit', server })

  t.ok(
    read(dir, 'out/swift-kit-server/Package.swift').includes(
      '.binaryTarget(name: "bare-hrtime.2.1.2", path: "Frameworks/bare-hrtime.2.1.2.xcframework")'
    )
  )
})

test('swift harness package does not link addons resolved as builtins', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = await build(dir, 'swift-kit-builtins', {
    target: 'bare-kit',
    builtins: ['bare-hrtime']
  })

  t.absent(written.some(({ url }) => url.href.includes('/Frameworks/')))
  t.absent(read(dir, 'out/swift-kit-builtins/Package.swift').includes('.binaryTarget('))
})

test('swift harness package for a host of another language', async (t) => {
  const dir = new URL('echo/', fixtures)

  await t.exception(
    build(dir, 'swift-kit-android', { target: 'bare-kit', hosts: ['android-arm64'] }),
    /Host 'android-arm64' is not supported by target 'bare-kit'/
  )
})

test('swift harness package for a target without swift support', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    build(dir, 'swift-worker', { target: 'bare-worker' }),
    /Target 'bare-worker' does not support language 'swift'/
  )
})

async function build(dir, name, opts = {}) {
  const { target = 'bare-sidecar', ...rest } = opts

  const written = []

  for await (const artifact of stow(new URL('core.js', dir), target, new URL(`out/${name}`, dir), {
    language: 'swift',
    ...rest
  })) {
    written.push(artifact)
  }

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}
