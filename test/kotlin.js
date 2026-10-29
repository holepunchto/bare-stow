const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const test = require('brittle')
const stow = require('..')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

test('kotlin harness module for a bundle on bare-kit', async (t) => {
  const dir = new URL('echo/', fixtures)

  const written = await build(dir, 'kotlin-kit')

  t.alike(written, [
    { url: new URL('out/kotlin-kit/src/main/kotlin/to/holepunch/echo/Harness.kt', dir) },
    { url: new URL('out/kotlin-kit/build.gradle', dir) },
    { url: new URL('out/kotlin-kit/src/main/assets/to/holepunch/echo/index.bundle', dir) }
  ])

  const harness = read(dir, 'out/kotlin-kit/src/main/kotlin/to/holepunch/echo/Harness.kt')

  t.ok(harness.startsWith('package to.holepunch.echo\n'))
  t.ok(harness.includes('worklet.start("to/holepunch/echo/index.bundle")'))

  const manifest = read(dir, 'out/kotlin-kit/build.gradle')

  t.ok(manifest.includes('namespace = "to.holepunch.echo"'))
  t.ok(manifest.includes('api "com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin:v0.1.1"'))
})

test('kotlin harness module links the addons of a bundle on bare-kit', async (t) => {
  const dir = new URL('linked/', fixtures)

  const written = await build(dir, 'kotlin-kit')

  for (const abi of ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']) {
    t.ok(
      written.some(
        ({ url }) =>
          url.href ===
          new URL(`out/kotlin-kit/src/main/addons/${abi}/libbare-hrtime.2.1.2.so`, dir).href
      )
    )
  }

  t.ok(
    read(dir, 'out/kotlin-kit/build.gradle').includes('jniLibs.directories.add("src/main/addons")')
  )
})

test('kotlin harness module for a target without kotlin support', async (t) => {
  const dir = new URL('basic/', fixtures)

  await t.exception(
    build(dir, 'kotlin-sidecar', { target: 'bare-sidecar' }),
    /Target 'bare-sidecar' does not support language 'kotlin'/
  )
})

test('kotlin harness module for a bundle with rpc', async (t) => {
  const dir = new URL('rpc/', fixtures)

  const written = await build(dir, 'kotlin-kit-rpc', { client: 'bare-rpc', server: 'bare-rpc' })

  t.alike(written.slice(0, 3), [
    { url: new URL('out/kotlin-kit-rpc/src/main/kotlin/to/holepunch/echo/Harness.kt', dir) },
    { url: new URL('out/kotlin-kit-rpc/src/main/kotlin/to/holepunch/echo/Client.kt', dir) },
    { url: new URL('out/kotlin-kit-rpc/build.gradle', dir) }
  ])

  t.ok(
    read(dir, 'out/kotlin-kit-rpc/src/main/kotlin/to/holepunch/echo/Harness.kt').includes(
      'val rpc = attach(ipc, handlers)'
    )
  )
  t.ok(
    read(dir, 'out/kotlin-kit-rpc/src/main/kotlin/to/holepunch/echo/Client.kt').startsWith(
      'package to.holepunch.echo\n'
    )
  )
  t.ok(
    read(dir, 'out/kotlin-kit-rpc/build.gradle').includes(
      'api "com.github.holepunchto.bare-rpc-kotlin:bare-rpc-kotlin:v0.4.0"'
    )
  )
})

async function build(dir, name, opts = {}) {
  const { target = 'bare-kit', ...rest } = opts

  const written = []

  for await (const artifact of stow(new URL('core.js', dir), target, new URL(`out/${name}`, dir), {
    language: 'kotlin',
    languageOptions: { package: 'to.holepunch.echo' },
    ...rest
  })) {
    written.push(artifact)
  }

  return written
}

function read(dir, file) {
  return fs.readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
}
