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

Stow it for the `bare-sidecar` target:

```js
const stow = require('bare-stow')

const entry = new URL('file:///app/core.js')
const out = new URL('file:///app/out/index.js')

for await (const artifact of stow(entry, 'bare-sidecar', out)) {
  console.log(artifact.url.href)
}
```

Or equivalently from the command line:

```console
$ bare-stow --target bare-sidecar --out ./out/index.js ./core.js
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

See the [full API reference](https://docs.pears.com/reference/bare/modules/bare-stow).

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

The target runtime. Required. The built-in `bare-sidecar` and `bare-worker` are resolved directly; any other `<name>` is loaded from its `bare-stow-target-<name>` package, or from `<name>` itself as a full module specifier, resolved from the working directory.

##### `--client <name>` and `--server <name>`

The RPC library to wire into the harness (`--client`) or the bundle entry shim (`--server`). The built-in `bare-rpc` is resolved directly; any other `<name>` is loaded from its `bare-stow-rpc-<name>` package, or from `<name>` itself as a full module specifier, resolved from the working directory.

##### `--builtins <path>` and `--imports <path>`

Paths to JavaScript or JSON files exporting a list of builtin module names and a map of global import overrides respectively. Forwarded to `bare-pack`.

##### `--defer <specifier>`

A module specifier whose resolution should be deferred. May be passed multiple times.

##### `--host <name>`

A host triple to build for. Must be a subset of the host triples supported by the target. May be passed multiple times. Defaults to all host triples supported by the target.

## License

Apache-2.0
