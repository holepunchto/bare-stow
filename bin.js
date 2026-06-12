#!/usr/bin/env node
const path = require('path')
const { pathToFileURL } = require('url')
const { command, flag, arg, summary } = require('paparam')
const { resolve } = require('bare-module-traverse')
const pkg = require('./package')
const stow = require('.')

const cmd = command(
  pkg.name,
  summary(pkg.description),
  arg('<entry>', 'The entry point of the module graph'),
  flag('--version|-v', 'Print the current version'),
  flag(
    '--target <name>',
    'The target runtime (bare-sidecar, or a bare-stow-target-<name> package)'
  ),
  flag(
    '--client <name>',
    'The RPC client to include (bare-rpc, or a bare-stow-rpc-<name> package)'
  ),
  flag(
    '--server <name>',
    'The RPC server to include (bare-rpc, or a bare-stow-rpc-<name> package)'
  ),
  flag('--base <path>', 'The base path of the bundle'),
  flag('--out|-o <path>', 'The output path of the harness'),
  flag('--builtins <path>', 'A list of builtin modules'),
  flag('--imports <path>', 'A map of global import overrides'),
  flag('--defer <specifier>', 'A module specifier to defer resolution of').multiple(),
  flag('--host <name>', 'A host triple to include (must be a subset of the target)').multiple(),
  async (cmd) => {
    const { entry } = cmd.args
    let {
      version,
      target,
      client,
      server,
      base = '.',
      out,
      builtins,
      imports,
      defer,
      host: hosts
    } = cmd.flags

    if (version) return console.log(`v${pkg.version}`)

    if (!target) throw new Error('--target is required')
    if (!out) throw new Error('--out is required')

    if (builtins) {
      builtins = require(path.resolve(builtins))

      if ('default' in builtins) builtins = builtins.default
    }

    if (imports) {
      imports = require(path.resolve(imports))

      if ('default' in imports) imports = imports.default
    }

    base = pathToFileURL(base)

    if (!base.pathname.endsWith('/')) base.pathname += '/'

    for await (const _ of stow(pathToFileURL(entry), target, pathToFileURL(out), {
      client,
      server,
      base,
      hosts,
      resolveTarget,
      resolveRPC,
      resolve: resolve.bare,
      builtins,
      imports,
      defer
    })) {
      //
    }
  }
)

// Built-in names are resolved by bare-stow itself; any other name is loaded
// from its `bare-stow-target-<name>` / `bare-stow-rpc-<name>` package, or as a
// full module specifier, resolved from the working directory.

function resolveTarget(name) {
  return load('bare-stow-target', name)
}

function resolveRPC(name) {
  return load('bare-stow-rpc', name)
}

function load(prefix, name) {
  for (const specifier of [`${prefix}-${name}`, name]) {
    try {
      return require(require.resolve(specifier, { paths: [process.cwd()] }))
    } catch {
      continue
    }
  }

  throw new Error(`Cannot resolve '${name}'`)
}

cmd.parse()
