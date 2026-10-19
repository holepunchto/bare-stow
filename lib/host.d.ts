import { Duplex } from 'bare-stream'
import { Protocol } from './protocol'

/** Options for `wrap()`. */
interface IPCOptions {
  /**
   * Stop the worker once it has ignored a `terminate` control frame for `grace` milliseconds.
   * Defaults to destroying `stream`.
   */
  kill?: () => unknown
  /**
   * The number of milliseconds to wait for the worker to signal ready before rejecting `ready` and
   * terminating the worker, or `null` to wait indefinitely. Defaults to `null`.
   */
  timeout?: number | null
  /**
   * The number of milliseconds to wait for the worker to exit after a `terminate` control frame
   * before calling `kill`. Defaults to `5000`.
   */
  grace?: number
}

interface IPC extends Protocol {
  /**
   * A promise that resolves once the worker has signaled ready, and rejects if the worker errors,
   * exits, or times out before then. The worker is terminated when it rejects.
   */
  readonly ready: Promise<void>
  /**
   * Send a `terminate` control frame to the worker and resolve once it exits, killing it if it has
   * not exited within the grace period.
   * @returns The worker's exit `code`, or `undefined` if it closed without signaling one.
   */
  terminate(): Promise<number | undefined>
}

declare class IPC {
  /**
   * Wrap the host side of a stowed bundle's transport `stream`.
   * @param stream - The host side of a stowed bundle's transport (any duplex byte stream).
   * @param opts - Options; see [`IPCOptions`](#ipcoptions).
   */
  constructor(stream: Duplex, opts?: IPCOptions)
}

/**
 * Wrap the host side of a stowed bundle's transport `stream`, returning an `IPC` handle with
 * lifecycle helpers layered on top of the `Protocol`.
 * @param stream - The host side of a stowed bundle's transport (any duplex byte stream).
 * @param opts - Options; see [`IPCOptions`](#ipcoptions).
 * @returns An `IPC` handle wrapping `stream`, with the `ready` promise and `terminate()` layered on
 * top of `Protocol`.
 */
declare function wrap(stream: Duplex, opts?: IPCOptions): IPC

export { IPC, type IPCOptions, wrap }
