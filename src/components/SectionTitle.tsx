import type { ReactNode } from 'react'

const ORNAMENT = '/units/title-ornament.png'

/** Título de sección con un adorno a cada lado (el derecho reflejado en X). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-2">
      <img src={ORNAMENT} alt="" className="h-5 w-auto" draggable={false} />
      <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">
        {children}
      </h2>
      <img src={ORNAMENT} alt="" className="h-5 w-auto -scale-x-100" draggable={false} />
    </div>
  )
}
