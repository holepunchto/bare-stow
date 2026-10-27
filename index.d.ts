import URL from 'bare-url'
import { PackOptions } from 'bare-pack'

/** The source of a generated module, together with its type declaration. */
interface Generated {
  /** The module's source text. */
  source: string
  /**
   * The module's type declaration, written next to it under the name chosen by the language, or
   * unset when the module has none.
   */
  types?: string | null
  /**
   * The packages the module imports, mapped to what the language's manifest needs to declare them,
   * such as a version range for `javascript` and `python`, a version for `kotlin`, or `{ url, from, products }` for `swift`.
   */
  dependencies?: Record<string, unknown>
}

/** Where a language writes the harness package. */
interface Layout {
  /** The harness module. */
  harness: URL
  /** The name of the package, written into the manifest. */
  name: string
  /** The package manifest declaring the dependencies of the generated modules. */
  manifest: URL
  /** The directory the bundle is written to, or unset to write it next to the harness. */
  artifacts?: URL
  /** The directory the addons of a linked target are linked into, or unset if unsupported. */
  addons?: URL
  /** The directory the assets of linked bundles are linked into, or unset if unsupported. */
  resources?: URL
}

/** The context passed to a language's `manifest()`. */
interface ManifestContext {
  /** The package name, as given by the layout. */
  name: string
  /** The packages the generated modules import, as declared by their generators. */
  dependencies: Record<string, unknown>
  /** The options resolved by the language. */
  options: LanguageOptions
  /** The host triples the bundle is packed for. */
  hosts: string[]
  /** References from the manifest to the bundle and the files written next to it. */
  artifacts: string[]
  /** References from the manifest to the resources linked for the addons of a linked target. */
  addons: string[]
}

/**
 * Options resolved by a language from those given and passed to every provider generating code in
 * that language. A target may pin some of them through `TargetLanguage.options`.
 */
type LanguageOptions = Record<string, unknown>

/** The options of the built-in `javascript` language. */
interface JavaScriptOptions {
  /**
   * The module system of the generated code, written as the `type` of the harness package. Either
   * `'esm'`, the default, or `'cjs'`.
   */
  module: 'esm' | 'cjs'
}

/** The options of the built-in `kotlin` language. */
interface KotlinOptions {
  /** The package of the generated code, such as `'com.example.core'`, which is also its namespace. */
  package: string
}

type LanguageName = 'javascript' | 'kotlin' | 'python' | 'swift'

/**
 * A host language, such as `javascript`, describing how generated modules in that language are laid
 * out, named, referenced, and declared.
 */
interface Language {
  /** The language's name, used to select its entry in a target's or RPC library's `languages`. */
  name: string
  /**
   * Resolve the options for generating code from those given.
   * @param given - The options given through `StowOptions.languageOptions`.
   * @throws An option is unknown or has an invalid value.
   */
  options(given?: LanguageOptions): LanguageOptions
  /**
   * Lay the generated files out in the package directory `out`.
   * @param out - The package directory, as a URL ending in a slash.
   * @param options - The options resolved by the language, with any pinned by the target applied.
   * @throws `out` is not valid as a package for the language.
   */
  layout(out: URL, options: LanguageOptions): Layout
  /**
   * Name a module generated alongside `url`.
   * @param url - The module the sibling is generated alongside.
   * @param name - The name of the sibling, such as `'client'`.
   */
  sibling(url: URL, name: string): URL
  /**
   * Name the type declaration of the module at `url`. Required when the language's generators
   * return separate type declarations.
   * @param url - The module to name the type declaration of.
   */
  types?(url: URL): URL
  /**
   * Render a reference from the module at `from` to the file at `to`, such as a relative specifier.
   * @param from - The referencing module.
   * @param to - The referenced file.
   */
  reference(from: URL, to: URL): string
  /**
   * Render the manifest named by the layout.
   * @param context - The manifest context describing the package to declare.
   */
  manifest(context: ManifestContext): string
}

type TargetName = 'bare-kit' | 'bare-sidecar' | 'bare-worker'

/** The context passed to a target language's `generate()`. */
interface TargetContext<O extends LanguageOptions = LanguageOptions> {
  /** A reference from the harness to the bundle. */
  bundle: string
  /**
   * A reference from the harness to the generated RPC client module, or `null` when no client was
   * requested. The module exposes `attach(ipc)`, which binds the client to the IPC handle.
   */
  client: string | null
  /**
   * The application resource holding the assets of the bundle, which is then started as
   * `<resources>.bundle`, or `null` if the assets are next to the bundle.
   */
  resources: string | null
  /** The options resolved by the language, with any pinned by the target applied. */
  options: O
}

/** The context passed to a target language's `link()`. */
interface TargetLinkContext<O extends LanguageOptions = LanguageOptions> {
  /** The options resolved by the language, with any pinned by the target applied. */
  options: O
}

/** The module and dependencies of a package of linked addons. */
interface Linked {
  /** The module's source text, written in place of the harness, or unset for none. */
  source?: string | null
  /** The packages that load the addons, declared as for `Generated.dependencies`. */
  dependencies?: Record<string, unknown>
}

/** A target's support for one host language. */
interface TargetLanguage<O extends LanguageOptions = LanguageOptions> {
  /** Options pinned over those the language would otherwise resolve. */
  options?: Partial<O>
  /**
   * Generate the harness for `context`.
   * @param context - The target context describing the bundle and RPC client to reference.
   */
  generate(context: TargetContext<O>): Generated
  /**
   * Generate the module of a package of addons for `stow.link()`, which requires it.
   * @param context - The context describing the options to generate for.
   */
  link?(context: TargetLinkContext<O>): Linked
}

/** Options resolved by a target from those given. */
type TargetOptions = Record<string, unknown>

/** The context passed to the properties of a target that are functions. */
interface TargetResolveContext<O extends LanguageOptions = LanguageOptions> {
  /** The name of the language of the harness. */
  language: string
  /** The options resolved by the language, with any pinned by the target applied. */
  options: O
  /** The options resolved by the target. */
  targetOptions: TargetOptions
}

/**
 * A property of a target, or a function resolving it from the language of the harness and the
 * options it resolved, such as hosts that differ between languages.
 */
type Resolvable<T> = T | ((context: TargetResolveContext) => T)

/**
 * A bundling target, such as `bare-sidecar` or `bare-worker`, describing how to package a bundle and
 * boot it from a host in each of the languages it supports.
 */
interface Target {
  /** The target's name. */
  name: string
  /**
   * Whether the bundle owns its `'process'` or shares one by running in a `'thread'`. Only a bundle
   * that owns its process handles signals.
   */
  isolation: Resolvable<'process' | 'thread'>
  /**
   * Whether the bundle links against its dependencies rather than inlining them. A linked bundle
   * also leaves its assets to Bare Kit.
   */
  linked: Resolvable<boolean>
  /**
   * Whether addons and assets are linked into the harness `'package'`, the default, or left to the
   * `'app'`, which links them with `stow.link()`.
   */
  linking?: Resolvable<'package' | 'app'>
  /**
   * Whether native addons and/or assets are written out as sibling files instead of being inlined
   * into the bundle.
   */
  offload: Resolvable<boolean | { addons?: boolean; assets?: boolean }>
  /** The encoding format of the written bundle artifact. */
  format: Resolvable<'bundle' | 'bundle.cjs' | 'bundle.mjs' | 'bundle.json'>
  /**
   * The text encoding used when the bundle format wraps the bundle as a string, or `null` when the
   * bundle is written as raw bytes.
   */
  encoding: Resolvable<string | null>
  /** The file extension of the bundle, such as `'.bundle'`. */
  extension: Resolvable<string>
  /** The host triples the target supports. */
  hosts: Resolvable<string[]>
  /** The host languages the target supports, keyed by language name. */
  languages: Record<string, TargetLanguage>
  /**
   * Resolve the options of the target from those given. Without it, the target accepts no options.
   * @param given - The options given through `StowOptions.targetOptions`.
   * @throws An option is unknown or has an invalid value.
   */
  options?(given: TargetOptions): TargetOptions
}

type RPCName = 'bare-rpc'

/** The context passed to an RPC language's `generate()`. */
interface RPCContext<O extends LanguageOptions = LanguageOptions> {
  /**
   * Whether the module binds the `'client'` in the harness or the `'server'` in the bundle. The
   * server is always generated as JavaScript with `{ module: 'esm' }`.
   */
  role: 'client' | 'server'
  /** The options resolved by the language. */
  options: O
}

/** An RPC library's support for one language. */
interface RPCLanguage<O extends LanguageOptions = LanguageOptions> {
  /**
   * Generate a module exposing `attach(ipc)`, which binds an RPC instance to the IPC handle and
   * returns it.
   * @param context - The RPC context describing the role and language options to generate for.
   */
  generate(context: RPCContext<O>): Generated
}

/** An RPC library, describing how to bind it to the IPC handle in each language it supports. */
interface RPC {
  /** The RPC library's name. */
  name: string
  /** The languages the RPC library supports, keyed by language name. */
  languages: Record<string, RPCLanguage>
}

/** Options for `stow()`. */
interface StowOptions extends Omit<PackOptions, 'offload' | 'linked' | 'resolve' | 'aliases'> {
  /** The language of the harness (or its name). Defaults to `javascript`. */
  language?: Language | LanguageName
  /** The options given to the language, such as `{ module: 'cjs' }` for `javascript`. */
  languageOptions?: LanguageOptions
  /** The options given to the target. */
  targetOptions?: TargetOptions
  /** The RPC library (or its name) to bind in the harness. */
  client?: RPC | RPCName
  /** The RPC library (or its name) to bind in the bundle's entry shim. */
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
  /**
   * Resolve a language name to a `Language`, overriding the default language resolution.
   * @param name - The language name to resolve to a `Language`.
   */
  resolveLanguage?(name: string): Language
}

/** Options for `stow.link()`, which shape the graphs as for `stow()`. */
interface LinkOptions extends Omit<StowOptions, 'client' | 'base' | 'resolveRPC'> {
  /** Resolve an RPC name to an `RPC`, for the server bound in the entry shims. */
  resolveRPC?(name: string): RPC
}

/** An artifact written by `stow()`, yielded once its file has been written. */
interface StowArtifact {
  /** The file URL the artifact was written to. */
  url: URL
}

/**
 * Bundle the module graph rooted at `entry` for `target`, writing a harness package plus bundle to
 * `out`.
 * @param entry - The entry module to bundle, as a `file:` URL or path string.
 * @param target - The bundling target: a `Target` object, or a target name resolved to one (the
 * built-in `bare-kit`, `bare-sidecar`, and `bare-worker`, or a `bare-stow-target-<name>` package).
 * @param out - The directory to write the harness package to, as a `file:` URL or path string.
 * @param opts - Options; see [`StowOptions`](#stowoptions).
 * @returns An async generator that yields each written artifact's `url` as it is produced: the
 * harness and its type declaration, the RPC client and its type declaration, the package manifest,
 * the bundle, and then any offloaded addon or asset files.
 * @throws The `target` argument is missing.
 * @throws The `out` argument is missing.
 * @throws A language option is unknown or invalid, or `out` is not valid as a package.
 * @throws The target or an RPC library does not support the language.
 * @throws A host in `opts.hosts` is not supported by the resolved target in the language.
 */
declare function stow(
  entry: URL | string,
  target: Target | TargetName,
  out: URL | string,
  opts?: StowOptions
): AsyncGenerator<StowArtifact>

declare namespace stow {
  /**
   * Link the addons and assets of the graphs rooted at `entries` into a package at `out`, once for
   * an application. The language lays out the package and the target adds what loads the addons.
   * @param entries - The entry modules of the graphs, as `file:` URLs or path strings.
   * @param target - The target the graphs are stowed for, or its name.
   * @param out - The directory to write the package to, as a `file:` URL or path string.
   * @param opts - Options; see [`LinkOptions`](#linkoptions).
   * @returns An async generator that yields the `url` of each linked addon and asset, and then of the
   * module and manifest of the package.
   * @throws `entries` is empty, or the `target` or `out` argument is missing.
   * @throws The target does not link addons, or does not support linking for the language.
   * @throws The language does not support linked addons or assets.
   * @throws Two different assets would link to the same path.
   */
  function link(
    entries: URL | string | (URL | string)[],
    target: Target | TargetName,
    out: URL | string,
    opts?: LinkOptions
  ): AsyncGenerator<StowArtifact>

  /**
   * The name of the folder that `stow.link()` writes the assets of the application to, which a Swift
   * application copies into its bundle.
   */
  const resources: string

  export {
    type Generated,
    type Language,
    type LanguageName,
    type Layout,
    type ManifestContext,
    type LanguageOptions,
    type JavaScriptOptions,
    type KotlinOptions,
    type Target,
    type TargetName,
    type TargetContext,
    type TargetLanguage,
    type TargetResolveContext,
    type TargetLinkContext,
    type TargetOptions,
    type Linked,
    type LinkOptions,
    type Resolvable,
    type RPC,
    type RPCName,
    type RPCContext,
    type RPCLanguage,
    type StowOptions,
    type StowArtifact
  }
}

export = stow
