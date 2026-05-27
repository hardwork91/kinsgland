function Item({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-5 w-5 rounded"
        style={{ backgroundColor: 'transparent', boxShadow: `inset 0 0 8px 3px ${color}` }}
      />
      <div className="leading-tight">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-200">{title}</div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
    </div>
  )
}

/** Leyenda inferior de los colores de casilla. */
export function BottomLegend() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-amber-800/40 bg-slate-950/80 px-4 py-2">
      <Item color="rgba(96,165,250,0.9)" title="Movimiento" desc="Puedes mover aquí" />
      <Item color="rgba(239,68,68,0.9)" title="Ataque" desc="Puede atacar aquí" />
      <Item color="rgba(168,85,247,0.9)" title="Fusión" desc="Une 2 iguales" />
      <div className="flex items-center gap-2">
        <span className="text-lg">👑</span>
        <div className="leading-tight">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-200">Rey</div>
          <div className="text-[11px] text-slate-400">Protégelo a toda costa</div>
        </div>
      </div>
    </footer>
  )
}
