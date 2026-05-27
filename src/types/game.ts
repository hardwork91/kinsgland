// Tipos base del estado de KingsLand.
// La lógica completa de reglas se implementa en Fase 1 (ver ROADMAP.md).

export const BOARD_SIZE = 8

export type PlayerId = 'A' | 'B'

export type UnitType = 'king' | 'knight' | 'archer' | 'mage'

/** Nivel de unidad (el rey no usa nivel). */
export type Level = 1 | 2 | 3

export interface Coord {
  row: number // 0..7
  col: number // 0..7
}

export interface Unit {
  id: string
  type: UnitType
  owner: PlayerId
  /** Nivel actual (1-3). Para el rey es irrelevante. */
  level: Level
  /** Stat actual = vida = ataque (= curación en mago). El rey arranca en 10. */
  stat: number
  pos: Coord
  /** True si la unidad ya atacó este turno (no puede volver a atacar). */
  hasAttacked?: boolean
}

export interface PlayerState {
  id: PlayerId
  name: string
  resources: number
}

export type GamePhase = 'lobby' | 'placement' | 'playing' | 'finished'

/** Terreno (fondo del tablero), sorteado por partida. */
export type Terrain = 'grass' | 'desert'

export type GameResult = PlayerId | 'draw'

export interface GameState {
  /** Todas las unidades indexadas por id. */
  units: Record<string, Unit>
  players: Record<PlayerId, PlayerState>
  /** De quién es el turno actual. */
  currentTurn: PlayerId
  /** AP restantes en el turno actual (arranca en 5). */
  apRemaining: number
  /** Número de turno actual (informativo, arranca en 1). */
  turnNumber: number
  phase: GamePhase
  /** null mientras la partida sigue. */
  result: GameResult | null
  /** Timestamp (ms) de inicio de la partida (0 hasta que empieza a jugarse). */
  startedAtMs: number
  /** Jugador que ganó el sorteo y juega primero. */
  firstPlayer: PlayerId
  /** Terreno sorteado para esta partida (fondo del tablero). */
  background: Terrain
}

// --- Constantes de diseño (ver DESIGN.md) ---

export const MAX_AP_PER_TURN = 3
export const STARTING_RESOURCES = 6
export const KING_STAT = 10
export const GAME_DURATION_MS = 15 * 60 * 1000 // 15 min

/** Stat máximo (cap) por nivel. */
export const STAT_CAP_BY_LEVEL: Record<Level, number> = {
  1: 2,
  2: 4,
  3: 8,
}

/** Coste de reclutamiento en recursos por tipo. */
export const RECRUIT_COST: Record<Exclude<UnitType, 'king'>, number> = {
  knight: 2,
  archer: 3,
  mage: 4,
}

/** Recursos obtenidos al matar una unidad según su nivel. */
export const KILL_REWARD_BY_LEVEL: Record<Level, number> = {
  1: 1,
  2: 2,
  3: 3,
}
