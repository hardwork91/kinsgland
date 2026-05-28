import {
  KILL_REWARD_BY_LEVEL,
  MAX_AP_PER_TURN,
  playerRace,
  recruitCost,
  statCap,
  type Coord,
  type GameResult,
  type GameState,
  type Level,
  type PlayerId,
  type Race,
  type UnitType,
} from '../types/game'
import { createUnit } from './units'
import { chebyshev, kingOf, sameCoord, unitAt } from './board'
import {
  attackPower,
  healPower,
  validAttacks,
  validFusions,
  validHeals,
  validMoves,
  validRecruitCells,
} from './rules'

/**
 * Mueve una unidad a una casilla (se asume ya validado).
 * Coste: 1 AP para unidades normales; el REY consume TODOS los AP restantes.
 */
export function applyMove(state: GameState, unitId: string, dest: Coord): GameState {
  const unit = state.units[unitId]
  if (!unit) return state
  const moved = { ...unit, pos: { ...dest } }
  const apCost = unit.type === 'king' ? state.apRemaining : 1
  return {
    ...state,
    units: { ...state.units, [unitId]: moved },
    apRemaining: state.apRemaining - apCost,
  }
}

/** Recluta una unidad nivel 1 en una casilla (se asume ya validado). Cuesta recursos, NO AP. */
export function applyRecruit(
  state: GameState,
  owner: PlayerId,
  type: Exclude<UnitType, 'king'>,
  dest: Coord,
): GameState {
  const race = playerRace(state, owner)
  const cost = recruitCost(race, type)
  const unit = createUnit(type, owner, dest, race, 1)
  return {
    ...state,
    units: { ...state.units, [unit.id]: unit },
    players: {
      ...state.players,
      [owner]: { ...state.players[owner], resources: state.players[owner].resources - cost },
    },
  }
}

/**
 * Ataca a la unidad en una casilla (se asume ya validado). Cuesta 1 AP.
 * Sin contraataque. Si el objetivo muere: se quita, el atacante gana recursos
 * (según nivel) y, si era un rey, la partida termina.
 */
export function applyAttack(state: GameState, attackerId: string, target: Coord): GameState {
  const attacker = state.units[attackerId]
  if (!attacker) return state
  const targetUnit = unitAt(state, target)
  if (!targetUnit) return state
  const power = attackPower(attacker, chebyshev(attacker.pos, target))
  if (power === null || power <= 0) return state

  const units = { ...state.units }
  let players = state.players
  // RTDB borra las claves con `null`, así que al releer el estado `result` llega
  // como `undefined`. Lo normalizamos a `null` para no reinyectar `undefined`
  // en la escritura (RTDB rechaza toda la transacción si contiene `undefined`).
  let result: GameResult | null = state.result ?? null
  let phase = state.phase

  const newStat = targetUnit.stat - power
  if (newStat <= 0) {
    delete units[targetUnit.id]
    if (targetUnit.type === 'king') {
      result = attacker.owner
      phase = 'finished'
    } else {
      const reward = KILL_REWARD_BY_LEVEL[targetUnit.level]
      players = {
        ...players,
        [attacker.owner]: {
          ...players[attacker.owner],
          resources: players[attacker.owner].resources + reward,
        },
      }
    }
  } else {
    units[targetUnit.id] = { ...targetUnit, stat: newStat }
  }

  // El atacante queda marcado: no puede volver a atacar este turno.
  units[attacker.id] = { ...units[attacker.id], hasAttacked: true }

  return { ...state, units, players, apRemaining: state.apRemaining - 1, result, phase }
}

/**
 * Cura a un aliado en `targetCoord` con el mago `mageId` (se asume validado).
 * Cuesta 1 AP. La vida sube con falloff por distancia, hasta el cap del nivel del objetivo.
 */
export function applyHeal(state: GameState, mageId: string, targetCoord: Coord): GameState {
  const mage = state.units[mageId]
  const target = unitAt(state, targetCoord)
  if (!mage || !target) return state
  // Defensivo: validHeals nunca devuelve al rey, pero por si acaso.
  if (target.type === 'king') return state
  const power = healPower(mage, chebyshev(mage.pos, targetCoord))
  if (power === null || power <= 0) return state
  const race = playerRace(state, target.owner)
  const cap = statCap(race, target.type, target.level)
  const newStat = Math.min(target.stat + power, cap)
  return {
    ...state,
    units: { ...state.units, [target.id]: { ...target, stat: newStat } },
    apRemaining: state.apRemaining - 1,
  }
}

/**
 * Fusiona la unidad `sourceId` sobre la unidad en `targetCoord` (se asume validado:
 * mismo tipo, mismo nivel, adyacentes, nivel < 3). Cuesta 1 AP.
 * Resultado: la unidad destino sube de nivel, su stat = suma (con cap según la raza
 * del dueño), y la unidad origen desaparece. La pieza resultante queda en destino.
 */
export function applyFusion(state: GameState, sourceId: string, targetCoord: Coord): GameState {
  const source = state.units[sourceId]
  const target = unitAt(state, targetCoord)
  if (!source || !target) return state
  if (source.type === 'king' || target.type === 'king') return state

  const newLevel = (source.level + 1) as Level
  const race = playerRace(state, source.owner)
  const cap = statCap(race, source.type, newLevel)
  const newStat = Math.min(source.stat + target.stat, cap)

  const units = { ...state.units }
  delete units[source.id]
  units[target.id] = { ...target, level: newLevel, stat: newStat, pos: { ...targetCoord } }

  return { ...state, units, apRemaining: state.apRemaining - 1 }
}

/**
 * Coloca el rey de `player` en la columna `col` de su fila trasera (fase de colocación).
 * Cuando ambos reyes están colocados, la partida pasa a 'playing' (empieza el primero)
 * y arranca el reloj.
 */
export function placeKing(state: GameState, player: PlayerId, col: number): GameState {
  if (state.phase !== 'placement') return state
  if (state.currentTurn !== player) return state
  if (col < 0 || col > 7) return state
  const backRow = player === 'A' ? 0 : 7
  const race = playerRace(state, player)
  const king = createUnit('king', player, { row: backRow, col }, race)
  const units = { ...state.units, [king.id]: king }
  const other: PlayerId = player === 'A' ? 'B' : 'A'
  const otherPlaced = Object.values(units).some((u) => u.type === 'king' && u.owner === other)
  if (otherPlaced) {
    // El primer jugador recibe +1 moneda al empezar su primer turno.
    const fp = state.firstPlayer
    const players = {
      ...state.players,
      [fp]: { ...state.players[fp], resources: state.players[fp].resources + 1 },
    }
    return {
      ...state,
      units,
      players,
      phase: 'playing',
      currentTurn: fp,
      apRemaining: MAX_AP_PER_TURN,
      startedAtMs: Date.now(),
      turnNumber: 1,
    }
  }
  return { ...state, units, currentTurn: other }
}

/**
 * Aplica la elección de raza de un jugador en la fase 'pickRace'. Si era el último
 * jugador en elegir, pasamos a 'placement' con currentTurn = firstPlayer; si no,
 * alternamos el turno al otro jugador para que también elija.
 */
export function applyPickRace(state: GameState, player: PlayerId, race: Race): GameState {
  if (state.phase !== 'pickRace') return state
  if (state.currentTurn !== player) return state
  // No permitir cambiar la raza una vez elegida. Ojo: tras pasar por RTDB,
  // `race` puede llegar como `undefined` (RTDB borra las claves null), así que
  // usamos un check truthy para cubrir ambos casos (null y undefined).
  if (state.players[player].race) return state
  const players = {
    ...state.players,
    [player]: { ...state.players[player], race },
  }
  const other: PlayerId = player === 'A' ? 'B' : 'A'
  const bothChosen = Boolean(players[other].race)
  if (bothChosen) {
    // Ambos eligieron: arranca la colocación con el firstPlayer.
    return { ...state, players, phase: 'placement', currentTurn: state.firstPlayer }
  }
  // Falta el otro: alternamos turno.
  return { ...state, players, currentTurn: other }
}

/** Termina el turno actual: pasa al otro jugador, resetea AP/ataques, +1 moneda e incrementa el nº de turno. */
export function endTurn(state: GameState): GameState {
  const next: PlayerId = state.currentTurn === 'A' ? 'B' : 'A'
  // Reset del flag "ya atacó" en todas las unidades.
  const units: GameState['units'] = {}
  for (const id in state.units) {
    units[id] = { ...state.units[id], hasAttacked: false }
  }
  // Ingreso pasivo: el jugador que empieza turno recibe +1 moneda.
  const players = {
    ...state.players,
    [next]: { ...state.players[next], resources: state.players[next].resources + 1 },
  }
  return {
    ...state,
    units,
    players,
    currentTurn: next,
    apRemaining: MAX_AP_PER_TURN,
    turnNumber: state.turnNumber + 1,
  }
}

/**
 * Resuelve la partida al expirar el reloj de 15 min: gana el rey con más HP;
 * empate si tienen el mismo HP.
 */
export function resolveTimeout(state: GameState): GameState {
  if (state.phase === 'finished') return state
  const hpA = kingOf(state, 'A')?.stat ?? 0
  const hpB = kingOf(state, 'B')?.stat ?? 0
  let result: GameResult = 'draw'
  if (hpA > hpB) result = 'A'
  else if (hpB > hpA) result = 'B'
  return { ...state, phase: 'finished', result }
}

// ============================================================
//  Acciones del juego (para la "false API" / performAction)
// ============================================================

/** Acción que un jugador puede ejecutar. Es lo que viaja por la API/red. */
export type GameAction =
  | { type: 'join'; name: string }
  | { type: 'pickRace'; player: PlayerId; race: Race }
  | { type: 'placeKing'; player: PlayerId; col: number }
  | { type: 'move'; unitId: string; dest: Coord }
  | { type: 'attack'; attackerId: string; target: Coord }
  | { type: 'fuse'; sourceId: string; targetCoord: Coord }
  | { type: 'heal'; mageId: string; targetCoord: Coord }
  | { type: 'recruit'; unitType: Exclude<UnitType, 'king'>; dest: Coord }
  | { type: 'endTurn' }
  | { type: 'resolveTimeout' }

/**
 * Reducer central: valida y aplica una acción sobre el estado.
 * Si la acción no es legal, devuelve el estado SIN cambios.
 * Esta es la única fuente de verdad de "qué es legal" (no confiar en el cliente).
 */
export function applyAction(state: GameState, action: GameAction): GameState {
  // El segundo jugador se une: el lobby pasa a la fase de elección de razas.
  if (action.type === 'join') {
    if (state.phase !== 'lobby') return state
    return {
      ...state,
      players: { ...state.players, B: { ...state.players.B, name: action.name } },
      phase: 'pickRace',
      currentTurn: state.firstPlayer,
    }
  }
  if (action.type === 'pickRace') {
    return applyPickRace(state, action.player, action.race)
  }
  if (action.type === 'placeKing') {
    return placeKing(state, action.player, action.col)
  }
  if (action.type === 'resolveTimeout') {
    return resolveTimeout(state)
  }
  // El resto de acciones solo aplican durante el juego.
  if (state.phase !== 'playing') return state

  switch (action.type) {
    case 'move': {
      const unit = state.units[action.unitId]
      if (!unit || unit.owner !== state.currentTurn) return state
      if (state.apRemaining <= 0) return state
      if (unit.type === 'king' && state.apRemaining !== MAX_AP_PER_TURN) return state
      if (!validMoves(state, unit).some((c) => sameCoord(c, action.dest))) return state
      return applyMove(state, action.unitId, action.dest)
    }
    case 'attack': {
      const attacker = state.units[action.attackerId]
      if (!attacker || attacker.owner !== state.currentTurn) return state
      if (state.apRemaining <= 0) return state
      if (!validAttacks(state, attacker).some((c) => sameCoord(c, action.target))) return state
      return applyAttack(state, action.attackerId, action.target)
    }
    case 'fuse': {
      const source = state.units[action.sourceId]
      if (!source || source.owner !== state.currentTurn) return state
      if (state.apRemaining <= 0) return state
      if (!validFusions(state, source).some((c) => sameCoord(c, action.targetCoord))) return state
      return applyFusion(state, action.sourceId, action.targetCoord)
    }
    case 'heal': {
      const mage = state.units[action.mageId]
      if (!mage || mage.owner !== state.currentTurn) return state
      if (state.apRemaining <= 0) return state
      if (!validHeals(state, mage).some((c) => sameCoord(c, action.targetCoord))) return state
      return applyHeal(state, action.mageId, action.targetCoord)
    }
    case 'recruit': {
      const owner = state.currentTurn
      // Reclutar NO cuesta AP, solo recursos (según raza).
      const race = playerRace(state, owner)
      if (state.players[owner].resources < recruitCost(race, action.unitType)) return state
      if (!validRecruitCells(state, owner).some((c) => sameCoord(c, action.dest))) return state
      return applyRecruit(state, owner, action.unitType, action.dest)
    }
    case 'endTurn':
      return endTurn(state)
    default:
      return state
  }
}
