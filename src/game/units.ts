import {
  KING_STAT,
  statCap,
  type Coord,
  type Level,
  type PlayerId,
  type Race,
  type Unit,
  type UnitType,
} from '../types/game'

let seq = 0

/**
 * Genera un id de unidad ÚNICO GLOBAL. Debe ser único entre clientes distintos
 * (multijugador): un contador por cliente colisionaría (ambos generarían "u1"),
 * sobrescribiendo unidades en la base compartida. Por eso usamos aleatoriedad.
 */
export function nextUnitId(): string {
  seq += 1
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `u_${Date.now().toString(36)}_${seq}_${rand}`
}

/**
 * Crea una unidad nueva. El rey arranca en KING_STAT (idéntico entre razas);
 * el resto al cap de su nivel SEGÚN LA RAZA del jugador.
 */
export function createUnit(
  type: UnitType,
  owner: PlayerId,
  pos: Coord,
  race: Race,
  level: Level = 1,
): Unit {
  const stat = type === 'king' ? KING_STAT : statCap(race, type, level)
  return { id: nextUnitId(), type, owner, level, stat, pos }
}
