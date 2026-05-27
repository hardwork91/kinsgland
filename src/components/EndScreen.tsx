import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { playSound } from '../audio'

/** Overlay de fin de partida: resultado + jugar de nuevo. */
export function EndScreen() {
  const phase = useGameStore((s) => s.state?.phase)
  const result = useGameStore((s) => s.state?.result)
  const players = useGameStore((s) => s.state?.players)
  const reset = useGameStore((s) => s.reset)

  useEffect(() => {
    if (phase === 'finished') playSound('win')
  }, [phase])

  if (phase !== 'finished' || !result || !players) return null

  const msg = result === 'draw' ? 'Empate' : `Gana ${players[result].name}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-8 text-center shadow-2xl">
        <p className="mb-1 text-sm uppercase tracking-widest text-neutral-400">Fin de la partida</p>
        <h2 className="mb-6 text-4xl font-bold">{msg}</h2>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-600 px-6 py-2 font-medium transition hover:bg-neutral-500"
        >
          Jugar de nuevo
        </button>
      </div>
    </div>
  )
}
