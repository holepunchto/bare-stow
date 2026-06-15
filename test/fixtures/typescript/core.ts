import { Duplex } from 'bare-stream'
import echo from './echo'

interface Message {
  data: Buffer
}

export default function start(ipc: Duplex) {
  ipc.on('data', (data) => echo({ data: data as Buffer } satisfies Message, ipc))
}
