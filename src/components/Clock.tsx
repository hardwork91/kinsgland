import { useEffect, useState } from 'react'
import { GAME_DURATION_MS } from '../types/game'
import { useGameStore } from '../store/gameStore'

/** Reloj compartido de 15 min. Al llegar a 0, resuelve por tiebreak (HP del rey). */
export function Clock() {
  const startedAtMs = useGameStore((s) => s.state?.startedAtMs ?? 0)
  const phase = useGameStore((s) => s.state?.phase ?? 'placement')
  const resolveTimeout = useGameStore((s) => s.resolveTimeout)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (phase === 'finished') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [phase])

  const remaining =
    startedAtMs === 0 ? GAME_DURATION_MS : Math.max(0, GAME_DURATION_MS - (now - startedAtMs))

  useEffect(() => {
    if (phase === 'playing' && remaining <= 0) resolveTimeout()
  }, [phase, remaining, resolveTimeout])

  const totalSec = Math.ceil(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')

  return (
    <p className={`font-mono text-lg ${remaining <= 60_000 ? 'text-red-400' : ''}`}>
      {mm}:{ss}
    </p>
  )
}
