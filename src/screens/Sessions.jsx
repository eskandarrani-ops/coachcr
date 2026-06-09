import { useState } from 'react'
import { initialSessions, initialPlayers, initialVolunteers } from '../data/initial'
import { useCollection } from '../hooks/useCollection'
import { useGroups } from '../hooks/useGroups'
import { useAttendance } from '../hooks/useAttendance'
import Modal from '../components/Modal'
import SessionDetail from './SessionDetail'

const TYPE_COLOR = {
  Training: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Match:    'bg-rose-500/20 text-rose-300 border-rose-500/30',
  Other:    'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

const TYPES   = ['Training', 'Match', 'Other']
const FILTERS = ['All', ...TYPES]

const emptyForm = { title: '', date: '', time: '', location: '', type: 'Training', group: 'All', coaches: [], notes: '' }

function newId() { return 's' + Date.now() }

export default function Sessions() {
  const [sessions, setSessions] = useCollection('coachcr_sessions',   'sessions',   initialSessions)
  const [players]               = useCollection('coachcr_players',    'players',    initialPlayers)
  const [volunteers]            = useCollection('coachcr_volunteers', 'volunteers', initialVolunteers)
  const [groups]                = useGroups()
  const [attendance]            = useAttendance()
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState(null)
  const [modal,         setModal]         = useState(null)
  const [editing,       setEditing]       = useState(null)
  const [form,          setForm]          = useState(emptyForm)
  const [errors,        setErrors]        = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const SESSION_GROUPS = ['All', ...groups]

  if (selected) {
    const live = sessions.find((s) => s.id === selected.id) || selected
    return <SessionDetail session={live} onBack={() => setSelected(null)} />
  }

  const filtered = [...sessions]
    .filter((s) => filter === 'All' || s.type === filter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

  function openAdd() {
    const today = new Date().toISOString().slice(0, 10)
    setForm({ ...emptyForm, date: today })
    setEditing(null)
    setErrors({})
    setConfirmDelete(false)
    setModal('add')
  }

  function openEdit(e, session) {
    e.stopPropagation()
    setForm({ ...emptyForm, coaches: [], ...session })
    setEditing(session.id)
    setErrors({})
    setConfirmDelete(false)
    setModal('edit')
  }

  function toggleCoach(volunteerId) {
    setForm((f) => {
      const coaches = f.coaches || []
      return {
        ...f,
        coaches: coaches.includes(volunteerId)
          ? coaches.filter((id) => id !== volunteerId)
          : [...coaches, volunteerId],
      }
    })
  }

  function validate(f) {
    const e = {}
    if (!f.title.trim())    e.title    = 'Required'
    if (!f.date)            e.date     = 'Required'
    if (!f.time)            e.time     = 'Required'
    if (!f.location.trim()) e.location = 'Required'
    return e
  }

  function handleSave() {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    if (editing) {
      setSessions((prev) => prev.map((s) => s.id === editing ? { ...form, id: editing } : s))
    } else {
      setSessions((prev) => [...prev, { ...form, id: newId() }])
    }
    setModal(null)
  }

  function handleDelete() {
    setSessions((prev) => prev.filter((s) => s.id !== editing))
    setModal(null)
  }

  function field(key, label, type = 'text', opts = {}) {
    return (
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className={`w-full bg-slate-900 border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 ${errors[key] ? 'border-rose-500' : 'border-slate-700 focus:border-emerald-400'} transition-colors`}
          {...opts}
        />
        {errors[key] && <p className="text-xs text-rose-400 mt-1">{errors[key]}</p>}
      </div>
    )
  }

  function coachNamesForSession(session) {
    const ids = session.coaches || []
    if (ids.length === 0) return null
    return ids
      .map((id) => volunteers.find((v) => v.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">Sessions</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-emerald-400 text-slate-900 text-sm font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-emerald-400 text-slate-900 border-emerald-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No sessions found</p>
            <button onClick={openAdd} className="mt-3 text-emerald-400 text-sm font-medium">+ Add one</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const today      = new Date().toISOString().slice(0, 10)
              const isPast     = s.date < today
              const sessionAtt = attendance[s.id] || {}
              const hasAtt     = Object.values(sessionAtt).some((v) => v === true)
              const groupPlayers = (!s.group || s.group === 'All')
                ? players
                : players.filter((p) => !p.group || p.group === s.group)
              const presentCount = groupPlayers.filter((p) => sessionAtt[p.id] === true).length
              const coachNames = coachNamesForSession(s)

              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="bg-slate-800 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-700/80 active:scale-[0.99] transition-all"
                >
                  {/* Date block */}
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-400 leading-none">
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase mt-0.5">
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 leading-snug">{s.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.time} · {s.location}</p>

                    {/* Coach line */}
                    <p className="text-xs mt-0.5 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0 text-slate-500">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                      <span className={coachNames ? 'text-slate-300' : 'text-slate-500 italic'}>
                        {coachNames || 'Unassigned'}
                      </span>
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[s.type] || TYPE_COLOR.Other}`}>
                        {s.type}
                      </span>
                      {s.group && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          {s.group}
                        </span>
                      )}
                      {isPast && hasAtt && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                          ✓ {presentCount} / {groupPlayers.length}
                        </span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-slate-500 mt-1.5 truncate">{s.notes}</p>}
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => openEdit(e, s)}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-600">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'New Session' : 'Edit Session'}
          onClose={() => setModal(null)}
          footer={
            <div>
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-emerald-400 text-slate-900 text-sm font-semibold active:scale-95 transition-transform"
              >
                {modal === 'add' ? 'Create Session' : 'Save Changes'}
              </button>

              {modal === 'edit' && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="text-xs text-slate-600 uppercase tracking-wider">Danger zone</span>
                    <div className="flex-1 h-px bg-slate-700" />
                  </div>

                  {confirmDelete ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                      <p className="text-sm text-rose-300 font-medium text-center mb-1">Delete this session?</p>
                      <p className="text-xs text-rose-400/70 text-center mb-4">This action cannot be undone.</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 active:scale-95 transition-all"
                        >
                          Yes, delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-3 rounded-xl border-2 border-rose-500/60 text-rose-400 text-sm font-semibold hover:bg-rose-500/10 hover:border-rose-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete Session
                    </button>
                  )}
                </>
              )}
            </div>
          }
        >
          {field('title', 'Title', 'text', { placeholder: 'e.g. Morning Training', maxLength: 80 })}

          <div className="grid grid-cols-2 gap-3">
            {field('date', 'Date', 'date')}
            {field('time', 'Time', 'time')}
          </div>

          {field('location', 'Location', 'text', { placeholder: 'e.g. Campo Principal', maxLength: 80 })}

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                    form.type === t
                      ? 'bg-emerald-400 text-slate-900 border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Group</label>
            <div className="flex gap-2 flex-wrap">
              {SESSION_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, group: g }))}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    form.group === g
                      ? 'bg-emerald-400 text-slate-900 border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Coach multi-select */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Coach(es)
              <span className="ml-1 text-slate-600 font-normal">— select one or more</span>
            </label>
            {volunteers.length === 0 ? (
              <p className="text-xs text-slate-500">No volunteers added yet.</p>
            ) : (
              <div className="space-y-1.5">
                {volunteers.map((v) => {
                  const isSelected = (form.coaches || []).includes(v.id)
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleCoach(v.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-400/10 border-emerald-400/50 text-slate-100'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                        isSelected ? 'bg-emerald-400 border-emerald-400' : 'border-slate-600'
                      }`}>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-900">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{v.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{v.role}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder="Optional notes..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-none transition-colors"
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
