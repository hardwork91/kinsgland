import { performAction } from '../api'
import { useGameStore } from '../store/gameStore'
import { isAIPlayer, RACES, type GameState, type PlayerId, type Race } from '../types/game'
import { planTurn } from './heuristic'

/**
 * Driver de la IA: escucha cambios del store y, cuando le toca el turno a
 * un jugador marcado como `isAI`, ejecuta su jugada vía la "false API".
 *
 * Reglas:
 *  - pickRace: elige raza aleatoria.
 *  - placement: coloca su rey en la columna central (4).
 *  - playing: planTurn → ejecuta cada acción con un retraso visible y al final
 *    despacha endTurn.
 *
 * El driver dispatcha llamando `performAction(gameId, aiPlayer, action)`
 * directamente (sin pasar por los métodos del store que usan `getActor`).
 */

const DELAY_MS = 600

let busy = false

export function setupAIDriver(): () => void {
  // Disparamos también al instalarse, por si ya hay estado activo.
  void maybeAct(useGameStore.getState())
  return useGameStore.subscribe((s) => {
    void maybeAct(s)
  })
}

type StoreSnap = ReturnType<typeof useGameStore.getState>

async function maybeAct(s: StoreSnap): Promise<void> {
  if (busy) return
  const { state, gameId } = s
  if (!state || !gameId) return
  // ¿Le toca a una IA?
  const turn = state.currentTurn
  if (!isAIPlayer(state, turn)) return
  // Marcamos busy ANTES de cualquier await para evitar reentrada.
  busy = true
  try {
    await runAITurn(gameId, turn)
  } catch (err) {
    console.error('[AI driver] error:', err)
  } finally {
    busy = false
  }
}

async function runAITurn(gameId: string, ai: PlayerId): Promise<void> {
  // Pausa inicial para que el jugador note el cambio de turno.
  await delay(DELAY_MS)
  const snap = useGameStore.getState()
  if (!snap.state || snap.gameId !== gameId) return
  if (snap.state.currentTurn !== ai) return
  const state = snap.state

  if (state.phase === 'pickRace') {
    const race: Race = RACES[Math.floor(Math.random() * RACES.length)]
    await performAction(gameId, ai, { type: 'pickRace', player: ai, race })
    return
  }

  if (state.phase === 'placement') {
    const col = chooseKingCol(state, ai)
    await performAction(gameId, ai, { type: 'placeKing', player: ai, col })
    return
  }

  if (state.phase === 'playing') {
    // Ejecuta acciones plan-by-plan: tras cada una, re-planeamos sobre el nuevo
    // estado por si abre/cierra oportunidades. Para acciones AP (1 AP) esto es
    // equivalente al plan completo; para reclutar (0 AP) la próxima iteración
    // recoge la nueva unidad en su catálogo.
    for (let safety = 0; safety < 12; safety++) {
      const cur = useGameStore.getState().state
      if (!cur || cur.phase !== 'playing') break
      if (cur.currentTurn !== ai) break
      if (cur.apRemaining <= 0) break
      const plan = planTurn(cur, ai)
      if (plan.length === 0) break
      const action = plan[0]
      await performAction(gameId, ai, action)
      await delay(DELAY_MS)
    }
    // Terminar turno
    const cur = useGameStore.getState().state
    if (cur && cur.phase === 'playing' && cur.currentTurn === ai) {
      await performAction(gameId, ai, { type: 'endTurn' })
    }
  }
}

/** Heurística sencilla para la colocación del rey: columna central libre. */
function chooseKingCol(state: GameState, ai: PlayerId): number {
  // Prefiere center; si por alguna razón estuviera ocupada (no debería en row 0/7), va al lado.
  const backRow = ai === 'A' ? 0 : 7
  const preferred = [4, 3, 5, 2, 6, 1, 7, 0]
  for (const col of preferred) {
    const occupied = Object.values(state.units).some(
      (u) => u.pos.row === backRow && u.pos.col === col,
    )
    if (!occupied) return col
  }
  return 4
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}
