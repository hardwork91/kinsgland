import { BOARD_SIZE, MAX_AP_PER_TURN, type Coord, type Unit } from '../types/game'
import { useGameStore } from '../store/gameStore'
import {
  validAttacks,
  validFusions,
  validHeals,
  validMoves,
  validRecruitCells,
} from '../game/rules'
import { Piece } from './Piece'
import { asset } from '../asset'

function key(row: number, col: number) {
  return `${row},${col}`
}

/**
 * Tablero 8x8.
 * - Capa de casillas (CSS Grid): targets de click + highlights.
 * - Capa de piezas (absoluta) encima.
 */
export function Board() {
  const state = useGameStore((s) => s.state)
  const selectedUnitId = useGameStore((s) => s.selectedUnitId)
  const recruitMode = useGameStore((s) => s.recruitMode)
  const select = useGameStore((s) => s.select)
  const move = useGameStore((s) => s.move)
  const attack = useGameStore((s) => s.attack)
  const fuse = useGameStore((s) => s.fuse)
  const heal = useGameStore((s) => s.heal)
  const recruit = useGameStore((s) => s.recruit)
  const setRecruitMode = useGameStore((s) => s.setRecruitMode)
  const placeKing = useGameStore((s) => s.placeKing)
  const effects = useGameStore((s) => s.effects)
  const playerId = useGameStore((s) => s.playerId)
  const local = useGameStore((s) => s.local)

  if (!state) return null

  const { units, currentTurn, apRemaining, phase } = state
  // En red solo puedes interactuar en tu turno; en local controlas ambos.
  const isMyTurn = local || playerId === currentTurn
  const placing = phase === 'placement'

  // Perspectiva del tablero (estilo ajedrez): cada jugador ve SU lado abajo.
  // - En red: según tu jugador fijo (playerId).
  // - En local (hot-seat): rota según el jugador en turno (pasa-y-juega).
  // El jugador A nace en la fila 0 (arriba), así que su vista se rota 180º.
  const perspective = local ? currentTurn : playerId
  const flip = perspective === 'A'

  // Fase de colocación: casillas vacías de la fila trasera del jugador que coloca.
  const placementBackRow = currentTurn === 'A' ? 0 : 7
  const placementTargets = new Set<string>(
    placing && isMyTurn
      ? Array.from({ length: BOARD_SIZE }, (_, col) => key(placementBackRow, col)).filter((k) => {
          const [r, c] = k.split(',').map(Number)
          return !Object.values(units).some((u) => u.pos.row === r && u.pos.col === c)
        })
      : [],
  )
  const selectedUnit = selectedUnitId ? units[selectedUnitId] : null
  const canAct = isMyTurn && !!selectedUnit && selectedUnit.owner === currentTurn && apRemaining > 0

  // El rey solo puede moverse al inicio del turno (AP completo).
  const kingCanMove =
    !selectedUnit || selectedUnit.type !== 'king' || apRemaining === MAX_AP_PER_TURN
  const moveTargets = new Set<string>(
    !recruitMode && canAct && selectedUnit && kingCanMove
      ? validMoves(state, selectedUnit).map((c) => key(c.row, c.col))
      : [],
  )
  const attackTargets = new Set<string>(
    !recruitMode && canAct && selectedUnit
      ? validAttacks(state, selectedUnit).map((c) => key(c.row, c.col))
      : [],
  )
  const fusionTargets = new Set<string>(
    !recruitMode && canAct && selectedUnit
      ? validFusions(state, selectedUnit).map((c) => key(c.row, c.col))
      : [],
  )
  const healTargets = new Set<string>(
    !recruitMode && canAct && selectedUnit
      ? validHeals(state, selectedUnit).map((c) => key(c.row, c.col))
      : [],
  )
  const recruitTargets = new Set<string>(
    recruitMode ? validRecruitCells(state, currentTurn).map((c) => key(c.row, c.col)) : [],
  )

  function onCellClick(row: number, col: number) {
    const k = key(row, col)
    if (placing) {
      if (placementTargets.has(k)) placeKing(col)
      return
    }
    if (recruitMode) {
      if (recruitTargets.has(k)) recruit({ row, col } as Coord)
      else setRecruitMode(null)
      return
    }
    if (selectedUnit && moveTargets.has(k)) {
      move(selectedUnit.id, { row, col } as Coord)
    } else {
      select(null)
    }
  }

  function onPieceClick(clicked: Unit) {
    const k = key(clicked.pos.row, clicked.pos.col)
    if (recruitMode) {
      setRecruitMode(null)
      return
    }
    if (selectedUnit && canAct) {
      // Atacar si es un enemigo en rango.
      if (attackTargets.has(k)) {
        attack(selectedUnit.id, clicked.pos)
        return
      }
      // Fusionar si es un aliado compatible adyacente.
      if (fusionTargets.has(k)) {
        fuse(selectedUnit.id, clicked.pos)
        return
      }
      // Curar si es un aliado en rango (mago).
      if (healTargets.has(k)) {
        heal(selectedUnit.id, clicked.pos)
        return
      }
    }
    // Si no, seleccionar/deseleccionar la pieza clicada.
    select(clicked.id === selectedUnitId ? null : clicked.id)
  }

  const cells = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const k = key(row, col)
      const isDark = (row + col) % 2 === 1
      cells.push(
        <div
          key={k}
          data-row={row}
          data-col={col}
          onClick={() => onCellClick(row, col)}
          className="relative p-[1px]"
        >
          {/* Terreno: luz/sombra con bordes desenfocados */}
          <div className="relative flex h-full w-full items-center justify-center">
            <span
              className={`pointer-events-none absolute inset-[1px] rounded-md blur-[1px] ${
                isDark ? 'bg-black/25' : 'bg-white/30'
              }`}
            />
            {moveTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(96, 165, 250, 0.75)' }}
              />
            )}
            {attackTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(239, 68, 68, 0.75)' }}
              />
            )}
            {fusionTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(168, 85, 247, 0.75)' }}
              />
            )}
            {healTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(74, 222, 128, 0.75)' }}
              />
            )}
            {recruitTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(34, 211, 238, 0.75)' }}
              />
            )}
            {placementTargets.has(k) && (
              <span
                className="pointer-events-none absolute inset-[2px] animate-pulse rounded-md"
                style={{ boxShadow: 'inset 0 0 16px 5px rgba(251, 191, 36, 0.8)' }}
              />
            )}
          </div>
        </div>,
      )
    }
  }

  return (
    <div
      className="relative aspect-square w-full max-w-full select-none overflow-hidden rounded-md border border-neutral-700 bg-cover bg-center p-[10%] shadow-lg"
      style={{ backgroundImage: `url(${asset(`units/${state.background}.png`)})` }}
    >
      {/* Zona jugable (dentro del padding); casillas y piezas comparten este marco.
          Se rota 180º según la perspectiva del jugador (el fondo NO se rota). */}
      <div
        className="relative h-full w-full"
        style={flip ? { transform: 'rotate(180deg)' } : undefined}
      >
        {/* Capa de casillas */}
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {cells}
        </div>

        {/* Capa de piezas (no captura clics salvo en las piezas mismas) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="relative h-full w-full">
            {Object.values(units).map((unit) => (
              <Piece
                key={unit.id}
                unit={unit}
                selected={unit.id === selectedUnitId}
                flip={flip}
                onClick={() => onPieceClick(unit)}
              />
            ))}
          </div>
        </div>

        {/* Capa de efectos flotantes (daño/curación) */}
        <div className="pointer-events-none absolute inset-0">
          {effects.map((e) => (
            <span
              key={e.id}
              className={`float-up absolute -translate-x-1/2 text-lg font-bold ${
                e.kind === 'dmg' ? 'text-red-400' : 'text-green-400'
              }`}
              style={{
                left: `${(e.col + 0.5) * (100 / BOARD_SIZE)}%`,
                top: `${(e.row + 0.3) * (100 / BOARD_SIZE)}%`,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {/* Contrarrota el texto para que no quede de cabeza cuando el tablero está rotado. */}
              <span className="inline-block" style={flip ? { transform: 'rotate(180deg)' } : undefined}>
                {e.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
