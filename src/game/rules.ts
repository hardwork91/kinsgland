import {
  STAT_CAP_BY_LEVEL,
  type Coord,
  type GameState,
  type Level,
  type Unit,
} from '../types/game'
import { chebyshev, kingOf, neighbors, unitAt } from './board'

/**
 * Poder de ataque de una unidad a una distancia dada.
 * Devuelve null si el objetivo está fuera de alcance.
 * - Caballero / Rey: solo melee (dist 1), daño = stat.
 * - Arquero: sweet spot dist 2; daño = stat - |dist - 2|; alcance 1..3.
 * - Mago: sweet spot dist 1; daño = stat - (dist - 1); alcance 1..3.
 */
export function attackPower(attacker: Unit, dist: number): number | null {
  if (dist < 1) return null
  switch (attacker.type) {
    case 'king':
    case 'knight':
      return dist === 1 ? attacker.stat : null
    case 'archer':
      return dist <= 3 ? attacker.stat - Math.abs(dist - 2) : null
    case 'mage':
      return dist <= 3 ? attacker.stat - (dist - 1) : null
  }
}

/** Poder de curación del mago: mismo falloff que su ataque (sweet spot adyacente). */
export function healPower(mage: Unit, dist: number): number | null {
  if (mage.type !== 'mage') return null
  if (dist < 1 || dist > 3) return null
  return mage.stat - (dist - 1)
}

/** ¿El rey tiene escolta? (al menos un aliado adyacente → intocable). */
export function isEscorted(state: GameState, king: Unit): boolean {
  return neighbors(king.pos).some((n) => {
    const u = unitAt(state, n)
    return u !== null && u.owner === king.owner
  })
}

/** Casillas vacías adyacentes a las que la unidad puede moverse (1 AP c/u). */
export function validMoves(state: GameState, unit: Unit): Coord[] {
  return neighbors(unit.pos).filter((n) => unitAt(state, n) === null)
}

/** Enemigos a los que la unidad puede atacar (con daño > 0, respetando escolta del rey). */
export function validAttacks(state: GameState, unit: Unit): Coord[] {
  // Una unidad que ya atacó este turno no puede volver a atacar.
  if (unit.hasAttacked) return []
  const result: Coord[] = []
  for (const id in state.units) {
    const target = state.units[id]
    if (target.owner === unit.owner) continue
    const dist = chebyshev(unit.pos, target.pos)
    const power = attackPower(unit, dist)
    if (power === null || power <= 0) continue
    // Escolta: no se puede atacar a un rey con aliado adyacente.
    if (target.type === 'king' && isEscorted(state, target)) continue
    result.push(target.pos)
  }
  return result
}

/** Aliados a los que un mago puede curar (no rey, no a sí mismo, por debajo del cap). */
export function validHeals(state: GameState, unit: Unit): Coord[] {
  if (unit.type !== 'mage') return []
  const result: Coord[] = []
  for (const id in state.units) {
    const target = state.units[id]
    if (target.id === unit.id) continue
    if (target.owner !== unit.owner) continue
    if (target.type === 'king') continue
    const dist = chebyshev(unit.pos, target.pos)
    const power = healPower(unit, dist)
    if (power === null || power <= 0) continue
    const cap = STAT_CAP_BY_LEVEL[target.level]
    if (target.stat >= cap) continue // ya está al máximo
    result.push(target.pos)
  }
  return result
}

/** Aliados adyacentes con los que la unidad puede fusionar (mismo tipo y nivel, nivel < 3). */
export function validFusions(state: GameState, unit: Unit): Coord[] {
  if (unit.type === 'king') return []
  if (unit.level >= 3) return []
  return neighbors(unit.pos)
    .filter((n) => {
      const u = unitAt(state, n)
      return (
        u !== null &&
        u.owner === unit.owner &&
        u.type === unit.type &&
        u.level === unit.level &&
        u.id !== unit.id
      )
    })
}

/** Cap de stat para un nivel dado. */
export function statCap(level: Level): number {
  return STAT_CAP_BY_LEVEL[level]
}

/** Casillas vacías adyacentes al rey donde se puede reclutar. */
export function validRecruitCells(state: GameState, owner: Unit['owner']): Coord[] {
  const king = kingOf(state, owner)
  if (!king) return []
  return neighbors(king.pos).filter((n) => unitAt(state, n) === null)
}
