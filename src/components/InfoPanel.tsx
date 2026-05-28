import {
  MAX_AP_PER_TURN,
  playerRace,
  recruitCost,
  statCap,
  unitLabel,
  type GameState,
  type UnitType,
} from '../types/game'
import { useGameStore } from '../store/gameStore'
import { validRecruitCells } from '../game/rules'
import { UNIT_META, unitPortrait } from './unitMeta'
import { GOLD_BTN } from './theme'
import { OrnateFrame } from './OrnateFrame'
import { SectionTitle } from './SectionTitle'
import { Coin } from './Coin'

type RecruitType = Exclude<UnitType, 'king'>
const RECRUIT_TYPES: RecruitType[] = ['knight', 'archer', 'mage']

/** Panel derecho: información de la unidad seleccionada, acciones, reclutar y fin de turno. */
export function InfoPanel({ state }: { state: GameState }) {
  const selectedUnitId = useGameStore((s) => s.selectedUnitId)
  const recruitMode = useGameStore((s) => s.recruitMode)
  const setRecruitMode = useGameStore((s) => s.setRecruitMode)
  const endTurn = useGameStore((s) => s.endTurn)
  const playerId = useGameStore((s) => s.playerId)
  const local = useGameStore((s) => s.local)

  const { currentTurn, apRemaining, players, phase, firstPlayer } = state
  const resources = players[currentTurn].resources
  const sel = selectedUnitId ? state.units[selectedUnitId] : null
  const hasCells = validRecruitCells(state, currentTurn).length > 0
  const placing = phase === 'placement'
  // En red, solo puedes actuar en tu turno.
  const isMyTurn = local || playerId === currentTurn
  const rival = players[currentTurn].name
  // Raza del jugador en turno (para reclutar) y del seleccionado (para nombre/cap).
  const turnRace = playerRace(state, currentTurn)
  const selRace = sel ? playerRace(state, sel.owner) : 'human'

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
      {placing ? (
        <OrnateFrame className="rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
          <SectionTitle>Colocación</SectionTitle>
          <p className="text-sm text-amber-300">
            Sorteo: empieza <strong>{players[firstPlayer].name}</strong>.
          </p>
          {isMyTurn ? (
            <p className="mt-2 text-sm text-slate-300">
              Elige una casilla resaltada en tu fila para colocar tu rey.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              ⏳ Esperando a que <strong>{rival}</strong> coloque su rey…
            </p>
          )}
        </OrnateFrame>
      ) : (
        <>
          {/* INFORMACIÓN: unidad seleccionada */}
          <OrnateFrame className="rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
            <SectionTitle>Información</SectionTitle>
            {sel ? (
              <div className="flex gap-3">
                <img
                  src={unitPortrait(selRace, sel.type, sel.level)}
                  alt={unitLabel(selRace, sel.type)}
                  className="h-32 w-32 shrink-0 object-contain drop-shadow"
                  draggable={false}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100">
                      {unitLabel(selRace, sel.type)}
                    </span>
                    {sel.type !== 'king' && (
                      <span className="rounded bg-amber-700/40 px-1.5 text-xs text-amber-200">
                        Nivel {sel.level}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-200">
                    Stat <b className="text-amber-300">{sel.stat}</b>
                    {sel.type !== 'king' && (
                      <span className="text-slate-500">
                        {' '}
                        / {statCap(selRace, sel.type, sel.level)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-tight text-slate-400">
                    {UNIT_META[sel.type].desc}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Turno de <strong className="text-neutral-200">{players[currentTurn].name}</strong>.
                Selecciona una unidad para ver sus detalles.
              </p>
            )}
          </OrnateFrame>

          {isMyTurn ? (
            <>
              {/* ACCIONES */}
              <OrnateFrame className="rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
                <SectionTitle>Acciones</SectionTitle>
                <div className="flex items-center justify-between">
                  <span className="text-lg">
                    <span className="font-mono font-bold text-neutral-100">{apRemaining}</span>
                    <span className="text-slate-400"> / {MAX_AP_PER_TURN} AP</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm text-neutral-200">
                    <Coin className="h-4 w-4" /> {resources}
                  </span>
                </div>
                <div className="mt-1 flex gap-1">
                  {Array.from({ length: MAX_AP_PER_TURN }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 flex-1 rounded ${i < apRemaining ? 'bg-sky-400' : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
              </OrnateFrame>

              {/* RECLUTAR */}
              <OrnateFrame className="rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
                <SectionTitle>Reclutar (adyacente al rey)</SectionTitle>
                <div className="flex flex-col gap-2">
                  {RECRUIT_TYPES.map((t) => {
                    const cost = recruitCost(turnRace, t)
                    const disabled = resources < cost || !hasCells
                    const active = recruitMode === t
                    return (
                      <button
                        key={t}
                        type="button"
                        data-recruit={t}
                        disabled={disabled}
                        onClick={() => setRecruitMode(active ? null : t)}
                        className={`flex items-center justify-between rounded px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : disabled
                              ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                              : 'border border-amber-700/30 bg-slate-800/70 text-neutral-100 hover:bg-slate-700'
                        }`}
                      >
                        <span>{unitLabel(turnRace, t)}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Coin className="h-4 w-4" /> {cost}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {recruitMode && (
                  <p className="mt-2 text-xs text-emerald-400">
                    Elige una casilla verde para colocar.
                  </p>
                )}
              </OrnateFrame>
            </>
          ) : (
            <OrnateFrame className="rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]">
              <p className="text-center text-sm text-slate-300">
                ⏳ Turno de <strong>{rival}</strong>. Espera tu turno…
              </p>
            </OrnateFrame>
          )}
        </>
      )}

      {!placing && isMyTurn && (
        <button type="button" onClick={endTurn} className={GOLD_BTN}>
          Terminar turno
        </button>
      )}
    </aside>
  )
}
