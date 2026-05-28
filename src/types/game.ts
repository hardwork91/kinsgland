// Tipos base del estado de KingsLand.
// La lógica completa de reglas se implementa en Fase 1 (ver ROADMAP.md).

export const BOARD_SIZE = 8

export type PlayerId = 'A' | 'B'

export type UnitType = 'king' | 'knight' | 'archer' | 'mage'

/** Nivel de unidad (el rey no usa nivel). */
export type Level = 1 | 2 | 3

/** Razas disponibles. El rey es idéntico entre razas (HP 10, ataque 5). */
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
  /**
   * Ataque base de la unidad. Constante: no baja con el daño recibido.
   * Para arquero/mago hay falloff por distancia que se calcula sobre este valor.
   * La fusión lo duplica.
   */
  attack: number
  /** Vida actual. Cuando llega a 0 (o menos), la unidad muere. */
  hp: number
  /** Vida máxima a la que puede curarse. La fusión suma los maxHp de las dos fuentes. */
  maxHp: number
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
export const GAME_DURATION_MS = 15 * 60 * 1000 // 15 min

/** Recursos obtenidos al matar una unidad según su nivel (no varía por raza). */
export const KILL_REWARD_BY_LEVEL: Record<Level, number> = {
  1: 1,
  2: 2,
  3: 3,
}

// --- Tablas base por raza (lvl 1 únicamente; niveles superiores se derivan vía fusión) ---

type RaceUnit = Exclude<UnitType, 'king'>

/**
 * Ataque BASE (lvl 1) por (raza, tipo). La fusión lo duplica en cada nivel:
 *   lvl 1: base. lvl 2: base*2. lvl 3: base*4.
 *
 * El rey NO se fusiona ni sube de nivel: el valor de 'king' es directamente
 * lo que muestra en partida (constante por raza).
 *
 * Diseño:
 *  - Humanos: baseline equilibrado (atk 2 en todo).
 *  - Orcos:   melee duro (knight atk 3), ranged flojo (archer/mage atk 1).
 *  - Elfos:   ranged afinado (archer/mage atk 3), melee frágil (knight atk 1).
 *  - Reyes:   por ahora iguales entre razas (atk 5 / HP 10). Ajustables.
 */
export const BASE_ATTACK: Record<Race, Record<UnitType, number>> = {
  human: { king: 5, knight: 2, archer: 2, mage: 2 },
  orc: { king: 5, knight: 3, archer: 1, mage: 1 },
  elf: { king: 5, knight: 1, archer: 3, mage: 3 },
}

/**
 * HP BASE (lvl 1) por (raza, tipo). Ratio 2:1 contra ataque por defecto.
 * El rey usa su HP directamente (no se fusiona).
 */
export const BASE_HP: Record<Race, Record<UnitType, number>> = {
  human: { king: 10, knight: 4, archer: 4, mage: 4 },
  orc: { king: 10, knight: 6, archer: 2, mage: 2 },
  elf: { king: 10, knight: 2, archer: 6, mage: 6 },
}

/** Coste de reclutamiento por (raza, tipo no-rey). El rey no se recluta. */
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

/** Ataque base (lvl 1) para una raza/tipo. Para king devuelve el ataque del rey. */
export function baseAttack(race: Race, type: UnitType): number {
  return BASE_ATTACK[race][type]
}

/** HP base (lvl 1) para una raza/tipo. Para king devuelve el HP del rey. */
export function baseHp(race: Race, type: UnitType): number {
  return BASE_HP[race][type]
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
