import { useEffect } from 'react'
import { Board } from './components/Board'
import { TopBar } from './components/TopBar'
import { UnitsCatalog } from './components/UnitsCatalog'
import { InfoPanel } from './components/InfoPanel'
import { BottomLegend } from './components/BottomLegend'
import { EndScreen } from './components/EndScreen'
import { Menu } from './components/Menu'
import { WaitingRoom } from './components/WaitingRoom'
import { OrnateFrame } from './components/OrnateFrame'
import { useGameStore } from './store/gameStore'

function App() {
  const gameId = useGameStore((s) => s.gameId)
  const state = useGameStore((s) => s.state)
  const tryReconnect = useGameStore((s) => s.tryReconnect)

  useEffect(() => {
    void tryReconnect()
  }, [tryReconnect])

  if (!gameId) return <Menu />
  if (state && state.phase === 'lobby') return <WaitingRoom />
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

      <main className="flex flex-1 items-stretch justify-center gap-4 overflow-hidden">
        {/* Sider izquierdo: marco gris (solo laterales) */}
        <div className="h-full shrink-0">
          <OrnateFrame
            corners={false}
            grayscale
            topBottom={false}
            rootClassName="h-full"
            className="h-full rounded-lg"
          >
            <UnitsCatalog />
          </OrnateFrame>
        </div>

        {/* Tablero con marco decorativo (slot: /ui/board-frame.png) */}
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div
            className="rounded-xl border-4 border-amber-900/50 bg-black/30 p-2 shadow-2xl shadow-black/60"
            style={{ width: 'min(82vh, 100%)', aspectRatio: '1' }}
          >
            <Board />
          </div>
        </div>

        {/* Sider derecho: marco gris (solo laterales) */}
        <div className="h-full shrink-0">
          <OrnateFrame
            corners={false}
            grayscale
            topBottom={false}
            rootClassName="h-full"
            className="h-full rounded-lg"
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
