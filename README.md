# bare-stow

Module bundling and harness generation for Bare. Built on top of `bare-pack` (<https://github.com/holepunchto/bare-pack>), `bare-stow` produces a bundle for a target runtime together with a small harness that boots it from the host environment.

A [CLI](#cli) is also included and provides support for stowing a module graph from the command line.

```
npm i [-g] bare-stow
```

## Usage

Given an entry module `core.js` that exports a `start` function receiving the host IPC. The function may optionally return (or resolve to) a function that runs before the bundle exits:

```js
module.exports = async function start(ipc) {
  ipc.on('data', (data) => {
    // Handle messages from the host
  })

  return async function stop() {
    // Clean up before the bundle exits
  }
}
```

Stow it for the `node` target:

```js
const stow = require('bare-stow')

const entry = new URL('file:///app/core.js')
const out = new URL('file:///app/out/index.js')

for await (const artifact of stow(entry, 'node', out)) {
  console.log(artifact.url.href)
}
```

Or equivalently from the command line:

```console
$ bare-stow --target node --out ./out/index.js ./core.js
```

This writes the harness to `out` and the bundle alongside it. The harness can then be required from the host and booted with `start()`:

```js
const harness = require('/app/out/index.js')

const { ipc } = await harness.start()

ipc.write('hello from the host')
```

## API

#### `const artifacts = stow(entry, target, out[, opts])`

Bundle the module graph rooted at `entry` for a `target` runtime and write the resulting artifacts to disk at and alongside `out`. Returns an async generator that yields `{ url }` objects as each artifact is written, allowing callers to observe progress.

`entry` is a `URL` (or `URL`-coercible string) pointing at the entry module. `target` is the target runtime: One of `'react-native'`, `'pear-runtime'`, or `'node'`. It determines the harness format, bundle extension, host triples, and whether assets and addons are linked into the bundle or offloaded as sibling files. `out` is the output `URL` of the harness; the bundle is written next to it with the target's extension.

The first artifact yielded is the harness at `out`; the second is the bundle alongside it; any further yields are offloaded assets and native addons when the target supports offloading.

Options include:

```js
opts = {
  client,
  server,
  base,
  hosts
}
```

- `client`: Name of the RPC library to wire into the harness as a client. Currently only `'bare-rpc'` is supported.
- `server`: Name of the RPC library to wire into the bundle entry shim as a server. Currently only `'bare-rpc'` is supported.
- `base`: The base `URL` of the module graph. Defaults to the directory containing `entry`.
- `hosts`: An array of host triples to build for. Must be a subset of the host triples supported by the target; passing a host the target does not support throws. Defaults to all host triples supported by the target.

Any additional options are forwarded to `bare-pack`. See <https://github.com/holepunchto/bare-pack> for the full set, including `builtins`, `imports`, `defer`, and `resolve`.

## CLI

#### `bare-stow [flags] <entry>`

Stow the module graph rooted at `<entry>`, writing the harness and bundle to the path given by `--out`.

```console
--version|-v
--target <name>
--client <name>
--server <name>
--base <path>
--out|-o <path>
--builtins <path>
--imports <path>
--defer <specifier>
--host <name>
--help|-h
```

##### `--target <name>`

The target runtime. One of `react-native`, `pear-runtime`, or `node`. Required.

| Target         | Format       | Extension     | Linked | Offload |
| -------------- | ------------ | ------------- | ------ | ------- |
| `react-native` | `bundle.mjs` | `.bundle.mjs` | Yes    | No      |
| `pear-runtime` | `bundle`     | `.bundle`     | No     | Yes     |
| `node`         | `bundle`     | `.bundle`     | No     | Yes     |

##### `--client <name>` and `--server <name>`

The RPC library to wire into the harness (`--client`) or the bundle entry shim (`--server`). Currently only `bare-rpc` is supported.

##### `--builtins <path>` and `--imports <path>`

Paths to JavaScript or JSON files exporting a list of builtin module names and a map of global import overrides respectively. Forwarded to `bare-pack`.

##### `--defer <specifier>`

A module specifier whose resolution should be deferred. May be passed multiple times.

##### `--host <name>`

A host triple to build for. Must be a subset of the host triples supported by the target. May be passed multiple times. Defaults to all host triples supported by the target.

## License

Apache-2.0
