import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { backend } from '../api'

/** Pantalla inicial: nombre + crear/unirse/jugar local. */
/** Código de sala precargado desde la URL (?code=ABC123), si viene en un enlace compartido. */
const codeFromUrl = new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? ''

export function Menu() {
  const [name, setName] = useState('')
  const [code, setCode] = useState(codeFromUrl)
  const [joining, setJoining] = useState(codeFromUrl.length > 0)
  const startLocalGame = useGameStore((s) => s.startLocalGame)
  const createMatch = useGameStore((s) => s.createMatch)
  const joinMatch = useGameStore((s) => s.joinMatch)

  const online = backend === 'firebase'

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-neutral-900 px-4 text-neutral-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">KingsLand</h1>
        <p className="mt-1 text-sm text-neutral-400">Duelo táctico 1 vs 1</p>
      </div>

      <div className="flex w-80 flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-800/40 p-6">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Tu nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jugador"
            className="rounded bg-neutral-900 px-3 py-2 text-neutral-100 outline-none ring-1 ring-neutral-700 focus:ring-neutral-500"
          />
        </label>

        <button
          type="button"
          onClick={() => void startLocalGame(name)}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500"
        >
          Jugar local (hot-seat)
        </button>

        <div className="h-px bg-neutral-700" />

        {!joining ? (
          <>
            <button
              type="button"
              disabled={!online}
              onClick={() => void createMatch(name)}
              className="rounded-md bg-neutral-700 px-4 py-2 font-medium transition hover:bg-neutral-600 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
            >
              Crear partida online
            </button>
            <button
              type="button"
              disabled={!online}
              onClick={() => setJoining(true)}
              className="rounded-md bg-neutral-700 px-4 py-2 font-medium transition hover:bg-neutral-600 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
            >
              Unirse con código
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={6}
              className="rounded bg-neutral-900 px-3 py-2 text-center font-mono tracking-widest text-neutral-100 outline-none ring-1 ring-neutral-700 focus:ring-neutral-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJoining(false)}
                className="flex-1 rounded-md bg-neutral-700 px-4 py-2 transition hover:bg-neutral-600"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={code.length < 4}
                onClick={() => void joinMatch(code, name)}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600"
              >
                Unirse
              </button>
            </div>
          </div>
        )}

        {!online && (
          <p className="text-center text-xs text-neutral-500">
            Modo online desactivado (sin configuración de Firebase). Usa “Jugar local”.
          </p>
        )}
      </div>
    </div>
  )
}
