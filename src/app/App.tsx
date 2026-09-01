import { useState } from 'react'
import { Menu } from '../pages/Menu/Menu'
import { Game } from '../pages/Game/Game'
import { Result } from '../pages/Result/Result'
import { Achievements } from '../pages/Achievements/Achievements'
import { Bomb } from '../pages/Bomb/Bomb'
import { Daily } from '../pages/Daily/Daily'

type Screen = 'menu' | 'game' | 'result' | 'achievements' | 'bomb' | 'daily'

/**
 * Корневой экран с простым состоянием-роутером.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  return (
    <div className="app">
      {screen === 'menu' && (
        <Menu
          onPlay={() => setScreen('game')}
          onBomb={() => setScreen('bomb')}
          onDaily={() => setScreen('daily')}
          onAchievements={() => setScreen('achievements')}
        />
      )}
      {screen === 'game' && (
        <Game
          onExit={() => setScreen('menu')}
          onLevelComplete={() => setScreen('result')}
        />
      )}
      {screen === 'result' && <Result onContinue={() => setScreen('game')} />}
      {screen === 'achievements' && (
        <Achievements onBack={() => setScreen('menu')} />
      )}
      {screen === 'bomb' && <Bomb onExit={() => setScreen('menu')} />}
      {screen === 'daily' && <Daily onExit={() => setScreen('menu')} />}
    </div>
  )
}
