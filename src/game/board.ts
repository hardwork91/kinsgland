import { BOARD_SIZE, type Coord, type GameState, type Unit } from '../types/game'

/** ¿La coordenada está dentro del tablero 8x8? */
export function inBounds(c: Coord): boolean {
  return c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE
}

/** Distancia Chebyshev (8 vecinos): el número de "anillos" entre dos casillas. */
export function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col
}

/** Las hasta 8 casillas adyacentes (Chebyshev) dentro del tablero. */
export function neighbors(c: Coord): Coord[] {
  const result: Coord[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const n = { row: c.row + dr, col: c.col + dc }
      if (inBounds(n)) result.push(n)
    }
  }
  return result
}

/** Unidad en una casilla, o null si está vacía. */
export function unitAt(state: GameState, c: Coord): Unit | null {
  for (const id in state.units) {
    const u = state.units[id]
    if (u.pos.row === c.row && u.pos.col === c.col) return u
  }
  return null
}

/** Todas las unidades de un jugador. */
export function unitsOf(state: GameState, owner: Unit['owner']): Unit[] {
  return Object.values(state.units).filter((u) => u.owner === owner)
}

/** El rey de un jugador (o null si ya no existe). */
export function kingOf(state: GameState, owner: Unit['owner']): Unit | null {
  return Object.values(state.units).find((u) => u.owner === owner && u.type === 'king') ?? null
}
