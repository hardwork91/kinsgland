import { useState } from 'react'
import { BOARD_SIZE, type Race, type Unit, type UnitType } from '../types/game'
import { asset } from '../asset'

const OWNER_COLOR: Record<Unit['owner'], string> = {
  A: '#3b82f6', // azul
  B: '#ef4444', // rojo
}

/**
 * Ruta de la imagen según raza, tipo, dueño y nivel de fusión (en public/units/).
 * - Cada raza tiene su propio set de sprites: `{race}-...` (human/orc/elf).
 * - Jugador A usa la base; jugador B usa la variante "-red".
 * - No-rey: `{race}-{tipo}[-red]-{nivel}.png` (ej. orc-knight-2.png).
 * - Rey:    `{race}-king[-red].png` (sin nivel).
 * Si el archivo falta, se usa la forma SVG de respaldo.
 */
function imgSrc(unit: Unit, race: Race): string {
  const red = unit.owner === 'B' ? '-red' : ''
  if (unit.type === 'king') return asset(`units/${race}-king${red}.png`)
  return asset(`units/${race}-${unit.type}${red}-${unit.level}.png`)
}

const STAR_POINTS =
  '50,6 60.58,35.44 91.85,36.40 67.12,55.56 75.86,85.60 50,68 24.14,85.60 32.88,55.56 8.15,36.40 39.42,35.44'

/** Forma geométrica de respaldo (si no hay imagen para el tipo). */
function Shape({ type, color }: { type: UnitType; color: string }) {
  const common = { fill: color, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 3 }
  switch (type) {
    case 'king':
      return <polygon points={STAR_POINTS} {...common} />
    case 'knight':
      return <circle cx={50} cy={50} r={38} {...common} />
    case 'archer':
      return <polygon points="50,12 88,84 12,84" {...common} />
    case 'mage':
      return <polygon points="50,8 92,50 50,92 8,50" {...common} />
  }
}

/** Imagen de la unidad con fallback a la forma SVG si el archivo no existe. */
function UnitVisual({ unit, race }: { unit: Unit; race: Race }) {
  const [imgError, setImgError] = useState(false)
  const color = OWNER_COLOR[unit.owner]

  if (imgError) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow">
        <Shape type={unit.type} color={color} />
      </svg>
    )
  }
  return (
    <img
      src={imgSrc(unit, race)}
      alt={unit.type}
      draggable={false}
      onError={() => setImgError(true)}
      className="h-full w-full object-contain drop-shadow"
    />
  )
}

/** Puntos de nivel (1-3) sobre la pieza. El rey no muestra nivel. */
function LevelDots({ unit }: { unit: Unit }) {
  if (unit.type === 'king') return null
  return (
    <div className="absolute bottom-[2%] left-1/2 flex -translate-x-1/2 gap-[3px]">
      {Array.from({ length: unit.level }).map((_, i) => (
        <span
          key={i}
          className="block h-[5px] w-[5px] rounded-full bg-white"
          style={{ boxShadow: '0 0 2px 2px rgba(0,0,0,0.8)' }}
        />
      ))}
    </div>
  )
}

interface PieceProps {
  unit: Unit
  /** Raza del dueño (define qué sprite cargar). */
  race: Race
  selected: boolean
  /** El tablero está rotado 180º: contrarrota el arte/insignias para que queden derechos. */
  flip?: boolean
  onClick: () => void
}

/** Una unidad renderizada en una capa absoluta sobre el tablero. */
export function Piece({ unit, race, selected, flip = false, onClick }: PieceProps) {
  const cell = 100 / BOARD_SIZE
  const left = unit.pos.col * cell
  const top = unit.pos.row * cell
  const color = OWNER_COLOR[unit.owner]

  return (
    <button
      type="button"
      onClick={onClick}
      data-unit-id={unit.id}
      data-unit-type={unit.type}
      data-owner={unit.owner}
      className="pointer-events-auto absolute flex items-center justify-center transition-[left,top] duration-200 ease-out focus:outline-none"
      style={{ left: `${left}%`, top: `${top}%`, width: `${cell}%`, height: `${cell}%` }}
    >
      {/* Selector amarillo (igual que los demás highlights: solo box-shadow, redondeado, inset 2px) */}
      {selected && (
        <span
          className="pointer-events-none absolute inset-[2px] rounded-md"
          style={{ boxShadow: 'inset 0 0 16px 5px rgba(253, 224, 71, 0.75)' }}
        />
      )}

      {/* Imagen de la unidad (contrarrotada si el tablero está rotado) */}
      <div
        className="relative flex h-[90%] w-[90%] items-center justify-center rounded-lg"
        style={flip ? { transform: 'rotate(180deg)' } : undefined}
      >
        <UnitVisual key={imgSrc(unit, race)} unit={unit} race={race} />

        {/* Stat (vida = ataque) como insignia */}
        <span
          className="absolute -right-[5%] -top-[5%] flex h-[36%] w-[36%] items-center justify-center rounded-full text-[100%] font-bold text-white"
          style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          {unit.stat}
        </span>

        <LevelDots unit={unit} />
      </div>
    </button>
  )
}
