import { RECRUIT_COST, type UnitType } from '../types/game'
import { UNIT_META } from './unitMeta'
import { OrnateFrame } from './OrnateFrame'
import { SectionTitle } from './SectionTitle'
import { Coin } from './Coin'

type RecruitType = Exclude<UnitType, 'king'>
const TYPES: RecruitType[] = ['knight', 'archer', 'mage']

/** Panel izquierdo: catálogo informativo de las unidades + slot bloqueado. */
export function UnitsCatalog() {
  return (
    <aside className="w-64 shrink-0">
      <OrnateFrame className="flex flex-col rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c] shadow-lg shadow-black/40">
        <SectionTitle>Tus unidades</SectionTitle>
        <div className="flex flex-col gap-2">
          {TYPES.map((t) => {
            const m = UNIT_META[t]
            return (
              <div
                key={t}
                className="flex items-center gap-2 rounded-md border border-amber-700/30 bg-slate-800/60 p-2"
              >
                <img
                  src={m.portrait}
                  alt={m.name}
                  className="h-12 w-12 shrink-0 object-contain drop-shadow"
                  draggable={false}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100">{m.name}</span>
                    <span className="flex items-center gap-1 font-mono text-xs text-amber-300">
                      <Coin className="h-3.5 w-3.5" />
                      {RECRUIT_COST[t]}
                    </span>
                  </div>
                  <p className="text-xs leading-tight text-slate-400">{m.desc}</p>
                </div>
              </div>
            )
          })}

          {/* Slot bloqueado (placeholder de contenido futuro) */}
          <div className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-800/30 p-2 opacity-60">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-900 text-xl">
              🔒
            </div>
            <div>
              <div className="font-bold text-slate-400">Bloqueado</div>
              <p className="text-xs text-slate-500">Se desbloquea en Nivel 6</p>
            </div>
          </div>
        </div>
      </OrnateFrame>
    </aside>
  )
}
