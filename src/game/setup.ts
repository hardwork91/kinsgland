import {
  MAX_AP_PER_TURN,
  STARTING_RESOURCES,
  type GameState,
  type PlayerId,
  type Unit,
} from '../types/game'
import { createUnit } from './units'

function makePlayer(id: PlayerId, name: string) {
  return { id, name, resources: STARTING_RESOURCES }
}

function indexUnits(units: Unit[]): Record<string, Unit> {
  const map: Record<string, Unit> = {}
  for (const u of units) map[u.id] = u
  return map
}

/**
 * Nueva partida: sorteo del primer jugador y fase de COLOCACIÓN.
 * El tablero arranca vacío; cada jugador coloca su rey (ver placeKing) y
 * empieza con solo el rey + 6 recursos.
 */
export function createNewGame(nameA = 'Jugador A', nameB = 'Jugador B'): GameState {
  const firstPlayer: PlayerId = Math.random() < 0.5 ? 'A' : 'B'
  return {
    units: {},
    players: { A: makePlayer('A', nameA), B: makePlayer('B', nameB) },
    // Durante la colocación, currentTurn = quién coloca ahora (empieza el primero).
    currentTurn: firstPlayer,
    apRemaining: MAX_AP_PER_TURN,
    turnNumber: 1,
    phase: 'lobby',
    result: null,
    startedAtMs: 0,
    firstPlayer,
    background: Math.random() < 0.5 ? 'grass' : 'desert',
  }
}

/**
 * Estado con los reyes ya colocados en posiciones por defecto (salta la
 * colocación). Útil para pruebas/arranque rápido.
 */
export function createInitialState(nameA = 'Jugador A', nameB = 'Jugador B'): GameState {
  const units = [
    createUnit('king', 'A', { row: 0, col: 4 }),
    createUnit('king', 'B', { row: 7, col: 4 }),
  ]
  return {
    units: indexUnits(units),
    players: { A: makePlayer('A', nameA), B: makePlayer('B', nameB) },
    currentTurn: 'A',
    apRemaining: MAX_AP_PER_TURN,
    turnNumber: 1,
    phase: 'playing',
    result: null,
    startedAtMs: Date.now(),
    firstPlayer: 'A',
    background: Math.random() < 0.5 ? 'grass' : 'desert',
  }
}
