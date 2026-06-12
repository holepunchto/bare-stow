import URL from 'bare-url'

type TargetName = 'react-native' | 'pear-runtime' | 'node'

interface TargetContext {
  bundleSpecifier: string
  ipc: string
  rpc: string
  client: string | null
}

interface Target {
  name: string
  linked: boolean
  offload: boolean | { addons?: boolean; assets?: boolean }
  format: 'bundle' | 'bundle.cjs' | 'bundle.mjs' | 'bundle.json'
  encoding: string | null
  extension: string
  module: 'esm' | 'cjs'
  hosts: string[]
  generate(context: TargetContext): string
}

type RPCName = 'bare-rpc'

interface RPCContext {
  ipc: string
  rpc: string
  module: 'esm' | 'cjs'
  role: 'client' | 'server'
}

interface RPC {
  name: string
  generate(context: RPCContext): string
}

interface StowOptions {
  client?: RPC | RPCName
  server?: RPC | RPCName
  base?: URL | string
  hosts?: string[]
  resolveTarget?(name: string): Target
  resolveRPC?(name: string): RPC
}

interface StowArtifact {
  url: URL
}

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
    type StowOptions,
    type StowArtifact
  }
}

export = stow
