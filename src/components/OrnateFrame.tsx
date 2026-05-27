import type { CSSProperties, ReactNode } from 'react'

const CORNER = '/units/frame-corner.png'
const SIDE = '/units/frame-side.png'

interface Props {
  children: ReactNode
  /** Grosor del marco en px (tamaño de esquina y de los lados). */
  size?: number
  /** Padding interior del contenido (px). Por defecto = size. */
  pad?: number
  /** Clases del contenedor del contenido (fondo, etc.). */
  className?: string
  /** Clases del contenedor raíz (ej. h-full). */
  rootClassName?: string
  /** Mostrar las esquinas ornamentales. Si es false, los lados recorren todo el borde. */
  corners?: boolean
  /** Desaturar el marco (tonos de gris). */
  grayscale?: boolean
  /** Renderizar los bordes superior e inferior. Si es false, solo laterales. */
  topBottom?: boolean
}

/**
 * Marco ornamental construido con dos texturas:
 * - frame-corner.png: esquina superior izquierda (se rota 90° en cada esquina).
 * - frame-side.png: borde superior (se repite a lo largo de cada lado; los laterales se rotan).
 */
export function OrnateFrame({
  children,
  size = 26,
  pad,
  className = '',
  rootClassName = '',
  corners = true,
  grayscale = false,
  topBottom = true,
}: Props) {
  const t = size
  // Sin esquinas, los lados cubren todo el borde (inset 0); con esquinas, dejan hueco (inset t).
  const edge = corners ? t : 0
  const sideBg: CSSProperties = {
    backgroundImage: `url(${SIDE})`,
    backgroundRepeat: 'repeat-x',
    backgroundSize: `${t}px ${t}px`,
  }
  // Barra horizontal larga que, rotada, recubre un lateral (recortada por overflow).
  const vBarBase: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: t,
    width: '400vmax',
    transformOrigin: 'top left',
    ...sideBg,
  }
  // Lado derecho: rotado +90°.
  const vBarRight: CSSProperties = {
    ...vBarBase,
    transform: `rotate(90deg) translateY(-${t}px)`,
  }
  // Lado izquierdo: orientación opuesta (rotado -90°, 180° respecto al derecho).
  const vBarLeft: CSSProperties = {
    ...vBarBase,
    transform: 'rotate(-90deg) translateX(-100%)',
  }

  return (
    <div className={`relative ${rootClassName}`}>
      <div className={className} style={{ padding: pad ?? t }}>
        {children}
      </div>

      {/* Marco decorativo (overlay) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ filter: grayscale ? 'grayscale(1)' : undefined }}
      >
        {topBottom && (
          <>
            {/* Lado superior */}
            <div
              className="absolute"
              style={{ top: 0, left: edge, right: edge, height: t, ...sideBg }}
            />
            {/* Lado inferior (volteado) */}
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: edge,
                right: edge,
                height: t,
                transform: 'scaleY(-1)',
                ...sideBg,
              }}
            />
          </>
        )}
        {/* Lado izquierdo */}
        <div
          className="absolute overflow-hidden"
          style={{ top: edge, bottom: edge, left: 0, width: t }}
        >
          <div style={vBarLeft} />
        </div>
        {/* Lado derecho */}
        <div
          className="absolute overflow-hidden"
          style={{ top: edge, bottom: edge, right: 0, width: t }}
        >
          <div style={vBarRight} />
        </div>

        {/* Esquinas (corner = sup-izq; se rota para las demás) */}
        {corners && (
          <>
            <img
              src={CORNER}
              alt=""
              style={{ position: 'absolute', top: 0, left: 0, width: t, height: t }}
            />
            <img
              src={CORNER}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: t,
                height: t,
                transform: 'rotate(90deg)',
              }}
            />
            <img
              src={CORNER}
              alt=""
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: t,
                height: t,
                transform: 'rotate(180deg)',
              }}
            />
            <img
              src={CORNER}
              alt=""
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: t,
                height: t,
                transform: 'rotate(270deg)',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
