const path = require('path')

exports.name = 'kotlin'

exports.options = function options(given = {}) {
  const { package: name, platform = 'android', ...unknown } = given

  for (const option of Object.keys(unknown)) {
    throw new Error(`Unknown option '${option}' for language 'kotlin'`)
  }

  if (name === undefined) throw new Error("Option 'package' is required for language 'kotlin'")

  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(name)) {
    throw new Error(`'${name}' is not a valid Kotlin package name`)
  }

  if (platform !== 'android' && platform !== 'jvm') {
    throw new Error(`Option 'platform' must be 'android' or 'jvm', got '${platform}'`)
  }

  return { package: name, platform }
}

// The bundle is an asset or resource of the module, under the directory of its
// package as those of every module of the application share one namespace. A
// JVM module can't read its resources as files, so it lists the files beside
// the bundle for the harness to extract.
exports.layout = function layout(out, options) {
  const dir = options.package.replace(/\./g, '/')

  const module = {
    harness: new URL(`src/main/kotlin/${dir}/Harness.kt`, out),
    name: options.package,
    manifest: new URL('build.gradle', out)
  }

  if (options.platform === 'jvm') {
    return { ...module, artifacts: new URL(`src/main/resources/${dir}/`, out), listing: true }
  }

  return {
    ...module,
    artifacts: new URL(`src/main/assets/${dir}/`, out),
    addons: new URL('src/main/addons/', out),
    resources: new URL('src/main/assets/', out)
  }
}

exports.sibling = function sibling(url, name) {
  return new URL(capitalize(name) + '.kt', url)
}

// Assets and resources are referenced by their path within those of the
// application.
exports.reference = function reference(from, to) {
  for (const dir of ['/src/main/assets/', '/src/main/resources/']) {
    const index = to.pathname.lastIndexOf(dir)

    if (index !== -1) return to.pathname.slice(index + dir.length)
  }

  return path.posix.relative(path.posix.dirname(from.pathname), to.pathname)
}

// The dependencies of Kotlin generators map Maven coordinates without a version
// to the version that the module uses. They are part of the API of the module,
// as the harness exposes their types.
exports.manifest = function manifest({ name, dependencies, options = {}, addons = [] }) {
  const apis = Object.entries(dependencies).map(
    ([coordinates, version]) => `  api ${JSON.stringify(coordinates + ':' + version)}`
  )

  if (options.platform === 'jvm') {
    return `\
plugins {
  id "java-library"
  id "org.jetbrains.kotlin.jvm"
}

dependencies {
${apis.join('\n')}
}
`
  }

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

  // Projects that opt out of the Kotlin support built into AGP 9, such as those
  // of Expo, need the Kotlin plugin to compile the harness.
  return `\
plugins {
  id "com.android.library"
}

if (findProperty("android.builtInKotlin") == "false") {
  apply plugin: "org.jetbrains.kotlin.android"
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
