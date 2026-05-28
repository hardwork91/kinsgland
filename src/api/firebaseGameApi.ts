import { get, onValue, ref, runTransaction, set } from 'firebase/database'
import type { GameState, PlayerId } from '../types/game'
import { createNewGame } from '../game/setup'
import { applyAction, type GameAction } from '../game/actions'
import { ensureAuth, getFirebase } from './firebase'

/**
 * Implementación de la "false API" sobre Firebase Realtime Database.
 * Mismo contrato que la versión en memoria (gameApi.ts), por lo que el cliente
 * (store) no cambia: solo cambia qué módulo se exporta desde api/index.ts.
 */

// Namespace propio para no colisionar con otros proyectos que compartan la RTDB
// (p. ej. Olympus Protocol usa `games/`).
function gamePath(gameId: string) {
  return `kingsland/${gameId}`
}

function generateGameId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

/** RTDB no guarda objetos vacíos; reponemos `units` por si llega ausente. */
function normalizeState(raw: GameState): GameState {
  return { ...raw, units: raw.units ?? {} }
}

/**
 * RTDB rechaza CUALQUIER escritura que contenga `undefined` (lanza
 * "Data returned contains undefined in property ...") y aborta la transacción
 * entera. Limpiamos recursivamente las propiedades `undefined` antes de
 * devolver el estado en una transacción.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

export async function createGame(
  playerName = 'Jugador A',
): Promise<{ gameId: string; playerId: PlayerId }> {
  await ensureAuth()
  const { db } = getFirebase()
  const gameId = generateGameId()
  await set(ref(db, gamePath(gameId)), createNewGame(playerName))
  return { gameId, playerId: 'A' }
}

export async function joinGame(
  gameId: string,
  playerName = 'Jugador B',
  isAI = false,
): Promise<{ playerId: PlayerId }> {
  await ensureAuth()
  const { db } = getFirebase()
  const result = await runTransaction(ref(db, gamePath(gameId)), (current: GameState | null) => {
    if (current === null) return current
    return stripUndefined(
      applyAction(normalizeState(current), { type: 'join', name: playerName, isAI }),
    )
  })
  if (!result.committed || !result.snapshot.exists()) {
    throw new Error(`Partida no encontrada: ${gameId}`)
  }
  return { playerId: 'B' }
}

export async function performAction(
  gameId: string,
  _playerId: PlayerId,
  action: GameAction,
): Promise<GameState> {
  const { db } = getFirebase()
  const result = await runTransaction(ref(db, gamePath(gameId)), (current: GameState | null) => {
    if (current === null) return current // abortar si no existe
    return stripUndefined(applyAction(normalizeState(current), action))
  })
  return normalizeState(result.snapshot.val())
}

export function subscribeToGame(gameId: string, cb: (state: GameState) => void): () => void {
  const { db } = getFirebase()
  return onValue(ref(db, gamePath(gameId)), (snap) => {
    const val = snap.val() as GameState | null
    if (val) cb(normalizeState(val))
  })
}

export async function getGame(gameId: string): Promise<GameState | null> {
  await ensureAuth()
  const { db } = getFirebase()
  const snap = await get(ref(db, gamePath(gameId)))
  return snap.exists() ? normalizeState(snap.val() as GameState) : null
}
