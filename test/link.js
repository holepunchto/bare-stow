const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('link writes a swift package of the addons of several graphs', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = await link(dir, 'bare-kit', 'out/link-swift/BareKitAddons', {
    language: 'swift'
  })

  t.is(written.filter(({ url }) => url.pathname.endsWith('.xcframework')).length, 1)

  t.alike(written.slice(-2), [
    { url: new URL('out/link-swift/BareKitAddons/Sources/BareKitAddons/Harness.swift', dir) },
    { url: new URL('out/link-swift/BareKitAddons/Package.swift', dir) }
  ])

  t.is(
    read(dir, 'out/link-swift/BareKitAddons/Sources/BareKitAddons/Harness.swift'),
    '@_exported import BareKit\n'
  )

  const manifest = read(dir, 'out/link-swift/BareKitAddons/Package.swift')

  t.ok(manifest.includes('.library(name: "BareKitAddons", targets: ["BareKitAddons"])'))
  t.ok(manifest.includes('.package(url: "https://github.com/holepunchto/bare-kit-swift"'))
  t.ok(
    manifest.includes(
      '.binaryTarget(name: "bare-hrtime.2.1.2", path: "Frameworks/bare-hrtime.2.1.2.xcframework")'
    )
  )
})

test('link writes a kotlin module of the addons of several graphs', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = await link(dir, 'bare-kit', 'out/link-kotlin', {
    language: 'kotlin',
    languageOptions: { package: 'to.holepunch.addons' }
  })

  for (const abi of ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']) {
    t.is(
      written.filter(
        ({ url }) =>
          url.href ===
          new URL(`out/link-kotlin/src/main/addons/${abi}/libbare-hrtime.2.1.2.so`, dir).href
      ).length,
      1
    )
  }

  t.alike(written.at(-1), { url: new URL('out/link-kotlin/build.gradle', dir) })

  const manifest = read(dir, 'out/link-kotlin/build.gradle')

  t.ok(manifest.includes('namespace = "to.holepunch.addons"'))
  t.ok(manifest.includes('api "com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin:v0.1.1"'))
  t.ok(manifest.includes('jniLibs.directories.add("src/main/addons")'))
})

test('link declares the java classes of addons for kotlin', async (t) => {
  const dir = new URL('java/', fixtures)

  const written = await drain(
    stow.link(new URL('core.js', dir), 'bare-kit', new URL('out/link-kotlin', dir), {
      language: 'kotlin',
      languageOptions: { package: 'to.holepunch.java' }
    })
  )

  const jar = new URL('out/link-kotlin/src/main/addons/bare-bluetooth-android.classes.jar', dir)

  t.is(written.filter(({ url }) => url.href === jar.href).length, 1)

  t.ok(
    read(dir, 'out/link-kotlin/build.gradle').includes(
      'api files("src/main/addons/bare-bluetooth-android.classes.jar")'
    )
  )
})

test('link for a target that does not link addons', async (t) => {
  const dir = new URL('linked/', fixtures)

  await t.exception(
    link(dir, 'bare-sidecar', 'out/link-sidecar'),
    /Target 'bare-sidecar' does not link addons/
  )
})

test('link for a target without linking for the language', async (t) => {
  const dir = new URL('linked/', fixtures)

  await t.exception(
    link(dir, appTarget({ link: false }), 'out/link-unsupported'),
    /Target 'app' does not support linking for language 'javascript'/
  )
})

test('link for a language without linked addons', async (t) => {
  const dir = new URL('linked/', fixtures)

  await t.exception(
    link(dir, appTarget(), 'out/link-javascript'),
    /Language 'javascript' does not support linked addons/
  )
})

test('stow leaves linking to the application for a target that asks for it', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = []

  for await (const artifact of stow(
    new URL('core.js', dir),
    appTarget(),
    new URL('out/app', dir)
  )) {
    written.push(artifact)
  }

  t.alike(written, [
    { url: new URL('out/app/index.js', dir) },
    { url: new URL('out/app/package.json', dir) },
    { url: new URL('out/app/index.bundle', dir) }
  ])
})

test('stow passes target options to the properties of the target', async (t) => {
  const dir = new URL('linked/', fixtures)

  const target = appTarget({
    options({ format = 'bundle', ...unknown }) {
      for (const option of Object.keys(unknown)) throw new Error(`Unknown option '${option}'`)

      return { format }
    },
    format: ({ targetOptions }) => targetOptions.format,
    extension: ({ targetOptions }) => '.' + targetOptions.format
  })

  const written = []

  for await (const artifact of stow(new URL('core.js', dir), target, new URL('out/app-mjs', dir), {
    targetOptions: { format: 'bundle.mjs' }
  })) {
    written.push(artifact)
  }

  t.alike(written.at(-1), { url: new URL('out/app-mjs/index.bundle.mjs', dir) })

  t.ok(read(dir, 'out/app-mjs/index.bundle.mjs').startsWith('export default '))
})

test('stow rejects target options for a target without options', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    drain(
      stow(new URL('core.js', dir), 'bare-sidecar', new URL('out/options', dir), {
        targetOptions: { format: 'bundle' }
      })
    ),
    /Unknown option 'format' for target 'bare-sidecar'/
  )
})

function appTarget(overrides = {}) {
  const { link = () => ({ source: null }), ...rest } = overrides

  return {
    name: 'app',
    isolation: 'thread',
    linked: true,
    linking: 'app',
    offload: false,
    format: 'bundle',
    encoding: null,
    extension: '.bundle',
    hosts: ['ios-arm64', 'android-arm64'],
    languages: {
      javascript: {
        generate: () => ({ source: 'export {}\n' }),
        ...(link ? { link } : {})
      }
    },
    ...rest
  }
}

function link(dir, target, out, opts = {}) {
  return drain(
    stow.link([new URL('core.js', dir), new URL('push.js', dir)], target, new URL(out, dir), opts)
  )
}

async function drain(iterator) {
  const written = []

  for await (const artifact of iterator) written.push(artifact)

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}
