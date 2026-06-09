import { useState, useEffect } from 'react'
import { initialPlayers, initialSessions, initialVolunteers } from '../data/initial'
import { useCollection } from '../hooks/useCollection'
import { getStatus, onStatusChange } from '../lib/supabaseStatus'

// ─── Supabase status badge ──────────────────────────────────────────────────

function useSupabaseStatus() {
  const [status, setStatus] = useState(getStatus)
  useEffect(() => onStatusChange(setStatus), [])
  return status
}

const STATUS_CONFIG = {
  checking:   { dot: 'bg-slate-500 animate-pulse', text: 'Connecting…',            bg: 'bg-slate-800 border-slate-700',   color: 'text-slate-400'  },
  connected:  { dot: 'bg-emerald-400',              text: 'Supabase connected',     bg: 'bg-emerald-500/10 border-emerald-500/20', color: 'text-emerald-300' },
  'rls-error':{ dot: 'bg-amber-400 animate-pulse',  text: 'DB write blocked — RLS', bg: 'bg-amber-500/10 border-amber-500/20',    color: 'text-amber-300'  },
  offline:    { dot: 'bg-rose-400',                  text: 'Offline — local data',   bg: 'bg-rose-500/10 border-rose-500/20',      color: 'text-rose-300'   },
}

function StatusBadge() {
  const status = useSupabaseStatus()
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.checking

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.text}
      {status === 'rls-error' && (
        <span className="ml-1 opacity-70">— see console</span>
      )}
    </div>
  )
}

// ─── Backup export ──────────────────────────────────────────────────────────

function exportBackup() {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      app: 'CoachCR',
      players:    JSON.parse(localStorage.getItem('coachcr_players')    || '[]'),
      sessions:   JSON.parse(localStorage.getItem('coachcr_sessions')   || '[]'),
      volunteers: JSON.parse(localStorage.getItem('coachcr_volunteers') || '[]'),
      attendance: JSON.parse(localStorage.getItem('coachcr_attendance') || '{}'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `coachcr-backup-${new Date().toISOString().slice(0, 10)}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // download not supported in this environment
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_COLOR = {
  Training: 'bg-blue-500/20 text-blue-300',
  Match:    'bg-rose-500/20 text-rose-300',
  Other:    'bg-slate-500/20 text-slate-300',
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function Home({ onNavigate }) {
  const [players]    = useCollection('coachcr_players',    'players',    initialPlayers)
  const [sessions]   = useCollection('coachcr_sessions',   'sessions',   initialSessions)
  const [volunteers] = useCollection('coachcr_volunteers', 'volunteers', initialVolunteers)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = [...sessions]
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3)

  const thisWeek = sessions.filter((s) => {
    const d = new Date(s.date)
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return d >= start && d <= end
  })

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-400 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 leading-tight">CoachCR</h1>
            <p className="text-xs text-slate-400">Football Academy · Costa Rica</p>
          </div>
        </div>

        {/* ← Supabase connection status badge */}
        <StatusBadge />
      </div>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Players"   value={players.length}    icon="👥" onClick={() => onNavigate('players')} />
          <StatCard label="This Week" value={thisWeek.length}   icon="📅" suffix="sessions" onClick={() => onNavigate('sessions')} />
          <StatCard label="Staff"     value={volunteers.length} icon="🏅" onClick={() => onNavigate('volunteers')} />
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Upcoming Sessions</h2>
          <button onClick={() => onNavigate('sessions')} className="text-xs text-emerald-400 font-medium">
            See all →
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No upcoming sessions</p>
            <button onClick={() => onNavigate('sessions')} className="mt-3 text-sm text-emerald-400 font-medium">
              Schedule one →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div key={s.id} className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-400 leading-none">
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{s.title}</p>
                  <p className="text-xs text-slate-400 truncate">{s.time} · {s.location}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLOR[s.type] || TYPE_COLOR.Other}`}>
                  {s.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction label="Add Player"  desc="Register a new player"       icon="➕" onClick={() => onNavigate('players')} />
          <QuickAction label="New Session" desc="Schedule training or match"   icon="📋" onClick={() => onNavigate('sessions')} />
        </div>
      </div>

      {/* Export backup */}
      <div className="px-4 mt-6">
        <button
          onClick={exportBackup}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Export data backup (.json)
        </button>
      </div>

      {/* Position breakdown */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Squad Breakdown</h2>
        <div className="bg-slate-800 rounded-xl p-4">
          {['GK', 'DEF', 'MID', 'FWD'].map((pos) => {
            const count = players.filter((p) => p.position === pos).length
            const pct = players.length ? Math.round((count / players.length) * 100) : 0
            const colors = { GK: 'bg-amber-400', DEF: 'bg-blue-400', MID: 'bg-purple-400', FWD: 'bg-rose-400' }
            const labels = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' }
            return (
              <div key={pos} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{labels[pos]}</span>
                  <span className="text-xs font-semibold text-slate-200">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${colors[pos]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix, icon, onClick }) {
  return (
    <button onClick={onClick} className="bg-slate-800 rounded-xl p-3 text-left hover:bg-slate-700 transition-colors active:scale-95">
      <span className="text-xl">{icon}</span>
      <p className="text-2xl font-bold text-slate-100 mt-1 leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{suffix || label}</p>
    </button>
  )
}

function QuickAction({ label, desc, icon, onClick }) {
  return (
    <button onClick={onClick} className="bg-slate-800 rounded-xl p-4 text-left hover:bg-slate-700 transition-colors active:scale-95">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-semibold text-slate-100 mt-2">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </button>
  )
}
