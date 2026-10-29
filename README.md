# bare-stow

Module bundling and harness generation for Bare. `bare-stow` packs a module graph into a bundle with <https://github.com/holepunchto/bare-pack> and generates a harness package that boots the bundle from a host application.

```
npm i [-g] bare-stow
```

## Usage

The entry module exports a `start()` function that receives the IPC stream and an optional `ready` callback. It may return a function to run before the bundle exits:

```js
module.exports = async function start(ipc, ready) {
  ipc.on('data', (data) => {
    // Handle messages from the host.
  })

  // Signal readiness early. Otherwise, it's signaled when `start()` resolves.
  ready()

  return async function stop() {
    // Clean up before the bundle exits.
  }
}
```

Stow it for a target:

```js
const stow = require('bare-stow')

const entry = 'file:///app/core.js'
const out = 'file:///app/core-harness/'

for await (const artifact of stow(entry, 'bare-sidecar', out)) {
  console.log(artifact.url.href)
}
```

Or from the command line:

```console
$ bare-stow pack --target bare-sidecar --out ./core-harness ./core.js
```

This writes a package to `out` with the harness, the bundle, and a manifest declaring the dependencies of the harness. Add the package as a dependency of the host and boot the bundle with `start()`, which resolves once the bundle is ready:

```js
import * as harness from 'core-harness'

const { ipc } = await harness.start()

ipc.write(Buffer.from('hello from the host'))

ipc.on('exit', (code) => {
  console.log('bundle exited with', code)
})

// Request a graceful shutdown.
ipc.destroy()
```

The bundle imports `bare-stow-runtime`, and the RPC library if a `server` is requested, so the package containing the entry must depend on them.

`start()` accepts `timeout`, how long to wait in milliseconds for the bundle to signal ready, and `grace`, how long a terminating bundle gets to run `stop()` and exit before it's killed. `timeout` defaults to waiting indefinitely and `grace` to 5 seconds. On Windows, a sidecar is killed along with its host, so `stop()` only runs when the host terminates it.

## Targets

- `bare-sidecar` runs the bundle in a separate process using <https://github.com/holepunchto/bare-sidecar>. `start()` also accepts the options of `bare-sidecar`.
- `bare-worker` runs the bundle in a thread of a Bare host using <https://github.com/holepunchto/bare-worker>.
- `bare-kit` runs the bundle in a worklet using <https://github.com/holepunchto/bare-kit>, with the `swift` language on macOS and iOS and the `kotlin` language on Android. `start()` also accepts the options of the worklet and returns it alongside `ipc`. Native addons are linked with <https://github.com/holepunchto/bare-link> and declared in the manifest, and assets are written next to the bundle. With the `linking` option set to `'app'`, both are left to `link()` instead.

## Linking

A target may leave addons and assets to the application, so that bundles sharing them don't each bring a copy. `link()` then links those of all bundles once, into a package the application depends on:

```js
const entries = [new URL('file:///app/core.js'), new URL('file:///app/push.js')]
const out = new URL('file:///app/ios/BareKitAddons/')

for await (const artifact of stow.link(entries, 'bare-kit', out, { language: 'swift' })) {
  console.log(artifact.url.href)
}
```

The language lays out the package and the target adds what loads the addons. For `bare-kit`, that's `bare-kit-swift` or `bare-kit-kotlin`. The assets go in a folder named by `stow.resources`, which a Swift application copies into its bundle. `link()` takes the same options as `stow()`.

## Languages

The harness is generated in one of these languages, selected with `language` and configured with `languageOptions`:

- `javascript` writes an npm package. The `module` option is either `'esm'`, the default, or `'cjs'`.
- `kotlin` writes an Android library module. The `package` option names the package of the generated code and is required. The dependencies are published to JitPack (<https://jitpack.io>), so add it to the repositories of the application.
- `python` writes a Python package.
- `swift` writes a Swift package.

For example, with an RPC client and server:

```console
$ bare-stow pack --target bare-sidecar --language python --client bare-rpc --server bare-rpc --out ./my-core ./core.js
```

```python
import my_core


async def on_greet(req):
    await req.reply(b"hello")


ipc, rpc = await my_core.start(handlers=lambda router: router.on_request(2, on_greet))

await rpc.request(1, b"ping")
await ipc.terminate()
```

With an RPC client, `start()` takes the handlers for the requests and events of the bundle, so that they are registered before the bundle can send any.

## Protocol

The harness and the bundle multiplex a control channel and the user data over a single duplex stream. The `ipc` returned from `start()` is a duplex stream of the user data, so RPC libraries such as `bare-rpc` bind to it like any other stream. Embedders bringing their own transport can use the protocol directly:

- <https://github.com/holepunchto/bare-stow-protocol> implements the framing.
- <https://github.com/holepunchto/bare-stow-host> implements the host side and documents `ipc`.
- <https://github.com/holepunchto/bare-stow-runtime> implements the bundle side.

## Providers

Languages, targets, and RPC libraries are providers that may live outside `bare-stow`. `stow()` and `link()` accept a provider object in place of a name, and names are resolved through `resolveLanguage`, `resolveTarget`, and `resolveRPC`. Targets and RPC libraries generate code for each language they list under `languages`, and providers without an entry for the language of the harness are rejected. Targets may also take options, given as `targetOptions`. The server side of an RPC library is always generated as JavaScript, as the bundle runs in Bare. See `index.d.ts` for the interfaces.

## CLI

#### `bare-stow pack [flags] <entry>`

Stow the module graph rooted at `<entry>` into the directory given by `--out`.

```console
--target <name>
--target-option <key=value>
--language <name>
--language-option <key=value>
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

#### `bare-stow link [flags] <entry...>`

Link the addons and assets of the module graphs rooted at each `<entry>` into the package given by `--out`.

```console
--target <name>
--target-option <key=value>
--language <name>
--language-option <key=value>
--server <name>
--out|-o <path>
--builtins <path>
--imports <path>
--defer <specifier>
--host <name>
--help|-h
```

`--target`, `--language`, `--client`, and `--server` take a built-in name, the name of a `bare-stow-target-<name>`, `bare-stow-language-<name>`, or `bare-stow-rpc-<name>` package, or a module specifier, resolved from the working directory. `--target-option`, `--language-option`, `--defer`, and `--host` may be passed multiple times. `--host` must name hosts the target supports, and defaults to all of them.

`--builtins` and `--imports` are paths to JavaScript or JSON files exporting a list of builtin modules and a map of import overrides, which are forwarded to `bare-pack`.

## License

Apache-2.0
