import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialPlayers } from '../data/initial'

const POS_COLOR = {
  GK:  'bg-amber-500/20 text-amber-300',
  DEF: 'bg-blue-500/20 text-blue-300',
  MID: 'bg-purple-500/20 text-purple-300',
  FWD: 'bg-rose-500/20 text-rose-300',
}

const TYPE_COLOR = {
  Training: 'bg-blue-500/20 text-blue-300',
  Match:    'bg-rose-500/20 text-rose-300',
  Other:    'bg-slate-500/20 text-slate-300',
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

export default function SessionDetail({ session, onBack }) {
  const [players]    = useLocalStorage('coachcr_players', initialPlayers)
  const [attendance, setAttendance] = useLocalStorage('coachcr_attendance', {})

  const sessionAtt = attendance[session.id] || {}

  // Players in this group (or all players if group is 'All'/unset)
  const groupPlayers = (!session.group || session.group === 'All')
    ? players
    : players.filter((p) => !p.group || p.group === session.group)

  const sorted = [...groupPlayers].sort((a, b) => (a.number || 999) - (b.number || 999))

  const presentCount  = sorted.filter((p) => sessionAtt[p.id] === true).length
  const absentCount   = sorted.filter((p) => sessionAtt[p.id] === false).length
  const pendingCount  = sorted.length - presentCount - absentCount

  function toggle(playerId) {
    setAttendance((prev) => {
      const cur = (prev[session.id] || {})[playerId]
      // cycle: undefined → true → false → undefined
      let next
      if (cur === undefined) next = true
      else if (cur === true)  next = false
      else                    next = undefined

      const updated = { ...(prev[session.id] || {}), [playerId]: next }
      if (next === undefined) delete updated[playerId]
      return { ...prev, [session.id]: updated }
    })
  }

  function markAll(present) {
    const update = {}
    sorted.forEach((p) => { update[p.id] = present })
    setAttendance((prev) => ({ ...prev, [session.id]: update }))
  }

  function clearAll() {
    setAttendance((prev) => {
      const next = { ...prev }
      delete next[session.id]
      return next
    })
  }

  return (
    <div className="pb-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-100 truncate">{session.title}</h1>
            <p className="text-xs text-slate-400">{formatDate(session.date)} · {session.time}</p>
          </div>

          {/* Live counter */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xl font-bold text-emerald-400 leading-none">{presentCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">/ {sorted.length} present</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 mx-4 mb-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: sorted.length ? `${(presentCount / sorted.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Session info strip */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">{session.location}</span>
        <span className="text-slate-600">·</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[session.type] || TYPE_COLOR.Other}`}>
          {session.type}
        </span>
        {session.group && session.group !== 'All' && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-300">
            {session.group}
          </span>
        )}
        {session.group === 'All' && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-500/20 text-slate-400">
            All groups
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{presentCount}</p>
          <p className="text-xs text-emerald-300/70 mt-0.5">Present</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-rose-400">{absentCount}</p>
          <p className="text-xs text-rose-300/70 mt-0.5">Absent</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-400">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pending</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-4 mt-3">
        <button
          onClick={() => markAll(true)}
          className="flex-1 py-2 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition-colors"
        >
          ✓ Mark all present
        </button>
        <button
          onClick={() => markAll(false)}
          className="flex-1 py-2 rounded-xl border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
        >
          ✗ Mark all absent
        </button>
        <button
          onClick={clearAll}
          className="py-2 px-3 rounded-xl border border-slate-700 text-slate-500 text-xs font-medium hover:bg-slate-800 transition-colors"
          title="Reset all"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
      </div>

      {/* Player list */}
      <div className="px-4 mt-4">
        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No players in this group</p>
            <p className="text-xs text-slate-600 mt-1">Assign players to the <strong className="text-slate-500">{session.group}</strong> group in the Players tab</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Present players first */}
            {[true, false, undefined].map((state) => {
              const group = sorted.filter((p) => {
                const s = sessionAtt[p.id]
                return s === state
              })
              if (group.length === 0) return null

              const label = state === true ? 'Present' : state === false ? 'Absent' : 'Not marked'
              const labelColor = state === true ? 'text-emerald-400' : state === false ? 'text-rose-400' : 'text-slate-500'

              return (
                <div key={String(state)}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 mt-3 first:mt-0 ${labelColor}`}>
                    {label} ({group.length})
                  </p>
                  <div className="space-y-1.5">
                    {group.map((p) => (
                      <PlayerRow
                        key={p.id}
                        player={p}
                        status={sessionAtt[p.id]}
                        onToggle={() => toggle(p.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {session.notes && (
        <div className="mx-4 mt-4 p-3 bg-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-400 mb-1">Notes</p>
          <p className="text-sm text-slate-300">{session.notes}</p>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, status, onToggle }) {
  const isPresent = status === true
  const isAbsent  = status === false

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all active:scale-[0.98] ${
        isPresent
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isAbsent
          ? 'bg-rose-500/10 border-rose-500/20'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      {/* Status icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
        isPresent
          ? 'bg-emerald-400 border-emerald-400'
          : isAbsent
          ? 'bg-rose-500/20 border-rose-500/50'
          : 'bg-slate-700 border-slate-600'
      }`}>
        {isPresent && (
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        )}
        {isAbsent && (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-400">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        )}
      </div>

      {/* Jersey number */}
      <div className="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-slate-300">{player.number || '–'}</span>
      </div>

      {/* Name */}
      <span className={`flex-1 text-sm font-medium text-left truncate ${
        isPresent ? 'text-slate-100' : isAbsent ? 'text-slate-400' : 'text-slate-200'
      }`}>
        {player.name}
      </span>

      {/* Position badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${POS_COLOR[player.position] || ''}`}>
        {player.position}
      </span>
    </button>
  )
}
