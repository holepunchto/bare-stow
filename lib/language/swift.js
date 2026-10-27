const path = require('path')

exports.name = 'swift'

exports.options = function options(given = {}) {
  for (const name of Object.keys(given)) {
    throw new Error(`Unknown option '${name}' for language 'swift'`)
  }

  return {}
}

exports.layout = function layout(out) {
  const name = path.posix.basename(out.pathname).split(/[-_.]/).map(capitalize).join('')

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`'${name}' is not a valid Swift module name`)
  }

  return {
    harness: new URL(`Sources/${name}/Harness.swift`, out),
    name,
    manifest: new URL('Package.swift', out),
    addons: new URL('Frameworks/', out),
    resources: out
  }
}

exports.sibling = function sibling(url, name) {
  return new URL(capitalize(name) + '.swift', url)
}

exports.reference = function reference(from, to) {
  return path.posix.relative(path.posix.dirname(from.pathname), to.pathname)
}

// The oldest versions of the Apple platforms that the Swift runtimes support.
const platforms = {
  darwin: '.macOS(.v13)',
  ios: '.iOS(.v15)'
}

// The dependencies of Swift generators map package identities to the URL, the
// minimum version, and the products of the package that the module uses.
exports.manifest = function manifest({ name, dependencies, hosts, artifacts, addons = [] }) {
  const supported = Object.entries(platforms)
    .filter(([platform]) => hosts.some((host) => host.startsWith(platform + '-')))
    .map(([, minimum]) => minimum)

  const packages = Object.values(dependencies).map(
    ({ url, from }) => `    .package(url: ${JSON.stringify(url)}, from: ${JSON.stringify(from)}),`
  )

  const products = Object.entries(dependencies).flatMap(([identity, { products }]) =>
    products.map(
      (product) =>
        `        .product(name: ${JSON.stringify(product)}, package: ${JSON.stringify(identity)}),`
    )
  )

  // Linked addons are binary targets that the module depends on.
  const frameworks = addons
    .filter((addon) => addon.endsWith('.xcframework'))
    .map((addon) => ({ name: path.posix.basename(addon, '.xcframework'), path: addon }))

  for (const framework of frameworks) products.push(`        ${JSON.stringify(framework.name)},`)

  const binaries = frameworks.map(
    (framework) =>
      `,\n    .binaryTarget(name: ${JSON.stringify(framework.name)}, path: ${JSON.stringify(framework.path)})`
  )

  // Resources are named relative to the directory of the module.
  const resources = artifacts.map(
    (artifact) => `.copy(${JSON.stringify(path.posix.relative(`Sources/${name}`, artifact))})`
  )

  return `\
// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: ${JSON.stringify(name)},
  platforms: [${supported.join(', ')}],
  products: [
    .library(name: ${JSON.stringify(name)}, targets: [${JSON.stringify(name)}])
  ],
  dependencies: [
${packages.join('\n')}
  ],
  targets: [
    .target(
      name: ${JSON.stringify(name)},
      dependencies: [
${products.join('\n')}
      ],
      resources: [${resources.join(', ')}]
    )${binaries.join('')}
  ]
)
`
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}
