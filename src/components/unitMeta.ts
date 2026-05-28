import type { Level, Race, UnitType } from '../types/game'
import { asset } from '../asset'

export interface UnitMeta {
  short: string
  desc: string
}

/** Metadatos COSMÉTICOS independientes de raza (descripción + etiqueta corta). */
export const UNIT_META: Record<UnitType, UnitMeta> = {
  king: {
    short: 'Tu líder',
    desc: 'Protégelo a toda costa. Si cae, pierdes. Ataca cuerpo a cuerpo.',
  },
  knight: {
    short: 'Melee',
    desc: 'Cuerpo a cuerpo: golpea a 1 casilla. El muro de tu ejército y escolta del rey.',
  },
  archer: {
    short: 'Rango',
    desc: 'Ataque a distancia. Daño óptimo a 2 casillas (alcance 3). Frágil de cerca.',
  },
  mage: {
    short: 'Soporte',
    desc: 'Cura aliados o ataca enemigos según el objetivo. Óptimo adyacente (alcance 3).',
  },
}

/**
 * Ruta del retrato (sprite color base, sin -red) de una unidad de raza/tipo/nivel.
 * El rey no usa nivel. Usado en paneles de información y catálogo.
 */
export function unitPortrait(race: Race, type: UnitType, level: Level = 1): string {
  if (type === 'king') return asset(`units/${race}-king.png`)
  return asset(`units/${race}-${type}-${level}.png`)
}
