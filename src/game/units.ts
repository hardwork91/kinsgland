import {
  KING_STAT,
  STAT_CAP_BY_LEVEL,
  type Coord,
  type Level,
  type PlayerId,
  type Unit,
  type UnitType,
} from '../types/game'

let idCounter = 0

/** Genera un id único de unidad para la sesión local. */
export function nextUnitId(): string {
  idCounter += 1
  return `u${idCounter}`
}

/** Crea una unidad nueva. El rey arranca en KING_STAT; el resto al cap de su nivel. */
export function createUnit(
  type: UnitType,
  owner: PlayerId,
  pos: Coord,
  level: Level = 1,
): Unit {
  const stat = type === 'king' ? KING_STAT : STAT_CAP_BY_LEVEL[level]
  return { id: nextUnitId(), type, owner, level, stat, pos }
}
