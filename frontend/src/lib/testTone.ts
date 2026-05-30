let ctx: AudioContext | null = null
let interval: ReturnType<typeof setInterval> | null = null

export function startTestTone(): void {
  if (interval) return
  ctx = new AudioContext()

  const play = () => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 2000
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  }

  play()
  interval = setInterval(play, 1500)
}

export function stopTestTone(): void {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  ctx?.close()
  ctx = null
}
