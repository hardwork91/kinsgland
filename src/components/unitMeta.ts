import type { UnitType } from '../types/game'
import { asset } from '../asset'

export interface UnitMeta {
  name: string
  short: string
  desc: string
  /** Retrato base (nivel 1) para cartas/paneles. */
  portrait: string
}

export const UNIT_META: Record<UnitType, UnitMeta> = {
  king: {
    name: 'Rey',
    short: 'Tu líder',
    desc: 'Protégelo a toda costa. Si cae, pierdes. Ataca cuerpo a cuerpo.',
    portrait: asset('units/king.png'),
  },
  knight: {
    name: 'Caballero',
    short: 'Melee',
    desc: 'Cuerpo a cuerpo: golpea a 1 casilla. El muro de tu ejército y escolta del rey.',
    portrait: asset('units/knight-1.png'),
  },
  archer: {
    name: 'Arquero',
    short: 'Rango',
    desc: 'Ataque a distancia. Daño óptimo a 2 casillas (alcance 3). Frágil de cerca.',
    portrait: asset('units/archer-1.png'),
  },
  mage: {
    name: 'Mago',
    short: 'Soporte',
    desc: 'Cura aliados o ataca enemigos según el objetivo. Óptimo adyacente (alcance 3).',
    portrait: asset('units/mage-1.png'),
  },
}
