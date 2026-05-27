import { useGameStore } from '../store/gameStore'

/** Sala de espera del host: muestra el código y espera a que entre el rival. */
export function WaitingRoom() {
  const gameId = useGameStore((s) => s.gameId)
  const reset = useGameStore((s) => s.reset)

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-neutral-900 px-4 text-neutral-100">
      <h2 className="text-2xl font-semibold">Esperando rival…</h2>
      <p className="text-sm text-neutral-400">Comparte este código para que se unan:</p>
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 px-8 py-4 font-mono text-4xl tracking-[0.3em]">
        {gameId}
      </div>
      <button
        type="button"
        onClick={() => void reset()}
        className="rounded-md bg-neutral-700 px-4 py-2 text-sm transition hover:bg-neutral-600"
      >
        Cancelar
      </button>
    </div>
  )
}
