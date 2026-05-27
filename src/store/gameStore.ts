import { create } from 'zustand'
import type { Coord, GameState, PlayerId, UnitType } from '../types/game'
import { chebyshev, unitAt } from '../game/board'
import { attackPower, healPower } from '../game/rules'
import { createGame, getGame, joinGame, performAction, subscribeToGame } from '../api'

const SAVE_KEY = 'kl_game'

function saveSession(gameId: string, playerId: PlayerId) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ gameId, playerId }))
  } catch {
    /* ignore */
  }
}
function clearSession() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}
import { playSound, setMuted } from '../audio'

type RecruitType = Exclude<UnitType, 'king'>

/** Texto flotante efímero sobre el tablero (daño/curación). */
export interface FloatingEffect {
  id: number
  row: number
  col: number
  text: string
  kind: 'dmg' | 'heal'
}

interface GameStore {
  // --- Conexión a la partida (vía false API) ---
  gameId: string | null
  /** Jugador que controla ESTE cliente. En hot-seat actuamos como el jugador en turno. */
  playerId: PlayerId | null
  /** Espejo local del estado de la partida (llega por suscripción). null = cargando. */
  state: GameState | null

  // --- Estado de UI ---
  selectedUnitId: string | null
  recruitMode: RecruitType | null
  effects: FloatingEffect[]
  muted: boolean
  toggleMute: () => void

  // --- internos ---
  _unsub: (() => void) | null
  _effectId: number
  _pushEffect: (row: number, col: number, text: string, kind: 'dmg' | 'heal') => void

  // --- Ciclo de vida / matchmaking ---
  /** Crea una partida online (host = A) y espera rival (fase lobby). */
  createMatch: (name: string) => Promise<void>
  /** Se une a una partida por código (jugador B). */
  joinMatch: (code: string, name: string) => Promise<void>
  /** Partida local hot-seat: crea y se une en el mismo dispositivo. */
  startLocalGame: (name: string) => Promise<void>
  /** Reconecta a la partida guardada (si existe en el backend). */
  tryReconnect: () => Promise<void>
  /** Vuelve al menú (abandona la partida actual). */
  reset: () => Promise<void>

  // --- Acciones (dispatch vía performAction) ---
  placeKing: (col: number) => void
  select: (unitId: string | null) => void
  move: (unitId: string, dest: Coord) => void
  attack: (attackerId: string, target: Coord) => void
  fuse: (sourceId: string, targetCoord: Coord) => void
  heal: (mageId: string, targetCoord: Coord) => void
  setRecruitMode: (type: RecruitType | null) => void
  recruit: (dest: Coord) => void
  endTurn: () => void
  resolveTimeout: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameId: null,
  playerId: null,
  state: null,
  selectedUnitId: null,
  recruitMode: null,
  effects: [],
  muted: false,
  _unsub: null,
  _effectId: 0,

  toggleMute: () => {
    const next = !get().muted
    setMuted(next)
    set({ muted: next })
  },

  _pushEffect: (row, col, text, kind) => {
    const id = get()._effectId + 1
    set((s) => ({ _effectId: id, effects: [...s.effects, { id, row, col, text, kind }] }))
    setTimeout(() => set((s) => ({ effects: s.effects.filter((e) => e.id !== id) })), 850)
  },

  createMatch: async (name) => {
    if (get().gameId) return
    const { gameId, playerId } = await createGame(name || 'Jugador A')
    const unsub = subscribeToGame(gameId, (s) => set({ state: s }))
    set({ gameId, playerId, _unsub: unsub })
    saveSession(gameId, playerId)
  },

  joinMatch: async (code, name) => {
    if (get().gameId) return
    const unsub = subscribeToGame(code, (s) => set({ state: s }))
    set({ _unsub: unsub })
    const { playerId } = await joinGame(code, name || 'Jugador B')
    set({ gameId: code, playerId })
    saveSession(code, playerId)
  },

  startLocalGame: async (name) => {
    if (get().gameId) return
    const { gameId, playerId } = await createGame(name || 'Jugador A')
    await joinGame(gameId, 'Jugador B')
    const unsub = subscribeToGame(gameId, (s) => set({ state: s }))
    set({ gameId, playerId, _unsub: unsub })
    saveSession(gameId, playerId)
  },

  tryReconnect: async () => {
    if (get().gameId) return
    let saved: { gameId: string; playerId: PlayerId } | null = null
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {
      saved = null
    }
    if (!saved) return
    const existing = await getGame(saved.gameId)
    if (!existing) {
      clearSession()
      return
    }
    const unsub = subscribeToGame(saved.gameId, (s) => set({ state: s }))
    set({ gameId: saved.gameId, playerId: saved.playerId, _unsub: unsub })
  },

  reset: async () => {
    get()._unsub?.()
    clearSession()
    set({
      gameId: null,
      playerId: null,
      state: null,
      selectedUnitId: null,
      recruitMode: null,
      _unsub: null,
    })
  },

  placeKing: (col) => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    playSound('place')
    void performAction(gameId, state.currentTurn, {
      type: 'placeKing',
      player: state.currentTurn,
      col,
    })
  },

  select: (unitId) => set({ selectedUnitId: unitId, recruitMode: null }),

  move: (unitId, dest) => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    const unit = state.units[unitId]
    // El rey consume todos los AP → deseleccionar; el resto sigue seleccionado.
    set({ selectedUnitId: unit && unit.type === 'king' ? null : unitId })
    playSound('move')
    void performAction(gameId, state.currentTurn, { type: 'move', unitId, dest })
  },

  attack: (attackerId, target) => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    const attacker = state.units[attackerId]
    const targetUnit = unitAt(state, target)
    set({ selectedUnitId: attackerId })
    if (attacker && targetUnit) {
      const power = attackPower(attacker, chebyshev(attacker.pos, target)) ?? 0
      const dmg = Math.min(Math.max(power, 0), targetUnit.stat)
      get()._pushEffect(target.row, target.col, `-${dmg}`, 'dmg')
    }
    playSound('attack')
    void performAction(gameId, state.currentTurn, { type: 'attack', attackerId, target })
  },

  fuse: (sourceId, targetCoord) => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    const target = unitAt(state, targetCoord)
    set({ selectedUnitId: target ? target.id : null })
    playSound('fuse')
    void performAction(gameId, state.currentTurn, { type: 'fuse', sourceId, targetCoord })
  },

  heal: (mageId, targetCoord) => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    const mage = state.units[mageId]
    const target = unitAt(state, targetCoord)
    set({ selectedUnitId: mageId })
    if (mage && target) {
      const power = healPower(mage, chebyshev(mage.pos, targetCoord)) ?? 0
      get()._pushEffect(targetCoord.row, targetCoord.col, `+${Math.max(power, 0)}`, 'heal')
    }
    playSound('heal')
    void performAction(gameId, state.currentTurn, { type: 'heal', mageId, targetCoord })
  },

  setRecruitMode: (type) => set({ recruitMode: type, selectedUnitId: null }),

  recruit: (dest) => {
    const { gameId, state, recruitMode } = get()
    if (!gameId || !state || !recruitMode) return
    set({ recruitMode: null })
    playSound('recruit')
    void performAction(gameId, state.currentTurn, { type: 'recruit', unitType: recruitMode, dest })
  },

  endTurn: () => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    set({ selectedUnitId: null, recruitMode: null })
    void performAction(gameId, state.currentTurn, { type: 'endTurn' })
  },

  resolveTimeout: () => {
    const { gameId, state } = get()
    if (!gameId || !state) return
    void performAction(gameId, state.currentTurn, { type: 'resolveTimeout' })
  },
}))

// Afordancia de depuración (solo en desarrollo).
if (import.meta.env.DEV) {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore
}
