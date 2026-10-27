const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const Bundle = require('bare-bundle')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('stow writes the assets of a linked bundle next to it', async (t) => {
  const dir = new URL('assets/', fixtures)

  const written = await drain(
    stow(new URL('core.js', dir), 'bare-kit', new URL('out/swift-kit', dir), { language: 'swift' })
  )

  t.alike(written.slice(-3), [
    { url: new URL('out/swift-kit/Sources/SwiftKit/index.bundle', dir) },
    { url: new URL('out/swift-kit/Sources/SwiftKit/index/greeting.txt', dir) },
    { url: new URL('out/swift-kit/Sources/SwiftKit/index.assets', dir) }
  ])

  t.is(read(dir, 'out/swift-kit/Sources/SwiftKit/index.assets'), '/greeting.txt\n')

  t.ok(
    read(dir, 'out/swift-kit/Package.swift').includes(
      'resources: [.copy("index.bundle"), .copy("index"), .copy("index.assets")]'
    )
  )

  const bundle = bundleAt(dir, 'out/swift-kit/Sources/SwiftKit/index.bundle')

  t.is(bundle.assets.length, 0)
  t.ok(resolutions(bundle).includes('/../index/greeting.txt'))
})

test('stow writes the assets of a linked bundle as assets for kotlin', async (t) => {
  const dir = new URL('assets/', fixtures)

  const written = await drain(
    stow(new URL('core.js', dir), 'bare-kit', new URL('out/kotlin-kit', dir), {
      language: 'kotlin',
      languageOptions: { package: 'to.holepunch.assets' }
    })
  )

  t.alike(written.slice(-2), [
    { url: new URL('out/kotlin-kit/src/main/assets/to/holepunch/assets/index/greeting.txt', dir) },
    { url: new URL('out/kotlin-kit/src/main/assets/to/holepunch/assets/index.assets', dir) }
  ])

  t.ok(
    read(dir, 'out/kotlin-kit/src/main/kotlin/to/holepunch/assets/Harness.kt').includes(
      'worklet.start("to/holepunch/assets/index.bundle")'
    )
  )
})

test('stow leaves the assets of a linked bundle to the application', async (t) => {
  const dir = new URL('assets/', fixtures)

  const written = await drain(
    stow(new URL('core.js', dir), 'bare-kit', new URL('out/swift-kit-app', dir), {
      language: 'swift',
      targetOptions: { linking: 'app' }
    })
  )

  t.alike(written.at(-1), {
    url: new URL('out/swift-kit-app/Sources/SwiftKitApp/index.bundle', dir)
  })

  t.ok(
    read(dir, 'out/swift-kit-app/Sources/SwiftKitApp/Harness.swift').includes(
      'try worklet.start("bare-stow.bundle", source: Data(contentsOf: bundle))'
    )
  )

  const bundle = bundleAt(dir, 'out/swift-kit-app/Sources/SwiftKitApp/index.bundle')

  t.is(bundle.assets.length, 0)
  t.ok(resolutions(bundle).includes('/../bare-stow/greeting.txt'))
})

test('link writes the assets of several graphs once', async (t) => {
  const dir = new URL('assets/', fixtures)

  const written = await drain(
    stow.link(
      [new URL('core.js', dir), new URL('push.js', dir)],
      'bare-kit',
      new URL('out/link-swift/BareKitAddons', dir),
      { language: 'swift' }
    )
  )

  t.alike(written.slice(0, 3), [
    { url: new URL('out/link-swift/BareKitAddons/bare-stow/dir/other.txt', dir) },
    { url: new URL('out/link-swift/BareKitAddons/bare-stow/greeting.txt', dir) },
    { url: new URL('out/link-swift/BareKitAddons/bare-stow.assets', dir) }
  ])

  t.is(
    read(dir, 'out/link-swift/BareKitAddons/bare-stow.assets'),
    '/dir/other.txt\n/greeting.txt\n'
  )
})

test('link writes the assets of several graphs as assets for kotlin', async (t) => {
  const dir = new URL('assets/', fixtures)

  const written = await drain(
    stow.link(
      [new URL('core.js', dir), new URL('push.js', dir)],
      'bare-kit',
      new URL('out/link-kotlin', dir),
      { language: 'kotlin', languageOptions: { package: 'to.holepunch.addons' } }
    )
  )

  t.ok(
    written.some(
      ({ url }) =>
        url.href === new URL('out/link-kotlin/src/main/assets/bare-stow/greeting.txt', dir).href
    )
  )
  t.ok(
    written.some(
      ({ url }) =>
        url.href === new URL('out/link-kotlin/src/main/assets/bare-stow.assets', dir).href
    )
  )
})

async function drain(iterator) {
  const written = []

  for await (const artifact of iterator) written.push(artifact)

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}

function bundleAt(dir, file) {
  return Bundle.from(fs.readFileSync(fileURLToPath(new URL(file, dir))))
}

function resolutions(bundle) {
  return JSON.stringify(bundle.resolutions)
}
