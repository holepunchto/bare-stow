const path = require('path')
const { fileURLToPath } = require('url')

exports.name = 'javascript'

const MODULES = ['esm', 'cjs']

exports.options = function options(given = {}) {
  const { module = 'esm', ...unknown } = given

  for (const name of Object.keys(unknown)) {
    throw new Error(`Unknown option '${name}' for language 'javascript'`)
  }

  if (!MODULES.includes(module)) {
    throw new Error(`Option 'module' must be one of ${MODULES.join(', ')}, got '${module}'`)
  }

  return { module }
}

exports.layout = function layout(out) {
  const name = path.posix.basename(out.pathname)

  if (!/^[a-z0-9~-][a-z0-9._~-]*$/.test(name)) {
    throw new Error(`'${name}' is not a valid package name`)
  }

  return {
    harness: new URL('index.js', out),
    name,
    manifest: new URL('package.json', out)
  }
}

exports.sibling = function sibling(url, name) {
  return new URL(`${name}.js`, url)
}

exports.types = function types(url) {
  return new URL(path.posix.basename(url.pathname, '.js') + '.d.ts', url)
}

exports.reference = function reference(from, to) {
  if (from.protocol === 'file:' && to.protocol === 'file:') {
    const fromDir = path.dirname(fileURLToPath(from))
    const toPath = fileURLToPath(to)

    let relative = path.relative(fromDir, toPath).split(path.sep).join('/')

    if (!relative.startsWith('.')) relative = './' + relative

    return relative
  }

  return to.href
}

exports.manifest = function manifest({ name, dependencies, options }) {
  const pkg = {
    name,
    private: true,
    type: options.module === 'esm' ? 'module' : 'commonjs',
    exports: {
      '.': {
        types: './index.d.ts',
        default: './index.js'
      }
    },
    dependencies
  }

  return JSON.stringify(pkg, null, 2) + '\n'
}
