import { useState } from 'react'
import Home from './screens/Home'
import Sessions from './screens/Sessions'
import Players from './screens/Players'
import Volunteers from './screens/Volunteers'
import BottomNav from './components/BottomNav'
import PinLock from './components/PinLock'

const SCREENS = { home: Home, sessions: Sessions, players: Players, volunteers: Volunteers }

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [screen,   setScreen]   = useState('home')
  const Screen = SCREENS[screen]

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="min-h-svh bg-slate-900 text-slate-100 max-w-lg mx-auto relative">
      <div className="pb-20">
        <Screen onNavigate={setScreen} />
      </div>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
