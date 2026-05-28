import type { GameState, PlayerId } from '../types/game'
import { createNewGame } from '../game/setup'
import { applyAction, type GameAction } from '../game/actions'

/**
 * "False API" de KingsLand.
 *
 * Expone un contrato async (createGame, joinGame, performAction, subscribeToGame…)
 * como si llamara a un backend. Por ahora opera sobre estado EN MEMORIA, pero el
 * contrato es idéntico al que tendrá la versión sobre Firebase Realtime Database
 * (Fase 3), de modo que el cliente no cambiará al hacer el swap.
 */

type Listener = (state: GameState) => void

const games = new Map<string, GameState>()
const listeners = new Map<string, Set<Listener>>()

/** Genera un código de partida corto y legible (ej: "ABC123"). */
function generateGameId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

function notify(gameId: string): void {
  const state = games.get(gameId)
  if (!state) return
  listeners.get(gameId)?.forEach((cb) => cb(state))
}

/** Crea una partida nueva. El creador es el jugador A (host). */
export async function createGame(
  playerName = 'Jugador A',
): Promise<{ gameId: string; playerId: PlayerId }> {
  let gameId = generateGameId()
  while (games.has(gameId)) gameId = generateGameId()
  games.set(gameId, createNewGame(playerName))
  return { gameId, playerId: 'A' }
}

/** Se une a una partida existente como jugador B. */
export async function joinGame(
  gameId: string,
  playerName = 'Jugador B',
  isAI = false,
): Promise<{ playerId: PlayerId }> {
  const state = games.get(gameId)
  if (!state) throw new Error(`Partida no encontrada: ${gameId}`)
  games.set(gameId, applyAction(state, { type: 'join', name: playerName, isAI }))
  notify(gameId)
  return { playerId: 'B' }
}

/**
 * Ejecuta una acción de juego. El backend valida (vía applyAction) y persiste.
 * Devuelve el nuevo estado. `playerId` se reserva para la verificación de turno
 * en la versión en red (en hot-seat el cliente actúa como el jugador en turno).
 */
export async function performAction(
  gameId: string,
  _playerId: PlayerId,
  action: GameAction,
): Promise<GameState> {
  const state = games.get(gameId)
  if (!state) throw new Error(`Partida no encontrada: ${gameId}`)
  const next = applyAction(state, action)
  games.set(gameId, next)
  notify(gameId)
  return next
}

/** Suscribe a cambios de una partida. Llama al callback de inmediato con el estado actual. */
export function subscribeToGame(gameId: string, cb: Listener): () => void {
  if (!listeners.has(gameId)) listeners.set(gameId, new Set())
  listeners.get(gameId)!.add(cb)
  const current = games.get(gameId)
  if (current) cb(current)
  return () => {
    listeners.get(gameId)?.delete(cb)
  }
}

/** Obtiene el estado actual de una partida (o null si no existe). */
export async function getGame(gameId: string): Promise<GameState | null> {
  return games.get(gameId) ?? null
}
