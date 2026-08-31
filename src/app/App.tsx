import { useState } from 'react'
import { Menu } from '../pages/Menu/Menu'
import { Game } from '../pages/Game/Game'
import { Result } from '../pages/Result/Result'

type Screen = 'menu' | 'game' | 'result'

/**
 * Корневой экран с простым состоянием-роутером.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  return (
    <div className="app">
      {screen === 'menu' && <Menu onPlay={() => setScreen('game')} />}
      {screen === 'game' && (
        <Game
          onExit={() => setScreen('menu')}
          onLevelComplete={() => setScreen('result')}
        />
      )}
      {screen === 'result' && <Result onContinue={() => setScreen('game')} />}
    </div>
  )
}
