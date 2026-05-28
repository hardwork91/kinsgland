import { RACE_LABEL, RACES, type Race } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { OrnateFrame } from './OrnateFrame'
import { GOLD_BTN } from './theme'
import { unitPortrait } from './unitMeta'

/**
 * Pantalla de elección de raza (fase 'pickRace').
 * Secuencial: el jugador en turno elige; el otro espera.
 */
export function RacePicker() {
  const state = useGameStore((s) => s.state)
  const playerId = useGameStore((s) => s.playerId)
  const local = useGameStore((s) => s.local)
  const pickRace = useGameStore((s) => s.pickRace)
  const reset = useGameStore((s) => s.reset)

  if (!state) return null
  const isMyTurn = local || playerId === state.currentTurn
  const turnPlayer = state.players[state.currentTurn]
  const otherId = state.currentTurn === 'A' ? 'B' : 'A'
  const other = state.players[otherId]

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-neutral-900 px-3 py-6 text-neutral-100">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Elige tu raza</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {isMyTurn ? (
            <>
              Turno de <strong className="text-amber-300">{turnPlayer.name}</strong>
            </>
          ) : (
            <>
              ⏳ Esperando a <strong>{turnPlayer.name}</strong>…
            </>
          )}
          {other.race && (
            <>
              {' '}
              · {other.name} eligió{' '}
              <strong className="text-neutral-200">{RACE_LABEL[other.race]}</strong>
            </>
          )}
        </p>
      </div>

      {/* Mobile: columna apilada centrada. Desktop (sm+): fila centrada. */}
      <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-4 sm:flex-row sm:items-stretch">
        {RACES.map((race) => (
          <RaceCard
            key={race}
            race={race}
            disabled={!isMyTurn}
            onPick={() => pickRace(race)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void reset()}
        className="mt-6 rounded-md px-4 py-2 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        Salir
      </button>
    </div>
  )
}

function RaceCard({
  race,
  disabled,
  onPick,
}: {
  race: Race
  disabled: boolean
  onPick: () => void
}) {
  return (
    <OrnateFrame className="w-full max-w-xs rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c] sm:flex-1">
      <div className="flex flex-col items-center gap-3 p-1">
        <div className="text-xl font-bold text-amber-300">{RACE_LABEL[race]}</div>
        <img
          src={unitPortrait(race, 'king')}
          alt={RACE_LABEL[race]}
          className="h-28 w-28 object-contain drop-shadow"
          draggable={false}
        />
        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className={`${GOLD_BTN} w-full disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Elegir
        </button>
      </div>
    </OrnateFrame>
  )
}
