import {
  MAX_AP_PER_TURN,
  STARTING_RESOURCES,
  type GameState,
  type PlayerId,
  type Unit,
} from '../types/game'
import { createUnit } from './units'

function makePlayer(id: PlayerId, name: string) {
  // La raza se elige en la fase 'pickRace' y queda null hasta entonces.
  return { id, name, resources: STARTING_RESOURCES, race: null }
}

function indexUnits(units: Unit[]): Record<string, Unit> {
  const map: Record<string, Unit> = {}
  for (const u of units) map[u.id] = u
  return map
}

/**
 * Nueva partida: sorteo del primer jugador. Empieza en 'lobby'; al unirse B
 * pasa a 'pickRace' (cada jugador elige raza), y de ahí a 'placement'.
 */
export function createNewGame(nameA = 'Jugador A', nameB = 'Jugador B'): GameState {
  const firstPlayer: PlayerId = Math.random() < 0.5 ? 'A' : 'B'
  return {
    units: {},
    players: { A: makePlayer('A', nameA), B: makePlayer('B', nameB) },
    // currentTurn alterna durante pickRace y placement; arranca con el primero.
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
 * colocación). Útil para pruebas/arranque rápido. Ambos jugadores son humanos.
 */
export function createInitialState(nameA = 'Jugador A', nameB = 'Jugador B'): GameState {
  const units = [
    createUnit('king', 'A', { row: 0, col: 4 }, 'human'),
    createUnit('king', 'B', { row: 7, col: 4 }, 'human'),
  ]
  return {
    units: indexUnits(units),
    players: {
      A: { ...makePlayer('A', nameA), race: 'human' },
      B: { ...makePlayer('B', nameB), race: 'human' },
    },
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
