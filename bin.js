#!/usr/bin/env node
const path = require('path')
const { pathToFileURL } = require('url')
const { command, flag, arg, rest, summary } = require('paparam')
const pkg = require('./package')
const stow = require('.')

const flags = {
  target: () =>
    flag(
      '--target <name>',
      'The target runtime (bare-kit, bare-sidecar, bare-worker, or a bare-stow-target-<name> package)'
    ),
  targetOption: () => flag('--target-option <key=value>', 'An option for the target').multiple(),
  language: () =>
    flag(
      '--language <name>',
      'The language of the harness (javascript, kotlin, python, swift, or a bare-stow-language-<name> package; defaults to javascript)'
    ),
  languageOption: () =>
    flag(
      '--language-option <key=value>',
      'An option for the language, such as module=cjs for javascript'
    ).multiple(),
  server: () =>
    flag(
      '--server <name>',
      'The RPC server to include (bare-rpc, or a bare-stow-rpc-<name> package)'
    ),
  builtins: () => flag('--builtins <path>', 'A list of builtin modules'),
  imports: () => flag('--imports <path>', 'A map of global import overrides'),
  defer: () => flag('--defer <specifier>', 'A module specifier to defer resolution of').multiple(),
  host: () =>
    flag('--host <name>', 'A host triple to include (must be a subset of the target)').multiple()
}

const link = command(
  'link',
  summary('Link the addons of the module graphs of an application'),
  rest('<entry...>', 'The entry points of the module graphs'),
  flags.target(),
  flags.targetOption(),
  flags.language(),
  flags.languageOption(),
  flags.server(),
  flag('--out|-o <path>', 'The directory to write the package of linked addons to'),
  flags.builtins(),
  flags.imports(),
  flags.defer(),
  flags.host(),
  async (cmd) => {
    const entries = cmd.rest || []
    const { target, language, server, out, defer, host: hosts } = cmd.flags

    if (!target) throw new Error('--target is required')
    if (!out) throw new Error('--out is required')
    if (entries.length === 0) throw new Error('<entry...> is required')

    for await (const _ of stow.link(
      entries.map((entry) => pathToFileURL(entry)),
      target,
      pathToFileURL(out),
      {
        ...common(cmd.flags),
        language,
        server,
        hosts,
        defer
      }
    )) {
      //
    }
  }
)

const pack = command(
  'pack',
  summary('Stow a module graph as a bundle and the harness that boots it'),
  arg('<entry>', 'The entry point of the module graph'),
  flags.target(),
  flags.targetOption(),
  flags.language(),
  flags.languageOption(),
  flag(
    '--client <name>',
    'The RPC client to include (bare-rpc, or a bare-stow-rpc-<name> package)'
  ),
  flags.server(),
  flag(
    '--base <path>',
    'The base path of the bundle (defaults to the closest directory containing every bundled module)'
  ),
  flag('--out|-o <path>', 'The directory to write the harness package to'),
  flags.builtins(),
  flags.imports(),
  flags.defer(),
  flags.host(),
  async (cmd) => {
    const { entry } = cmd.args
    let { target, language, client, server, base, out, defer, host: hosts } = cmd.flags

    if (!target) throw new Error('--target is required')
    if (!out) throw new Error('--out is required')

    if (base) base = pathToFileURL(path.resolve(base) + '/')

    for await (const _ of stow(pathToFileURL(entry), target, pathToFileURL(out), {
      ...common(cmd.flags),
      language,
      client,
      server,
      base,
      hosts,
      defer
    })) {
      //
    }
  }
)

// The options shared by pack and link.
function common(flags) {
  return {
    languageOptions: keyValues('--language-option', flags.languageOption),
    targetOptions: keyValues('--target-option', flags.targetOption),
    builtins: load(flags.builtins),
    imports: load(flags.imports),
    resolveTarget,
    resolveRPC,
    resolveLanguage
  }
}

function keyValues(name, options = []) {
  const result = {}

  for (const option of options) {
    const i = option.indexOf('=')

    if (i === -1) throw new Error(`${name} must be <key>=<value>, got '${option}'`)

    result[option.slice(0, i)] = option.slice(i + 1)
  }

  return result
}

function load(file) {
  if (!file) return undefined

  const value = require(path.resolve(file))

  return 'default' in value ? value.default : value
}

// Built-in names are resolved by bare-stow itself; any other name is loaded
// from its `bare-stow-target-<name>`, `bare-stow-rpc-<name>`, or
// `bare-stow-language-<name>` package, or as a full module specifier, resolved
// from the working directory.

function resolveTarget(name) {
  return resolveProvider('bare-stow-target', name)
}

function resolveRPC(name) {
  return resolveProvider('bare-stow-rpc', name)
}

function resolveLanguage(name) {
  return resolveProvider('bare-stow-language', name)
}

function resolveProvider(prefix, name) {
  for (const specifier of [`${prefix}-${name}`, name]) {
    try {
      return require(require.resolve(specifier, { paths: [process.cwd()] }))
    } catch {
      continue
    }
  }

  throw new Error(`Cannot resolve '${name}'`)
}

const cmd = command(
  pkg.name,
  summary(pkg.description),
  flag('--version|-v', 'Print the current version'),
  pack,
  link,
  ({ flags }) => {
    if (flags.version) console.log(`v${pkg.version}`)
    else console.log(cmd.help())
  }
)

cmd.parse()
