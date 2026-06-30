import { Duplex, DuplexEvents } from 'bare-stream'

declare const CONTROL: number
declare const USER: number

interface ProtocolEvents extends DuplexEvents {
  ready: []
  terminate: []
  exit: [code: number]
}

interface Protocol<E extends ProtocolEvents = ProtocolEvents> extends Duplex<E> {
  send(type: string, payload?: object): Promise<void>
}

declare class Protocol {
  constructor(stream: Duplex)
}

declare function attach(stream: Duplex): Protocol

export { type Protocol, ProtocolEvents, attach, CONTROL, USER }
