import {
  baseAttack,
  baseHp,
  KING_ATTACK,
  KING_HP,
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
 * Crea una unidad nueva con sus dos stats (ataque + HP).
 *
 *  - Rey: ataque KING_ATTACK (5), HP KING_HP (10). Igual entre razas.
 *  - Otras: en lvl 1 toma el base de la raza. En niveles superiores (creación
 *    directa, sin pasar por fusión) escala 2^(level-1) — equivale a la salida
 *    natural de fusionar lvl 1 → lvl 2 → lvl 3.
 *
 * Notas:
 *  - hp inicial = maxHp (unidad recién creada está a tope).
 *  - El ataque NO baja con el daño; solo cambia por fusión.
 */
export function createUnit(
  type: UnitType,
  owner: PlayerId,
  pos: Coord,
  race: Race,
  level: Level = 1,
): Unit {
  if (type === 'king') {
    return {
      id: nextUnitId(),
      type,
      owner,
      level,
      attack: KING_ATTACK,
      hp: KING_HP,
      maxHp: KING_HP,
      pos,
    }
  }
  const scale = level === 1 ? 1 : level === 2 ? 2 : 4
  const attack = baseAttack(race, type) * scale
  const hp = baseHp(race, type) * scale
  return {
    id: nextUnitId(),
    type,
    owner,
    level,
    attack,
    hp,
    maxHp: hp,
    pos,
  }
}
