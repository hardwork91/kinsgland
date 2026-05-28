import {
  playerRace,
  recruitCost,
  type GameState,
  type PlayerId,
  type UnitType,
} from '../types/game'
import { applyAction, type GameAction } from '../game/actions'
import { chebyshev, kingOf, neighbors, unitAt } from '../game/board'
import {
  attackPower,
  validAttacks,
  validFusions,
  validHeals,
  validMoves,
  validRecruitCells,
} from '../game/rules'

/**
 * Heurística "avanzada" para la IA:
 *   - Función de evaluación rica que considera HP de reyes, valor de piezas,
 *     posición vs rey enemigo, escolta del propio, recursos y exposición.
 *   - Planning DFS con poda top-K por nivel de AP. Encuentra combos de turno
 *     (mover → atacar, reclutar → ataque a distancia, fusión → potenciar).
 */

const RECRUIT_TYPES: Exclude<UnitType, 'king'>[] = ['knight', 'archer', 'mage']
const TOP_K = 6 // candidatos considerados por paso

interface PlannedTurn {
  actions: GameAction[]
  score: number
}

/**
 * Calcula la mejor secuencia de acciones para `perspective` en su turno actual.
 * No incluye el `endTurn` final (eso lo dispara el driver).
 */
export function planTurn(state: GameState, perspective: PlayerId): GameAction[] {
  if (state.phase !== 'playing') return []
  if (state.currentTurn !== perspective) return []
  const plan = planRecursive(state, perspective)
  return plan.actions
}

function planRecursive(state: GameState, perspective: PlayerId): PlannedTurn {
  // Si no hay AP, terminamos.
  if (state.apRemaining <= 0) {
    return { actions: [], score: scoreState(state, perspective) }
  }
  const baseScore = scoreState(state, perspective)
  const candidates = enumerateActions(state, perspective)
  // Evalua cada candidato y aplica top-K
  const evaluated: { action: GameAction; next: GameState; immediate: number }[] = []
  for (const a of candidates) {
    const next = applyAction(state, a)
    if (next === state) continue // acción inválida (reducer la rechazó)
    evaluated.push({ action: a, next, immediate: scoreState(next, perspective) - baseScore })
  }
  evaluated.sort((a, b) => b.immediate - a.immediate)
  const topK = evaluated.slice(0, TOP_K)

  // Mejor opción base: no hacer nada más este turno.
  let best: PlannedTurn = { actions: [], score: baseScore }

  for (const cand of topK) {
    const sub = planRecursive(cand.next, perspective)
    if (sub.score > best.score) {
      best = { actions: [cand.action, ...sub.actions], score: sub.score }
    }
  }
  return best
}

/** Genera la lista de acciones legales para el jugador desde este estado. */
function enumerateActions(state: GameState, perspective: PlayerId): GameAction[] {
  const out: GameAction[] = []

  // Reclutar (no consume AP, sí recursos)
  const race = playerRace(state, perspective)
  const resources = state.players[perspective].resources
  const recruitCells = validRecruitCells(state, perspective)
  if (recruitCells.length > 0) {
    for (const type of RECRUIT_TYPES) {
      if (resources >= recruitCost(race, type)) {
        // Enumera todas las casillas posibles (la evaluación elegirá la mejor).
        for (const dest of recruitCells) {
          out.push({ type: 'recruit', unitType: type, dest })
        }
      }
    }
  }

  // Acciones de unidades propias (cada una cuesta 1 AP, salvo king que es todo)
  for (const u of Object.values(state.units)) {
    if (u.owner !== perspective) continue
    // El rey solo puede moverse al inicio del turno
    if (u.type !== 'king' || state.apRemaining === 3) {
      for (const dest of validMoves(state, u)) {
        out.push({ type: 'move', unitId: u.id, dest })
      }
    }
    for (const target of validAttacks(state, u)) {
      out.push({ type: 'attack', attackerId: u.id, target })
    }
    for (const dst of validFusions(state, u)) {
      out.push({ type: 'fuse', sourceId: u.id, targetCoord: dst })
    }
    for (const dst of validHeals(state, u)) {
      out.push({ type: 'heal', mageId: u.id, targetCoord: dst })
    }
  }
  return out
}

/**
 * Evalúa qué tan buena es esta posición para `perspective`. Más alto = mejor.
 * Bandera: la función debe ser SIMÉTRICA — si negamos para el enemigo, su
 * "bueno" es nuestro "malo".
 */
export function scoreState(state: GameState, perspective: PlayerId): number {
  const enemy: PlayerId = perspective === 'A' ? 'B' : 'A'

  // Final de partida
  if (state.phase === 'finished') {
    if (state.result === perspective) return 100000
    if (state.result === enemy) return -100000
    return -200 // empate (timeout): no es lo que queremos
  }

  let score = 0
  const myKing = kingOf(state, perspective)
  const enemyKing = kingOf(state, enemy)
  if (!myKing) return -100000
  if (!enemyKing) return 100000

  // Vida de los reyes (peso máximo: el objetivo es matar al enemigo)
  score += myKing.hp * 60
  score -= enemyKing.hp * 60

  // Valor de las unidades: HP * 5 + ataque * 3 + bonus por nivel (mayor stat
  // global). Refleja "cuánto daño puede causar y aguantar" antes de morir.
  for (const u of Object.values(state.units)) {
    if (u.type === 'king') continue
    const value = u.hp * 5 + u.attack * 3 + u.level * 4
    if (u.owner === perspective) score += value
    else score -= value
  }

  // Recursos para reclutamiento futuro
  score += state.players[perspective].resources * 2
  score -= state.players[enemy].resources * 2

  // Presión: mis unidades cerca del rey enemigo
  for (const u of Object.values(state.units)) {
    if (u.owner !== perspective || u.type === 'king') continue
    const dist = chebyshev(u.pos, enemyKing.pos)
    score += Math.max(0, 8 - dist) * 1.5
  }
  // Distancia del rey enemigo a mis unidades de ataque (penaliza si está lejos)
  // (parte del score anterior)

  // Escolta del propio rey: aliados adyacentes lo hacen intocable.
  const myEscort = countAlliedNeighbors(state, myKing.pos, perspective)
  score += myEscort * 18 // muy importante

  // El rey enemigo SIN escolta es objetivo prioritario
  const enemyEscort = countAlliedNeighbors(state, enemyKing.pos, enemy)
  if (enemyEscort === 0) {
    // Buscamos atacar al rey enemigo: bonus si una unidad mía está en rango.
    for (const u of Object.values(state.units)) {
      if (u.owner !== perspective || u.type === 'king') continue
      const dist = chebyshev(u.pos, enemyKing.pos)
      const power = attackPower(u, dist)
      if (power !== null && power > 0) {
        score += 25 // hay tiro al rey
      }
    }
  }

  // Exposición: por cada unidad mía amenazada por enemigos, penaliza.
  for (const u of Object.values(state.units)) {
    if (u.owner !== perspective) continue
    const threat = incomingThreat(state, u, enemy)
    if (u.type === 'king') {
      score -= threat * 20 // rey en peligro = catastrófico
    } else {
      score -= threat * 2
    }
  }
  return score
}

/** Número de aliados adyacentes a una casilla. */
function countAlliedNeighbors(state: GameState, pos: { row: number; col: number }, owner: PlayerId): number {
  let n = 0
  for (const c of neighbors(pos)) {
    const u = unitAt(state, c)
    if (u && u.owner === owner) n++
  }
  return n
}

/**
 * Daño máximo que el enemigo podría hacer a esta unidad si tuviera AP.
 * Suma daños potenciales (no exactamente lo que pasaría, pero buena proxy).
 */
function incomingThreat(state: GameState, target: import('../types/game').Unit, enemy: PlayerId): number {
  let threat = 0
  for (const u of Object.values(state.units)) {
    if (u.owner !== enemy) continue
    if (u.hasAttacked) continue
    const dist = chebyshev(u.pos, target.pos)
    const power = attackPower(u, dist)
    if (power !== null && power > 0) threat += power
  }
  return threat
}
