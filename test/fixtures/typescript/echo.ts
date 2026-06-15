import { Duplex } from 'bare-stream'

interface Message {
  data: Buffer
}

export default function echo(msg: Message, ipc: Duplex): void {
  ipc.write(msg.data)
}
