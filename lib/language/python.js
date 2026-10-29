const path = require('path')

exports.name = 'python'

exports.options = function options(given = {}) {
  for (const name of Object.keys(given)) {
    throw new Error(`Unknown option '${name}' for language 'python'`)
  }

  return {}
}

exports.layout = function layout(out) {
  const name = path.posix.basename(out.pathname).replace(/-/g, '_')

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`'${name}' is not a valid Python package name`)
  }

  return {
    harness: new URL(`${name}/__init__.py`, out),
    name,
    manifest: new URL('pyproject.toml', out)
  }
}

exports.sibling = function sibling(url, name) {
  return new URL(`${name}.py`, url)
}

exports.reference = function reference(from, to) {
  const relative = path.posix.relative(path.posix.dirname(from.pathname), to.pathname)

  if (relative.endsWith('.py') && !relative.includes('/')) {
    return '.' + path.posix.basename(relative, '.py')
  }

  return relative
}

exports.manifest = function manifest({ name, dependencies, artifacts }) {
  const requirements = Object.entries(dependencies).map(
    ([dependency, version]) => `  ${JSON.stringify(dependency + version)},`
  )

  // The bundle is listed as an artifact so that it is included in the wheel
  // even when ignored by version control.
  return `\
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = ${JSON.stringify(name)}
version = "0.0.0"
requires-python = ">=3.10"
dependencies = [
${requirements.join('\n')}
]

[tool.hatch.build.targets.wheel]
packages = [${JSON.stringify(name)}]
artifacts = [${artifacts.map((artifact) => JSON.stringify(artifact)).join(', ')}]
`
}
