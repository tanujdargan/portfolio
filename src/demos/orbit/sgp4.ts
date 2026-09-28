// satellite.js, minus its WebAssembly half. The package root re-exports a wasm bulk propagator whose dynamic
// `import('#wasm-multi-thread')` pulls a pthreads worker with top-level await into the build, and Vite's default
// iife worker format rejects it ("Module format iife does not support top-level await"). The package only exports
// ".", so the pure-JS modules are imported by path. Same code, same types.
export { twoline2satrec } from '../../../node_modules/satellite.js/dist/io.js'
export { propagate, gstime } from '../../../node_modules/satellite.js/dist/propagation.js'
export { eciToEcf, eciToGeodetic, ecfToLookAngles } from '../../../node_modules/satellite.js/dist/transforms.js'
export { jday } from '../../../node_modules/satellite.js/dist/ext.js'
export { sunPos } from '../../../node_modules/satellite.js/dist/sun.js'
export { shadowFraction } from '../../../node_modules/satellite.js/dist/shadow.js'
export type { SatRec } from '../../../node_modules/satellite.js/dist/propagation/SatRec.js'
