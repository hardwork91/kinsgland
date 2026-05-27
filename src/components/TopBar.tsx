import type { GameState } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { Clock } from './Clock'
import { ICON_BTN } from './theme'
import { OrnateFrame } from './OrnateFrame'
import { Coin } from './Coin'
import { asset } from '../asset'

const BOX_FILL =
  'rounded-[1.5rem] bg-gradient-to-b from-[#525c68] to-[#22262c]'

const RANK = 'Bronce III' // placeholder hasta tener sistema de progresión

export function TopBar({ state }: { state: GameState }) {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const reset = useGameStore((s) => s.reset)

  const me = state.players[state.currentTurn]

  return (
    <header className="flex flex-wrap items-center gap-2 border-b-2 border-amber-800/50 bg-slate-950/90 px-3 pt-2 lg:gap-3 lg:px-4">
      {/* Logo */}
      <img
        src={asset('units/logo.png')}
        alt="KingsLand"
        className="h-12 w-auto object-contain drop-shadow lg:h-20"
        draggable={false}
      />

      {/* Identidad del jugador */}
      <OrnateFrame size={18} pad={10} className={`flex items-center gap-2 ${BOX_FILL}`}>
        {/* slot: avatar -> /ui/avatar.png */}
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-lg ring-2 ring-amber-600/60">
          👤
        </div>
        <div className="leading-tight">
          <div className="font-bold text-neutral-100">{me.name}</div>
          <div className="text-xs text-amber-300/80">Rango {RANK}</div>
        </div>
      </OrnateFrame>

      {/* Monedas (recurso de la partida) */}
      <OrnateFrame size={18} pad={10} className={`flex items-center gap-1 ${BOX_FILL}`}>
        <Coin className="h-5 w-5" />
        <span className="font-bold text-neutral-100">{me.resources}</span>
      </OrnateFrame>

      {/* Turno + reloj */}
      <OrnateFrame
        size={18}
        pad={10}
        rootClassName="ml-auto"
        className={`flex flex-col items-center ${BOX_FILL}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
          Turno {state.turnNumber}
        </span>
        <Clock />
      </OrnateFrame>

      {/* Iconos */}
      <div className="flex items-center gap-1">
        <button type="button" title="Chat (próximamente)" className={ICON_BTN}>
          💬
        </button>
        <button type="button" title="Salir al menú" onClick={() => void reset()} className={ICON_BTN}>
          ☰
        </button>
        <button
          type="button"
          title={muted ? 'Activar sonido' : 'Silenciar'}
          onClick={toggleMute}
          className={ICON_BTN}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  )
}
