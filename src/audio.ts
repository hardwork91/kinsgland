/**
 * Efectos de sonido sintetizados con Web Audio (sin assets).
 * La música de fondo ambiental queda pendiente (necesita assets de audio).
 */

export type SoundType =
  | 'move'
  | 'attack'
  | 'recruit'
  | 'fuse'
  | 'heal'
  | 'place'
  | 'win'

interface Preset {
  freq: number
  type: OscillatorType
  duration: number
  /** segunda nota opcional (para acordes/arpegios simples) */
  freq2?: number
}

const PRESETS: Record<SoundType, Preset> = {
  move: { freq: 320, type: 'sine', duration: 0.07 },
  attack: { freq: 150, type: 'square', duration: 0.12 },
  recruit: { freq: 440, type: 'triangle', duration: 0.1, freq2: 660 },
  fuse: { freq: 523, type: 'sine', duration: 0.18, freq2: 784 },
  heal: { freq: 660, type: 'sine', duration: 0.14, freq2: 880 },
  place: { freq: 392, type: 'triangle', duration: 0.12 },
  win: { freq: 523, type: 'square', duration: 0.35, freq2: 1046 },
}

let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function setMuted(value: boolean): void {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

function tone(ac: AudioContext, freq: number, type: OscillatorType, start: number, duration: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ac.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.start(start)
  osc.stop(start + duration)
}

export function playSound(type: SoundType): void {
  if (muted) return
  const ac = getCtx()
  if (!ac) return
  // Reanudar el contexto si el navegador lo suspendió hasta la primera interacción.
  if (ac.state === 'suspended') void ac.resume()
  const p = PRESETS[type]
  const now = ac.currentTime
  tone(ac, p.freq, p.type, now, p.duration)
  if (p.freq2) tone(ac, p.freq2, p.type, now + p.duration * 0.5, p.duration)
}
