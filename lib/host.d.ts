import { Duplex } from 'bare-stream'
import { Protocol } from './protocol'

interface IPC extends Protocol {
  readonly ready: Promise<void>
  terminate(): Promise<number | undefined>
}

declare class IPC {
  constructor(stream: Duplex)
}

declare function wrap(stream: Duplex): IPC

declare namespace wrap {
  export { IPC }
}

export = wrap
