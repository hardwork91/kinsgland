import {
  COST_BY_RACE,
  RACE_LABEL,
  RACES,
  STAT_BY_RACE,
  UNIT_NAMES,
  type Race,
} from '../types/game'
import { useGameStore } from '../store/gameStore'
import { OrnateFrame } from './OrnateFrame'
import { Coin } from './Coin'
import { GOLD_BTN } from './theme'

/** Texto descriptivo del estilo de cada raza. */
const RACE_TAGLINE: Record<Race, string> = {
  human: 'Equilibrados. Sin extremos.',
  orc: 'Brutales en melee, flojos a distancia.',
  elf: 'Arqueros y magos demoledores; melee frágil.',
}

const RECRUIT_TYPES = ['knight', 'archer', 'mage'] as const

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
    <div className="flex min-h-full flex-col bg-neutral-900 px-3 py-6 text-neutral-100">
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

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 lg:flex-row">
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
        className="mx-auto mt-6 rounded-md px-4 py-2 text-sm text-neutral-400 transition hover:text-neutral-200"
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
    <OrnateFrame className="flex-1 rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
      <div className="flex flex-col gap-3 p-1">
        <div className="text-center">
          <div className="text-xl font-bold text-amber-300">{RACE_LABEL[race]}</div>
          <div className="text-xs text-neutral-400">{RACE_TAGLINE[race]}</div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-400">
              <th className="text-left font-normal">Unidad</th>
              <th className="text-center font-normal">Stat L1/L2/L3</th>
              <th className="text-right font-normal">Coste</th>
            </tr>
          </thead>
          <tbody>
            {RECRUIT_TYPES.map((t) => {
              const stats = STAT_BY_RACE[race][t]
              const cost = COST_BY_RACE[race][t]
              return (
                <tr key={t} className="border-t border-neutral-700/40">
                  <td className="py-1 text-neutral-200">{UNIT_NAMES[race][t]}</td>
                  <td className="py-1 text-center font-mono text-amber-200">
                    {stats[1]} / {stats[2]} / {stats[3]}
                  </td>
                  <td className="py-1 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                      <Coin className="h-3.5 w-3.5" />
                      {cost}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className={`${GOLD_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {disabled ? '—' : `Elegir ${RACE_LABEL[race]}`}
        </button>
      </div>
    </OrnateFrame>
  )
}
