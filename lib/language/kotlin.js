const path = require('path')

exports.name = 'kotlin'

exports.options = function options(given = {}) {
  const { package: name, ...unknown } = given

  for (const option of Object.keys(unknown)) {
    throw new Error(`Unknown option '${option}' for language 'kotlin'`)
  }

  if (name === undefined) throw new Error("Option 'package' is required for language 'kotlin'")

  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(name)) {
    throw new Error(`'${name}' is not a valid Kotlin package name`)
  }

  return { package: name }
}

// The bundle is an asset of the module, under the directory of its package as
// the assets of every module of the application share one namespace.
exports.layout = function layout(out, options) {
  const dir = options.package.replace(/\./g, '/')

  return {
    harness: new URL(`src/main/kotlin/${dir}/Harness.kt`, out),
    artifacts: new URL(`src/main/assets/${dir}/`, out),
    name: options.package,
    manifest: new URL('build.gradle', out),
    addons: new URL('src/main/addons/', out)
  }
}

exports.sibling = function sibling(url, name) {
  return new URL(capitalize(name) + '.kt', url)
}

// Assets are referenced by their path within the assets of the application.
exports.reference = function reference(from, to) {
  const assets = to.pathname.lastIndexOf('/src/main/assets/')

  if (assets !== -1) return to.pathname.slice(assets + '/src/main/assets/'.length)

  return path.posix.relative(path.posix.dirname(from.pathname), to.pathname)
}

// The dependencies of Kotlin generators map Maven coordinates without a version
// to the version that the module uses. They are part of the API of the module,
// as the harness exposes their types.
exports.manifest = function manifest({ name, dependencies, addons = [] }) {
  const apis = Object.entries(dependencies).map(
    ([coordinates, version]) => `  api ${JSON.stringify(coordinates + ':' + version)}`
  )

  // Linked addons are native libraries in a directory per ABI, along with the
  // archives of any Java classes they use.
  const libraries = [
    ...new Set(
      addons
        .filter((addon) => addon.endsWith('.so'))
        .map((addon) => path.posix.dirname(path.posix.dirname(addon)))
    )
  ]

  for (const addon of addons) {
    if (addon.endsWith('.jar')) apis.push(`  api files(${JSON.stringify(addon)})`)
  }

  const sourceSets = libraries.length
    ? `

  sourceSets {
    main {
${libraries.map((dir) => `      jniLibs.directories.add(${JSON.stringify(dir)})`).join('\n')}
    }
  }`
    : ''

  return `\
plugins {
  id "com.android.library"
}

android {
  namespace = ${JSON.stringify(name)}
  compileSdk = 36

  defaultConfig {
    minSdk = 29
  }${sourceSets}
}

dependencies {
${apis.join('\n')}
}
`
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}
