// Tipos base del estado de KingsLand.
// La lógica completa de reglas se implementa en Fase 1 (ver ROADMAP.md).

export const BOARD_SIZE = 8

export type PlayerId = 'A' | 'B'

export type UnitType = 'king' | 'knight' | 'archer' | 'mage'

/** Nivel de unidad (el rey no usa nivel). */
export type Level = 1 | 2 | 3

/** Razas disponibles. El rey es idéntico entre razas (stat 10, sin coste). */
export type Race = 'human' | 'orc' | 'elf'

export const RACES: Race[] = ['human', 'orc', 'elf']

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
  /** Raza elegida en la fase 'pickRace'. null hasta que el jugador elija. */
  race: Race | null
  /** True si este jugador es la computadora (IA) en modo PvE. */
  isAI?: boolean
}

export type GamePhase = 'lobby' | 'pickRace' | 'placement' | 'playing' | 'finished'

/** Terreno (fondo del tablero), sorteado por partida. */
export type Terrain = 'grass' | 'desert'

export type GameResult = PlayerId | 'draw'

export interface GameState {
  /** Todas las unidades indexadas por id. */
  units: Record<string, Unit>
  players: Record<PlayerId, PlayerState>
  /** De quién es el turno actual. */
  currentTurn: PlayerId
  /** AP restantes en el turno actual (arranca en 3). */
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

/** Recursos obtenidos al matar una unidad según su nivel (no varía por raza). */
export const KILL_REWARD_BY_LEVEL: Record<Level, number> = {
  1: 1,
  2: 2,
  3: 3,
}

// --- Tablas por raza (stats por nivel y costes de reclutamiento) ---

type RaceUnit = Exclude<UnitType, 'king'>

/**
 * Stat por (raza, tipo, nivel). El stat = vida = ataque, y también es el CAP
 * al que llega una unidad recién creada o tras fusionar.
 *
 * Diseño:
 *  - Humanos: baseline equilibrado (2/4/8 en todo).
 *  - Orcos:   melee duro (knight 3/6/12), ranged flojo (archer/mage 1/2/4).
 *  - Elfos:   ranged afinado (archer/mage 3/6/12), melee frágil (knight 1/2/4).
 */
export const STAT_BY_RACE: Record<Race, Record<RaceUnit, Record<Level, number>>> = {
  human: {
    knight: { 1: 2, 2: 4, 3: 8 },
    archer: { 1: 2, 2: 4, 3: 8 },
    mage: { 1: 2, 2: 4, 3: 8 },
  },
  orc: {
    knight: { 1: 3, 2: 6, 3: 12 },
    archer: { 1: 1, 2: 2, 3: 4 },
    mage: { 1: 1, 2: 2, 3: 4 },
  },
  elf: {
    knight: { 1: 1, 2: 2, 3: 4 },
    archer: { 1: 3, 2: 6, 3: 12 },
    mage: { 1: 3, 2: 6, 3: 12 },
  },
}

/** Coste de reclutamiento por (raza, tipo). */
export const COST_BY_RACE: Record<Race, Record<RaceUnit, number>> = {
  human: { knight: 2, archer: 3, mage: 4 },
  orc: { knight: 3, archer: 3, mage: 4 },
  elf: { knight: 2, archer: 4, mage: 5 },
}

/** Nombres temáticos de cada unidad por raza (solo cosmético). */
export const UNIT_NAMES: Record<Race, Record<UnitType, string>> = {
  human: { king: 'Rey', knight: 'Caballero', archer: 'Arquero', mage: 'Mago' },
  orc: { king: 'Rey', knight: 'Bruto', archer: 'Cazador', mage: 'Chamán' },
  elf: { king: 'Rey', knight: 'Centinela', archer: 'Tirador', mage: 'Druida' },
}

/** Etiqueta humana de la raza. */
export const RACE_LABEL: Record<Race, string> = {
  human: 'Humanos',
  orc: 'Orcos',
  elf: 'Elfos',
}

// --- Helpers de tablas (con backward-compat para partidas viejas) ---

/** Cap (= stat inicial) de una unidad de raza/tipo/nivel. */
export function statCap(race: Race, type: RaceUnit, level: Level): number {
  return STAT_BY_RACE[race][type][level]
}

/** Coste de reclutar una unidad de raza/tipo. */
export function recruitCost(race: Race, type: RaceUnit): number {
  return COST_BY_RACE[race][type]
}

/** Nombre temático de la unidad según la raza. */
export function unitLabel(race: Race, type: UnitType): string {
  return UNIT_NAMES[race][type]
}

/** Devuelve la raza del jugador, con fallback a 'human' (partidas pre-razas). */
export function playerRace(state: GameState, owner: PlayerId): Race {
  return state.players[owner]?.race ?? 'human'
}

/** ¿Este jugador es la computadora? */
export function isAIPlayer(state: GameState, owner: PlayerId): boolean {
  return state.players[owner]?.isAI === true
}
