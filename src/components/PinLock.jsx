import { useState, useEffect } from 'react'

const STORAGE_KEY = 'coachcr_pin_hash'
const DEFAULT_PIN = '1234'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function ensureDefaultPin() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, await sha256(DEFAULT_PIN))
  }
}

export default function PinLock({ onUnlock }) {
  const [digits,  setDigits]  = useState([])
  const [status,  setStatus]  = useState('idle') // 'idle' | 'error'
  const [ready,   setReady]   = useState(false)

  useEffect(() => { ensureDefaultPin().then(() => setReady(true)) }, [])

  async function press(d) {
    if (digits.length >= 4 || status === 'error') return
    const next = [...digits, d]
    setDigits(next)

    if (next.length === 4) {
      const hash    = await sha256(next.join(''))
      const stored  = localStorage.getItem(STORAGE_KEY)
      if (hash === stored) {
        onUnlock()
      } else {
        setStatus('error')
        setTimeout(() => { setDigits([]); setStatus('idle') }, 800)
      }
    }
  }

  function backspace() {
    if (status === 'error') return
    setDigits((p) => p.slice(0, -1))
  }

  if (!ready) return null

  return (
    <div className="min-h-svh bg-slate-900 flex flex-col items-center justify-center px-8 select-none">
      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl bg-emerald-400 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-1">CoachCR</h1>
      <p className="text-sm text-slate-400 mb-10">Enter your PIN to continue</p>

      {/* Dots */}
      <div className="flex gap-5 mb-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              status === 'error'
                ? 'bg-rose-500 border-rose-500'
                : i < digits.length
                ? 'bg-emerald-400 border-emerald-400'
                : 'bg-transparent border-slate-600'
            }`}
          />
        ))}
      </div>

      <div className="h-6 mb-6 flex items-center">
        {status === 'error' && (
          <p className="text-rose-400 text-sm">Incorrect PIN — try again</p>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button
            key={n}
            onClick={() => press(String(n))}
            className="h-16 rounded-2xl bg-slate-800 text-slate-100 text-2xl font-semibold hover:bg-slate-700 active:bg-slate-600 active:scale-95 transition-all"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="h-16 rounded-2xl bg-slate-800 text-slate-100 text-2xl font-semibold hover:bg-slate-700 active:bg-slate-600 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={backspace}
          className="h-16 rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 active:bg-slate-600 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Backspace"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/>
          </svg>
        </button>
      </div>

      <p className="text-xs text-slate-600 mt-10">Default PIN: 1234</p>
    </div>
  )
}
