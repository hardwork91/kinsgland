import { create } from 'zustand'
import type { Coord, GameState, PlayerId, Race, UnitType } from '../types/game'
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
  /** true = hot-seat (un dispositivo controla ambos); false = en red (cada quien su jugador). */
  local: boolean
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
  /** Partida vs IA (computadora). El humano es A, la IA es B. */
  startAIGame: (name: string) => Promise<void>
  /** Reconecta a la partida guardada (si existe en el backend). */
  tryReconnect: () => Promise<void>
  /** Vuelve al menú (abandona la partida actual). */
  reset: () => Promise<void>

  // --- Acciones (dispatch vía performAction) ---
  pickRace: (race: Race) => void
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

/** Devuelve el jugador en cuyo nombre puede actuar este cliente, o null si no es su turno. */
function getActor(
  state: GameState,
  playerId: PlayerId | null,
  local: boolean,
): PlayerId | null {
  if (local) return state.currentTurn
  return playerId && playerId === state.currentTurn ? playerId : null
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameId: null,
  playerId: null,
  local: false,
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
    set({ gameId, playerId, local: false, _unsub: unsub })
    saveSession(gameId, playerId)
  },

  joinMatch: async (code, name) => {
    if (get().gameId) return
    // Unir primero (esto autentica de forma anónima) y luego suscribir,
    // si no la primera lectura se deniega por reglas y el estado queda en null.
    const { playerId } = await joinGame(code, name || 'Jugador B')
    const unsub = subscribeToGame(code, (s) => set({ state: s }))
    set({ gameId: code, playerId, local: false, _unsub: unsub })
    saveSession(code, playerId)
  },

  startLocalGame: async (name) => {
    if (get().gameId) return
    const { gameId, playerId } = await createGame(name || 'Jugador A')
    await joinGame(gameId, 'Jugador B')
    const unsub = subscribeToGame(gameId, (s) => set({ state: s }))
    set({ gameId, playerId, local: true, _unsub: unsub })
    saveSession(gameId, playerId)
  },

  startAIGame: async (name) => {
    if (get().gameId) return
    const { gameId, playerId } = await createGame(name || 'Jugador')
    // La IA es jugador B; se une con flag isAI=true.
    await joinGame(gameId, 'Computadora', true)
    const unsub = subscribeToGame(gameId, (s) => set({ state: s }))
    // local=false: tu solo controlas A; la IA actua en su turno vía el AI driver.
    set({ gameId, playerId, local: false, _unsub: unsub })
    // No guardamos la sesion vs IA (es desechable; no queremos reconectarnos).
  },

  tryReconnect: async () => {
    if (get().gameId) return
    // Si venimos de un enlace de invitación (?code=), NO reconectar a la partida vieja:
    // hay que unirse a la partida invitada desde el menú (con el código precargado).
    if (new URLSearchParams(window.location.search).get('code')) return
    let saved: { gameId: string; playerId: PlayerId } | null = null
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {
      saved = null
    }
    if (!saved) return
    const existing = await getGame(saved.gameId)
    // No reconectar si la partida ya no existe o terminó.
    if (!existing || existing.phase === 'finished') {
      clearSession()
      return
    }
    const unsub = subscribeToGame(saved.gameId, (s) => set({ state: s }))
    set({ gameId: saved.gameId, playerId: saved.playerId, local: false, _unsub: unsub })
  },

  reset: async () => {
    get()._unsub?.()
    clearSession()
    set({
      gameId: null,
      playerId: null,
      local: false,
      state: null,
      selectedUnitId: null,
      recruitMode: null,
      _unsub: null,
    })
  },

  pickRace: (race) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    void performAction(gameId, actor, { type: 'pickRace', player: actor, race })
  },

  placeKing: (col) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    playSound('place')
    void performAction(gameId, actor, { type: 'placeKing', player: actor, col })
  },

  select: (unitId) => set({ selectedUnitId: unitId, recruitMode: null }),

  move: (unitId, dest) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    const unit = state.units[unitId]
    // El rey consume todos los AP → deseleccionar; el resto sigue seleccionado.
    set({ selectedUnitId: unit && unit.type === 'king' ? null : unitId })
    playSound('move')
    void performAction(gameId, actor, { type: 'move', unitId, dest })
  },

  attack: (attackerId, target) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    const attacker = state.units[attackerId]
    const targetUnit = unitAt(state, target)
    set({ selectedUnitId: attackerId })
    if (attacker && targetUnit) {
      const power = attackPower(attacker, chebyshev(attacker.pos, target)) ?? 0
      const dmg = Math.min(Math.max(power, 0), targetUnit.stat)
      get()._pushEffect(target.row, target.col, `-${dmg}`, 'dmg')
    }
    playSound('attack')
    void performAction(gameId, actor, { type: 'attack', attackerId, target })
  },

  fuse: (sourceId, targetCoord) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    const target = unitAt(state, targetCoord)
    set({ selectedUnitId: target ? target.id : null })
    playSound('fuse')
    void performAction(gameId, actor, { type: 'fuse', sourceId, targetCoord })
  },

  heal: (mageId, targetCoord) => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    const mage = state.units[mageId]
    const target = unitAt(state, targetCoord)
    set({ selectedUnitId: mageId })
    if (mage && target) {
      const power = healPower(mage, chebyshev(mage.pos, targetCoord)) ?? 0
      get()._pushEffect(targetCoord.row, targetCoord.col, `+${Math.max(power, 0)}`, 'heal')
    }
    playSound('heal')
    void performAction(gameId, actor, { type: 'heal', mageId, targetCoord })
  },

  setRecruitMode: (type) => set({ recruitMode: type, selectedUnitId: null }),

  recruit: (dest) => {
    const { gameId, state, recruitMode, playerId, local } = get()
    if (!gameId || !state || !recruitMode) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    set({ recruitMode: null })
    playSound('recruit')
    void performAction(gameId, actor, { type: 'recruit', unitType: recruitMode, dest })
  },

  endTurn: () => {
    const { gameId, state, playerId, local } = get()
    if (!gameId || !state) return
    const actor = getActor(state, playerId, local)
    if (!actor) return
    set({ selectedUnitId: null, recruitMode: null })
    void performAction(gameId, actor, { type: 'endTurn' })
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
