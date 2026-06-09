import URL from 'bare-url'

type Runtime = 'react-native' | 'pear-runtime' | 'node'

type RPC = 'bare-rpc'

interface StowOptions {
  client?: RPC
  server?: RPC
  base?: URL | string
}

interface StowArtifact {
  url: URL
}

declare function stow(
  entry: URL | string,
  target: Runtime,
  out: URL | string,
  opts?: StowOptions
): AsyncGenerator<StowArtifact>

declare namespace stow {
  export { type Runtime, type RPC, type StowOptions, type StowArtifact }
}

export = stow
