import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

/** Sala de espera del host: muestra el código, permite compartir el enlace y espera al rival. */
export function WaitingRoom() {
  const gameId = useGameStore((s) => s.gameId)
  const reset = useGameStore((s) => s.reset)
  const [copied, setCopied] = useState<'idle' | 'link' | 'code'>('idle')

  const shareUrl = `${window.location.origin}${window.location.pathname}?code=${gameId ?? ''}`

  function copy(text: string, which: 'link' | 'code') {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied('idle'), 1500)
    })
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-neutral-900 px-4 text-neutral-100">
      <h2 className="text-2xl font-semibold">Esperando rival…</h2>
      <p className="text-sm text-neutral-400">Comparte el enlace o el código para que se unan:</p>

      <button
        type="button"
        onClick={() => gameId && copy(shareUrl, 'link')}
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-6 py-4 font-mono text-4xl tracking-[0.3em] transition hover:bg-neutral-700"
        title="Copiar código"
      >
        {gameId}
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => gameId && copy(shareUrl, 'link')}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500"
        >
          {copied === 'link' ? '¡Enlace copiado!' : '🔗 Copiar enlace'}
        </button>
        <button
          type="button"
          onClick={() => gameId && copy(gameId, 'code')}
          className="rounded-md bg-neutral-700 px-4 py-2 font-medium transition hover:bg-neutral-600"
        >
          {copied === 'code' ? '¡Código copiado!' : 'Copiar código'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void reset()}
        className="mt-2 rounded-md px-4 py-2 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        Cancelar
      </button>
    </div>
  )
}
