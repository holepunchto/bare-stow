import { Duplex, DuplexEvents } from 'bare-stream'

/** The frame type marker identifying a control-channel frame. */
declare const CONTROL: number
/** The frame type marker identifying a user-data-channel frame. */
declare const USER: number

/** The events emitted by a `Protocol`, in addition to the standard duplex stream events. */
interface ProtocolEvents extends DuplexEvents {
  /** Emitted when the worker signals it is ready. */
  ready: []
  /** Emitted when a `terminate` control frame is received. */
  terminate: []
  /** Emitted when the worker signals exit, carrying its exit `code`. */
  exit: [code: number]
}

interface Protocol<E extends ProtocolEvents = ProtocolEvents> extends Duplex<E> {
  /**
   * Send a control frame of `type` with an optional JSON-serializable `payload`.
   * @param type - The control frame type, for example `'ready'`, `'exit'`, `'error'`, or
   * `'terminate'`.
   * @param payload - An optional JSON-serializable payload carried with the frame.
   */
  send(type: string, payload?: object): Promise<void>
}

declare class Protocol {
  /**
   * Attach a `Protocol` to the given underlying duplex byte `stream`.
   * @param stream - The underlying duplex byte stream to multiplex the control and user-data
   * channels over.
   */
  constructor(stream: Duplex)
}

/**
 * Attach a `Protocol` to `stream`, an underlying duplex byte stream.
 * @param stream - Any duplex byte stream to attach the protocol to.
 * @returns A `Protocol` multiplexing control and user-data frames over `stream`.
 */
declare function attach(stream: Duplex): Protocol

export { type Protocol, ProtocolEvents, attach, CONTROL, USER }
