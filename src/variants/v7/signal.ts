// "Signal": a quiet radio-noise bed and telemetry beeps, synthesised with Web Audio. No files.
// Off by default; only ever started from an explicit user gesture (the SIGNAL toggle or `/signal on`).

type Ctx = { ac: AudioContext; bed: GainNode; out: GainNode; src: AudioBufferSourceNode; lfo: OscillatorNode }
let ctx: Ctx | null = null
let lastBeep = 0

export function signalOn() {
  if (ctx) return
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  const ac = new AC()
  const out = ac.createGain()
  out.gain.value = 0.9
  out.connect(ac.destination)

  // band-passed noise with a slow fade in and out, like a carrier drifting at the edge of lock
  const len = ac.sampleRate * 2
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  let b = 0
  for (let i = 0; i < len; i++) {
    b = 0.97 * b + 0.03 * (Math.random() * 2 - 1)
    data[i] = b * 3 + (Math.random() * 2 - 1) * 0.15
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1400
  bp.Q.value = 0.6
  const bed = ac.createGain()
  bed.gain.value = 0
  bed.gain.linearRampToValueAtTime(0.028, ac.currentTime + 0.8)
  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.09
  const lfoG = ac.createGain()
  lfoG.gain.value = 0.012
  lfo.connect(lfoG).connect(bed.gain)
  src.connect(bp).connect(bed).connect(out)
  src.start()
  lfo.start()
  ctx = { ac, bed, out, src, lfo }
  beep('lock')
}

export function signalOff() {
  if (!ctx) return
  const c = ctx
  ctx = null
  c.out.gain.setTargetAtTime(0, c.ac.currentTime, 0.08)
  setTimeout(() => c.ac.close().catch(() => {}), 400)
}

export const signalActive = () => !!ctx

/** tick: a telemetry packet; cmd: a command accepted; err: rejected; lock: acquisition chirp */
export function beep(kind: 'tick' | 'cmd' | 'err' | 'lock') {
  if (!ctx) return
  const { ac, out } = ctx
  const now = ac.currentTime
  if (kind === 'tick' && now - lastBeep < 0.25) return
  lastBeep = now
  const tone = (f0: number, f1: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, now + at)
    o.frequency.exponentialRampToValueAtTime(f1, now + at + dur)
    g.gain.setValueAtTime(0, now + at)
    g.gain.linearRampToValueAtTime(vol, now + at + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
    o.connect(g).connect(out)
    o.start(now + at)
    o.stop(now + at + dur + 0.02)
  }
  if (kind === 'tick') tone(2400, 2400, 0, 0.035, 0.018)
  if (kind === 'cmd') {
    tone(1320, 1320, 0, 0.05, 0.045)
    tone(1760, 1760, 0.07, 0.07, 0.045)
  }
  if (kind === 'err') tone(420, 300, 0, 0.18, 0.05, 'triangle')
  if (kind === 'lock') tone(600, 2200, 0, 0.32, 0.04)
}
