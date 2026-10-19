import { Duplex } from 'bare-stream'
import { Protocol } from './protocol'

interface Runtime extends Protocol {
  /**
   * Load the bundle entry and start it with `arg`, signaling ready once its `start()` resolves.
   * @param load - A function importing the bundle entry module.
   * @param arg - The value passed to the entry's `start()`.
   */
  run(load: () => Promise<{ default: Function }>, arg: unknown): Promise<void>
}

declare class Runtime {
  /**
   * Attach the worker side of a stowed bundle's lifecycle to `stream`.
   * @param stream - The worker side of a stowed bundle's transport, typically `Bare.IPC`.
   */
  constructor(stream: Duplex)
}

/**
 * Attach the worker side of a stowed bundle's lifecycle to `stream`, shutting the worker down on
 * `terminate`, `SIGTERM`, runtime exit, uncaught errors, or loss of the host.
 * @param stream - The worker side of a stowed bundle's transport, typically `Bare.IPC`.
 * @returns A `Runtime` multiplexing control and user-data frames over `stream`.
 */
declare function attach(stream: Duplex): Runtime

export { Runtime, attach }
