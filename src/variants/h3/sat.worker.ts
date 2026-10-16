// Worker entry for the CubeSat: the whole three.js scene lives here, on an OffscreenCanvas.
import { host, type ToSat } from './cubesat.lazy'

const on = host((m) => (self as unknown as Worker).postMessage(m))
self.onmessage = (e: MessageEvent<ToSat>) => on(e.data)
