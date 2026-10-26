const path = require('path')
const { pathToFileURL } = require('url')
const test = require('brittle')
const languages = require('../lib/language')

const fixtures = pathToFileURL(path.join(__dirname, 'fixtures') + '/')

const javascript = languages('javascript')
const kotlin = languages('kotlin')
const python = languages('python')
const swift = languages('swift')

test('language javascript defaults to esm', (t) => {
  t.alike(javascript.options(), { module: 'esm' })
  t.alike(javascript.options({ module: 'cjs' }), { module: 'cjs' })
})

test('language javascript rejects unknown and invalid options', (t) => {
  t.exception(() => javascript.options({ flavor: 'vanilla' }), /Unknown option 'flavor'/)
  t.exception(() => javascript.options({ module: 'amd' }), /must be one of esm, cjs/)
})

test('language javascript lays the harness out as a package', (t) => {
  t.alike(javascript.layout(new URL('file:///app/out/javascript-sidecar/')), {
    harness: new URL('file:///app/out/javascript-sidecar/index.js'),
    name: 'javascript-sidecar',
    manifest: new URL('file:///app/out/javascript-sidecar/package.json')
  })
})

test('language javascript rejects an output that is not a valid package name', (t) => {
  t.exception(
    () => javascript.layout(new URL('file:///app/out/Javascript-Sidecar/')),
    /not a valid package name/
  )
})

test('language javascript names siblings and type declarations as modules', (t) => {
  t.is(
    javascript.sibling(new URL('file:///app/core/index.js'), 'client').href,
    'file:///app/core/client.js'
  )
  t.is(javascript.types(new URL('file:///app/core/client.js')).href, 'file:///app/core/client.d.ts')
})

test('language javascript references siblings relatively', (t) => {
  t.is(
    javascript.reference(
      new URL('basic/out/javascript-sidecar/index.js', fixtures),
      new URL('basic/out/javascript-sidecar/index.bundle', fixtures)
    ),
    './index.bundle'
  )
  t.is(
    javascript.reference(
      new URL('basic/out/javascript-sidecar/index.js', fixtures),
      new URL('basic/core.js', fixtures)
    ),
    '../../core.js'
  )
})

test('language javascript writes the dependencies and module system into the manifest', (t) => {
  t.snapshot(
    javascript.manifest({
      name: 'core',
      dependencies: { 'bare-sidecar': '^0.5.12', 'bare-stow-host': '^0.1.0' },
      options: { module: 'esm' },
      artifacts: ['./index.bundle', './index.bundle.d']
    })
  )
})

test('language python lays the harness out as a package', (t) => {
  t.alike(python.layout(new URL('file:///app/out/python-sidecar/')), {
    harness: new URL('file:///app/out/python-sidecar/python_sidecar/__init__.py'),
    name: 'python_sidecar',
    manifest: new URL('file:///app/out/python-sidecar/pyproject.toml')
  })
})

test('language python rejects an output that is not a valid package name', (t) => {
  t.exception(
    () => python.layout(new URL('file:///app/out/python-sidecar!/')),
    /not a valid Python package name/
  )
})

test('language python names siblings as modules', (t) => {
  t.is(
    python.sibling(new URL('file:///app/core/__init__.py'), 'client').href,
    'file:///app/core/client.py'
  )
})

test('language python references modules as relative imports and files as paths', (t) => {
  const harness = new URL('file:///app/core/__init__.py')

  t.is(python.reference(harness, new URL('file:///app/core/client.py')), '.client')
  t.is(python.reference(harness, new URL('file:///app/core/index.bundle')), 'index.bundle')
  t.is(
    python.reference(
      new URL('file:///app/pyproject.toml'),
      new URL('file:///app/core/index.bundle')
    ),
    'core/index.bundle'
  )
})

test('language python writes the dependencies and bundle into the manifest', (t) => {
  t.snapshot(
    python.manifest({
      name: 'core',
      dependencies: { 'bare-sidecar': '>=0.1.0', 'bare-rpc': '>=0.1.0' },
      artifacts: ['core/index.bundle', 'core/index.bundle.d']
    })
  )
})

test('language swift lays the harness out as a package', (t) => {
  t.alike(swift.layout(new URL('file:///app/out/swift-sidecar/')), {
    harness: new URL('file:///app/out/swift-sidecar/Sources/SwiftSidecar/Harness.swift'),
    name: 'SwiftSidecar',
    manifest: new URL('file:///app/out/swift-sidecar/Package.swift'),
    addons: new URL('file:///app/out/swift-sidecar/Frameworks/')
  })
})

test('language swift rejects an output that is not a valid module name', (t) => {
  t.exception(
    () => swift.layout(new URL('file:///app/out/swift-sidecar!/')),
    /not a valid Swift module name/
  )
})

test('language swift names siblings as source files', (t) => {
  t.is(
    swift.sibling(new URL('file:///app/Sources/Core/Harness.swift'), 'client').href,
    'file:///app/Sources/Core/Client.swift'
  )
})

test('language swift references files relative to the module', (t) => {
  const harness = new URL('file:///app/Sources/Core/Harness.swift')

  t.is(swift.reference(harness, new URL('file:///app/Sources/Core/index.bundle')), 'index.bundle')
  t.is(
    swift.reference(
      new URL('file:///app/Package.swift'),
      new URL('file:///app/Sources/Core/index.bundle')
    ),
    'Sources/Core/index.bundle'
  )
})

test('language swift writes the dependencies and resources into the manifest', (t) => {
  t.snapshot(
    swift.manifest({
      name: 'Core',
      dependencies: {
        'bare-sidecar-swift': {
          url: 'https://github.com/holepunchto/bare-sidecar-swift',
          from: '0.1.0',
          products: ['BareSidecar']
        }
      },
      hosts: ['darwin-arm64', 'linux-x64'],
      artifacts: ['Sources/Core/index.bundle', 'Sources/Core/index.bundle.d']
    })
  )
})

test('language swift declares the platforms of the hosts in the manifest', (t) => {
  const manifest = (hosts) =>
    swift.manifest({ name: 'Core', dependencies: {}, hosts, artifacts: [] })

  t.ok(manifest(['darwin-arm64', 'ios-arm64']).includes('platforms: [.macOS(.v13), .iOS(.v15)]'))
  t.ok(manifest(['ios-arm64-simulator']).includes('platforms: [.iOS(.v15)]'))
  t.ok(manifest(['linux-x64']).includes('platforms: []'))
})

test('language kotlin requires a package', (t) => {
  t.exception(() => kotlin.options(), /Option 'package' is required/)
  t.exception(() => kotlin.options({ package: 'Com.Example' }), /not a valid Kotlin package name/)
  t.exception(
    () => kotlin.options({ package: 'com.example', flavor: 'x' }),
    /Unknown option 'flavor'/
  )
  t.alike(kotlin.options({ package: 'com.example.core' }), { package: 'com.example.core' })
})

test('language kotlin lays the harness out as a module', (t) => {
  t.alike(kotlin.layout(new URL('file:///app/core/'), { package: 'com.example.core' }), {
    harness: new URL('file:///app/core/src/main/kotlin/com/example/core/Harness.kt'),
    artifacts: new URL('file:///app/core/src/main/assets/com/example/core/'),
    name: 'com.example.core',
    manifest: new URL('file:///app/core/build.gradle'),
    addons: new URL('file:///app/core/src/main/addons/')
  })
})

test('language kotlin names siblings as source files', (t) => {
  t.is(
    kotlin.sibling(new URL('file:///app/core/src/main/kotlin/Harness.kt'), 'client').href,
    'file:///app/core/src/main/kotlin/Client.kt'
  )
})

test('language kotlin references assets by their path within the assets', (t) => {
  t.is(
    kotlin.reference(
      new URL('file:///app/core/src/main/kotlin/com/example/core/Harness.kt'),
      new URL('file:///app/core/src/main/assets/com/example/core/index.bundle')
    ),
    'com/example/core/index.bundle'
  )
})

test('language kotlin writes the dependencies into the manifest', (t) => {
  t.snapshot(
    kotlin.manifest({
      name: 'com.example.core',
      dependencies: { 'com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin': 'v0.1.0' },
      hosts: ['android-arm64'],
      artifacts: ['src/main/assets/com/example/core/index.bundle']
    })
  )
})

test('language swift declares linked addons as binary targets', (t) => {
  t.snapshot(
    swift.manifest({
      name: 'Core',
      dependencies: {},
      hosts: ['ios-arm64'],
      artifacts: ['Sources/Core/index.bundle'],
      addons: [
        'Frameworks/addon.1.2.3.xcframework/Info.plist',
        'Frameworks/addon.1.2.3.xcframework'
      ]
    })
  )
})

test('language kotlin declares linked addons and their classes', (t) => {
  t.snapshot(
    kotlin.manifest({
      name: 'com.example.core',
      dependencies: {},
      hosts: ['android-arm64'],
      artifacts: ['src/main/assets/com/example/core/index.bundle'],
      addons: ['src/main/addons/arm64-v8a/libaddon.1.2.3.so', 'src/main/addons/addon.classes.jar']
    })
  )
})

test('language accepts a language provider object', (t) => {
  t.is(languages(javascript), javascript)
})

test('language resolves an unknown language through resolve', (t) => {
  t.is(
    languages('something-else', () => javascript),
    javascript
  )
})

test('language throws for unknown language', (t) => {
  t.exception(() => languages('something-else'), /Unknown language/)
})

test('language throws for an invalid language provider', (t) => {
  t.exception(() => languages({}), /options\(\) function/)
  t.exception(() => languages({ options() {} }), /layout\(\) function/)
})
