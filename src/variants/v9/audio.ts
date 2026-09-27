// Optional ambient layer, synthesized with Web Audio (no files). Off by default; created only on an explicit toggle.
// Surface: filtered brown-noise swell. With depth the filter closes and a low drone rises. Stations answer with a sonar ping.

export interface Ambient {
  setOn(on: boolean): void
  setDepth(m: number): void
  ping(pan: number): void
  readonly on: boolean
}

export function createAmbient(): Ambient {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // brown noise, 4 s loop
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = last * 3.2
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 800
  lp.Q.value = 0.6
  const swell = ctx.createGain()
  swell.gain.value = 0.55
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.09
  const lfoAmt = ctx.createGain()
  lfoAmt.gain.value = 0.3
  lfo.connect(lfoAmt).connect(swell.gain)
  noise.connect(lp).connect(swell).connect(master)

  // drone
  const drone = ctx.createGain()
  drone.gain.value = 0.0
  const dlp = ctx.createBiquadFilter()
  dlp.type = 'lowpass'
  dlp.frequency.value = 260
  for (const f of [55, 82.6, 110.3]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = f === 55 ? 0.6 : 0.22
    o.connect(g).connect(dlp)
    o.start()
  }
  dlp.connect(drone).connect(master)

  // ping bus with a short echo
  const echo = ctx.createDelay(1)
  echo.delayTime.value = 0.32
  const fb = ctx.createGain()
  fb.gain.value = 0.33
  const elp = ctx.createBiquadFilter()
  elp.type = 'lowpass'
  elp.frequency.value = 1800
  echo.connect(elp).connect(fb).connect(echo)
  elp.connect(master)

  noise.start()
  lfo.start()

  let on = false
  return {
    get on() {
      return on
    },
    setOn(v) {
      on = v
      const now = ctx.currentTime
      if (v) void ctx.resume()
      master.gain.cancelScheduledValues(now)
      master.gain.setTargetAtTime(v ? 0.32 : 0, now, v ? 0.5 : 0.15)
      if (!v) setTimeout(() => !on && void ctx.suspend(), 900)
    },
    setDepth(m) {
      if (!on) return
      const now = ctx.currentTime
      lp.frequency.setTargetAtTime(120 + 780 * Math.exp(-m / 140), now, 0.25)
      drone.gain.setTargetAtTime(0.03 + 0.12 * Math.min(1, m / 475), now, 0.4)
      swell.gain.setTargetAtTime(0.55 * (0.35 + 0.65 * Math.exp(-m / 200)), now, 0.4)
    },
    ping(pan) {
      if (!on) return
      const now = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(1480, now)
      o.frequency.exponentialRampToValueAtTime(1320, now + 0.9)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1)
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
      if (p) p.pan.value = Math.max(-1, Math.min(1, pan))
      const out = p ? o.connect(g).connect(p) : o.connect(g)
      out.connect(master)
      out.connect(echo)
      o.start(now)
      o.stop(now + 1.2)
    },
  }
}
