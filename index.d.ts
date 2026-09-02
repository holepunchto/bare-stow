import URL from 'bare-url'
import { PackOptions } from 'bare-pack'

/** A single generated source artifact, such as a harness or a type declaration. */
interface Artifact {
  /**
   * The file extension the artifact should be written with alongside the primary output, or unset
   * to write it to the primary output path itself.
   */
  extension?: string
  /** The artifact's source text. */
  source: string
}

type TargetName = 'bare-sidecar' | 'bare-worker'

/**
 * The context passed to a target's `generate()`, describing the bundle to embed and the RPC wiring
 * to splice in.
 */
interface TargetContext {
  /** The module specifier the harness uses to load the bundle, relative to the harness itself. */
  bundleSpecifier: string
  /** The identifier bound to the IPC stream in generated harness code. */
  ipc: string
  /** The identifier bound to the RPC client/server in generated harness code. */
  rpc: string
  /** The module system the harness is generated in, `'esm'` or `'cjs'`. */
  module: 'esm' | 'cjs'
  /**
   * The resolved client RPC wiring to splice into the harness, or `null` when no client RPC was
   * requested.
   */
  client: RPCClient | null
}

/**
 * A bundling target, such as `bare-sidecar` or `bare-worker`, describing how to package and boot a
 * bundle on a given host runtime.
 */
interface Target {
  /** The target's name. */
  name: string
  /** Whether the bundle links against its dependencies rather than inlining them. */
  linked: boolean
  /**
   * Whether native addons and/or assets are written out as sibling files instead of being inlined
   * into the bundle.
   */
  offload: boolean | { addons?: boolean; assets?: boolean }
  /** The encoding format of the written bundle artifact. */
  format: 'bundle' | 'bundle.cjs' | 'bundle.mjs' | 'bundle.json'
  /**
   * The text encoding used when the bundle format wraps the bundle as a string, or `null` when the
   * bundle is written as raw bytes.
   */
  encoding: string | null
  /** The file extension used for the target's harness artifact. */
  extension: string
  /**
   * The module system the harness is generated in, `'esm'` or `'cjs'`. When unset, it follows the
   * output path's extension or nearest `package.json` `type`.
   */
  module?: 'esm' | 'cjs'
  /** The host triples the target supports. */
  hosts: string[]
  /**
   * Generate the harness artifacts for `context`.
   * @param context - The target context describing the bundle to embed and the RPC wiring to splice
   * in.
   */
  generate(context: TargetContext): Artifact[]
}

type RPCName = 'bare-rpc'

/** The context passed to an RPC adapter's `generate()`. */
interface RPCContext {
  /** The identifier bound to the IPC stream in generated code. */
  ipc: string
  /** The identifier bound to the RPC client/server in generated code. */
  rpc: string
  /** The module system the generated code targets, `'esm'` or `'cjs'`. */
  module: 'esm' | 'cjs'
  /**
   * Whether the generated wiring is for the `'client'` (harness side) or `'server'` (bundle entry
   * shim side).
   */
  role: 'client' | 'server'
}

/**
 * An RPC library adapter that generates the wiring code spliced into a stowed bundle's harness or
 * entry shim.
 */
interface RPC {
  /** The RPC adapter's name. */
  name: string
  /**
   * Generate the RPC wiring artifacts for `context`.
   * @param context - The RPC context describing the identifiers, module system, and role to
   * generate wiring for.
   */
  generate(context: RPCContext): Artifact[]
}

/**
 * The resolved client RPC wiring, carrying both the runtime source to splice into the harness and
 * the type declaration to splice into the harness's `.d.ts`.
 */
interface RPCClient {
  /** The generated runtime source for the client RPC wiring. */
  source: string
  /** The generated type declaration for the client RPC wiring. */
  type: string
}

/** Options for `stow()`. */
interface StowOptions extends Omit<PackOptions, 'offload' | 'linked' | 'resolve' | 'aliases'> {
  /** The RPC library (or its name) to wire into the harness. */
  client?: RPC | RPCName
  /** The RPC library (or its name) to wire into the bundle's entry shim. */
  server?: RPC | RPCName
  /**
   * Resolve a target name to a `Target`, overriding the default target resolution.
   * @param name - The target name to resolve to a `Target`.
   */
  resolveTarget?(name: string): Target
  /**
   * Resolve an RPC name to an `RPC`, overriding the default RPC resolution.
   * @param name - The RPC name to resolve to an `RPC`.
   */
  resolveRPC?(name: string): RPC
}

/** An artifact written by `stow()`, yielded once its file has been written. */
interface StowArtifact {
  /** The file URL the artifact was written to. */
  url: URL
}

/**
 * Bundle the module graph rooted at `entry` for `target`, writing a harness plus bundle to `out`.
 * @param entry - The entry module to bundle, as a `file:` URL or path string.
 * @param target - The bundling target: a `Target` object, or a target name resolved to one (the
 * built-in `bare-sidecar` and `bare-worker`, or a `bare-stow-target-<name>` package).
 * @param out - The path to write the harness to, as a `file:` URL or path string; the bundle is
 * written alongside it.
 * @param opts - Options; see [`StowOptions`](#stowoptions).
 * @returns An async generator that yields each written artifact's `url` as it is produced — the
 * harness first, then the bundle, then any offloaded addon or asset files.
 * @throws The `target` argument is missing.
 * @throws The `out` argument is missing.
 * @throws A host in `opts.hosts` is not supported by the resolved target.
 */
declare function stow(
  entry: URL | string,
  target: Target | TargetName,
  out: URL | string,
  opts?: StowOptions
): AsyncGenerator<StowArtifact>

declare namespace stow {
  export {
    type Target,
    type TargetName,
    type TargetContext,
    type RPC,
    type RPCName,
    type RPCContext,
    type RPCClient,
    type Artifact,
    type StowOptions,
    type StowArtifact
  }
}

export = stow
