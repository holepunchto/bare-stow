import { Duplex } from 'bare-stream'
import { Protocol } from './protocol'

interface IPC extends Protocol {
  /**
   * A promise that resolves once the worker has signaled ready, and rejects if the worker errors
   * before then.
   */
  readonly ready: Promise<void>
  /**
   * Send a `terminate` control frame to the worker and resolve with its exit code once it exits.
   * @returns The worker's exit `code` once it exits.
   */
  terminate(): Promise<number | undefined>
}

declare class IPC {
  /**
   * Wrap the host side of a stowed bundle's transport `stream`.
   * @param stream - The host side of a stowed bundle's transport (any duplex byte stream).
   */
  constructor(stream: Duplex)
}

/**
 * Wrap the host side of a stowed bundle's transport `stream`, returning an `IPC` handle with
 * lifecycle helpers layered on top of the `Protocol`.
 * @param stream - The host side of a stowed bundle's transport (any duplex byte stream).
 * @returns An `IPC` handle wrapping `stream`, with the `ready` promise and `terminate()` layered on
 * top of `Protocol`.
 */
declare function wrap(stream: Duplex): IPC

declare namespace wrap {
  export { IPC }
}

export = wrap
