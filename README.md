# bare-stow

Module bundling and harness generation for Bare. Built on top of `bare-pack` (<https://github.com/holepunchto/bare-pack>), `bare-stow` produces a bundle for a target runtime together with a small harness that boots it from the host environment.

A [CLI](#cli) is also included and provides support for stowing a module graph from the command line.

```
npm i [-g] bare-stow
```

## Usage

Given an entry module `core.js` that exports a `start` function receiving the IPC stream and an optional `ready` callback. The function may optionally return (or resolve to) a function that runs before the bundle exits:

```js
module.exports = async function start(ipc, ready) {
  ipc.on('data', (data) => {
    // Handle messages from the host.
  })

  // Optionally call `ready()` to signal readiness early. Otherwise it is
  // signaled automatically when `start()` resolves.
  ready()

  return async function stop() {
    // Clean up before the bundle exits.
  }
}
```

The `ipc` argument is a duplex byte stream. Anything written to it is delivered to the host, and `'data'` events fire when the host writes back.

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

This writes the harness to `out` and the bundle alongside it. The harness can then be required from the host and booted with `start()`. The harness awaits the worker's `ready` signal before resolving, so by the time `start()` returns the bundle is up:

```js
const harness = require('/app/out/index.js')

const { ipc } = await harness.start()

ipc.write(Buffer.from('hello from the host'))

ipc.on('exit', (code) => {
  console.log('bundle exited with', code)
})

// Request a graceful shutdown.
ipc.destroy()
```

## Protocol

The harness multiplexes a control channel and a user data channel over the underlying binary duplex stream. The `ipc` returned from `start()` is itself a duplex stream carrying the user data; control frames ride alongside it on the same handle. RPC libraries (such as `bare-rpc`) bind to `ipc` just like a raw stream.

Control frames signal lifecycle events:

| Direction      | Type        | Payload              |
| :------------- | :---------- | :------------------- |
| Worker -> Host | `ready`     | -                    |
| Worker -> Host | `exit`      | `{ code }`           |
| Worker -> Host | `error`     | `{ message, stack }` |
| Host -> Worker | `terminate` | -                    |

An incoming `error` frame destroys the local `ipc` with the carried error, surfacing it as a normal stream `error` event. Other control frames emit a regular event named after the type.

The `ipc` handle exposes the lifecycle as events and methods on the same duplex:

- `ipc.ready`: A promise that resolves once the worker has signaled ready. Rejects if the worker errors before ready.
- `ipc.on('exit', code)`: Emitted when the worker signals exit. `code` carries the exit code.
- `ipc.on('error', err)`: Emitted when the worker reports a fault, or when the underlying transport errors. Either way the `ipc` is destroyed.
- `ipc.on('close')`: Emitted when the underlying transport closes.
- `ipc.destroy()`: Standard stream destroy. Sends a `terminate` control frame to the worker and waits for the underlying transport to close.
- `ipc.terminate()`: Like `destroy()` but resolves with the worker's exit code.

The framing layer is also exported directly for embedders that bring their own transport:

```js
const protocol = require('bare-stow/protocol')

const ipc = protocol.attach(stream) // Any duplex byte stream
ipc.write(Buffer.from('payload')) // User data
ipc.send('ready') // Control frame
ipc.on('exit', () => {
  /* ... */
})
```

The host helper layers the lifecycle promise and `terminate` method on top of the protocol:

```js
const { wrap } = require('bare-stow/host')

const ipc = wrap(stream) // Any duplex byte stream
await ipc.ready
```

## API

#### `const artifacts = stow(entry, target, out[, opts])`

Bundle the module graph rooted at `entry` for a `target` runtime and write the resulting artifacts to disk at and alongside `out`. Returns an async generator that yields `{ url }` objects as each artifact is written, allowing callers to observe progress.

`entry` is a `URL` (or `URL`-coercible string) pointing at the entry module. `target` selects the target runtime, given either as a built-in name (one of `'react-native'`, `'pear-runtime'`, or `'node'`) or as a [target provider](#targets-and-rpc-providers) object. It determines the harness format, bundle extension, host triples, and whether assets and addons are linked into the bundle or offloaded as sibling files. `out` is the output `URL` of the harness; the bundle is written next to it with the target's extension.

The first artifact yielded is the harness at `out`; the second is the bundle alongside it; any further yields are offloaded assets and native addons when the target supports offloading.

Options include:

```js
opts = {
  client,
  server,
  base,
  hosts,
  resolveTarget,
  resolveRPC
}
```

- `client`: The RPC library to wire into the harness as a client, given either as a built-in name (`'bare-rpc'`) or as an [RPC provider](#targets-and-rpc-providers) object.
- `server`: The RPC library to wire into the bundle entry shim as a server, given either as a built-in name (`'bare-rpc'`) or as an [RPC provider](#targets-and-rpc-providers) object.
- `base`: The base `URL` of the module graph. Defaults to the directory containing `entry`.
- `hosts`: An array of host triples to build for. Must be a subset of the host triples supported by the target; passing a host the target does not support throws. Defaults to all host triples supported by the target.
- `resolveTarget`: A function mapping a target name to a [target provider](#targets-and-rpc-providers) object, called when `target` is a name. Defaults to the built-in target registry.
- `resolveRPC`: A function mapping an RPC library name to an [RPC provider](#targets-and-rpc-providers) object, called when `client` or `server` is a name. Defaults to the built-in RPC registry.

Any additional options are forwarded to `bare-pack`. See <https://github.com/holepunchto/bare-pack> for the full set, including `builtins`, `imports`, `defer`, and `resolve`.

### Targets and RPC providers

The harness and RPC code generators are decoupled from the bundler: `target`, `client`, and `server` each accept a provider object directly, so generators can live outside `bare-stow`. Passing a name instead resolves it through `resolveTarget` / `resolveRPC`, which default to the built-in registries.

A target provider describes the runtime profile it owns and generates the harness that boots the bundle from the host:

```js
target = {
  name, // The target's name, used in diagnostics.
  linked, // Whether assets and addons are linked into the bundle.
  offload, // Whether (and which) assets and addons are offloaded as sibling files.
  format, // The bundle encoding: 'bundle', 'bundle.cjs', 'bundle.mjs', or 'bundle.json'.
  encoding, // The string encoding for encoded formats, or null for raw bytes.
  extension, // The bundle file extension, e.g. '.bundle'.
  module, // The harness module system: 'esm' or 'cjs'.
  hosts, // The host triples the target supports.
  generate({ bundleSpecifier, ipc, rpc, client }) {
    // Return the harness source as a string.
  }
}
```

`generate()` receives `bundleSpecifier`, the relative specifier from the harness to the bundle artifact; `ipc`, the identifier the harness should bind the IPC stream to; `rpc`, the identifier the RPC client setup binds its instance to; and `client`, the pre-rendered RPC client setup as a string (referencing `ipc` and binding `rpc`) or `null` when no client is requested. The target owns `linked`, `offload`, `format`, `encoding`, and `extension`; they are not overridable through `opts`.

An RPC provider generates the setup snippet that binds an RPC instance to the IPC stream, used on both the client (harness) and server (shim) side:

```js
rpc = {
  name, // The library's name, used in diagnostics.
  generate({ ipc, rpc, module, role }) {
    // Return the setup source as a string, reading `ipc` and binding `rpc`.
  }
}
```

`generate()` receives `ipc`, the identifier of the IPC stream in scope; `rpc`, the identifier to bind the RPC instance to; `module`, the surrounding module system (`'esm'` or `'cjs'`) so the snippet can emit the matching import form; and `role`, either `'client'` or `'server'`. The bundler owns the `ipc` and `rpc` binding names and threads them to both the target and the RPC provider so neither has to assume them. It renders the client snippet in the target's `module` and the server snippet as `'esm'` (the shim is always an ES module), then hands the result to the target's `generate()` and the shim respectively.

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
