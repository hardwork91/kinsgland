import { useEffect } from 'react'
import { Board } from './components/Board'
import { TopBar } from './components/TopBar'
import { UnitsCatalog } from './components/UnitsCatalog'
import { InfoPanel } from './components/InfoPanel'
import { BottomLegend } from './components/BottomLegend'
import { EndScreen } from './components/EndScreen'
import { Menu } from './components/Menu'
import { WaitingRoom } from './components/WaitingRoom'
import { RacePicker } from './components/RacePicker'
import { OrnateFrame } from './components/OrnateFrame'
import { useGameStore } from './store/gameStore'
import { setupAIDriver } from './ai/driver'

function App() {
  const gameId = useGameStore((s) => s.gameId)
  const state = useGameStore((s) => s.state)
  const tryReconnect = useGameStore((s) => s.tryReconnect)

  useEffect(() => {
    void tryReconnect()
    // Engancha el driver de la IA: actúa cuando le toca el turno en partidas vs IA.
    const unsub = setupAIDriver()
    return unsub
  }, [tryReconnect])

  if (!gameId) return <Menu />
  if (state && state.phase === 'lobby') return <WaitingRoom />
  if (state && state.phase === 'pickRace') return <RacePicker />
  if (!state) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#0b0f1a] text-neutral-400">
        Cargando partida…
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#0b0f1a] text-neutral-100">
      <TopBar state={state} />

      {/* Móvil: columna (apilado) y scroll. Desktop (lg+): 3 columnas sin scroll. */}
      <main className="flex flex-1 flex-col items-stretch gap-3 overflow-y-auto p-2 lg:flex-row lg:justify-center lg:gap-4 lg:overflow-hidden lg:p-0">
        {/* Sider izquierdo (oculto en móvil) */}
        <div className="hidden shrink-0 lg:block lg:h-full lg:w-auto">
          <OrnateFrame
            corners={false}
            grayscale
            topBottom={false}
            rootClassName="lg:h-full"
            className="rounded-lg lg:h-full"
          >
            <UnitsCatalog />
          </OrnateFrame>
        </div>

        {/* Tablero con marco decorativo (slot: /ui/board-frame.png) */}
        <div className="flex w-full items-center justify-center lg:flex-1 lg:overflow-hidden">
          <div
            className="rounded-xl border-4 border-amber-900/50 bg-black/30 p-2 shadow-2xl shadow-black/60"
            style={{ width: 'min(82vh, 100%)', aspectRatio: '1' }}
          >
            <Board />
          </div>
        </div>

        {/* Sider derecho */}
        <div className="w-full shrink-0 lg:h-full lg:w-auto">
          <OrnateFrame
            corners={false}
            grayscale
            topBottom={false}
            rootClassName="lg:h-full"
            className="rounded-lg lg:h-full"
          >
            <InfoPanel state={state} />
          </OrnateFrame>
        </div>
      </main>

      <BottomLegend />
      <EndScreen />
    </div>
  )
}

export default App
