import { Duplex } from 'bare-stream'

declare const CONTROL: number
declare const USER: number

interface Protocol extends Duplex {
  send(type: string, payload?: object): Promise<void>
}

declare class Protocol {
  constructor(stream: Duplex)
}

declare function attach(stream: Duplex): Protocol

export { type Protocol, attach, CONTROL, USER }
