import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialPlayers } from '../data/initial'
import Modal from '../components/Modal'

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD']
const PLAYER_GROUPS = ['U7', 'U10', 'U12', 'U14', 'U16', 'U18', 'Senior']
const FILTERS = ['All', ...PLAYER_GROUPS]

const POS_COLOR = {
  GK:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  DEF: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MID: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  FWD: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

const emptyForm = { name: '', number: '', position: 'FWD', age: '', group: '', phone: '', notes: '' }

function newId() {
  return 'p' + Date.now()
}

export default function Players() {
  const [players, setPlayers] = useLocalStorage('coachcr_players', initialPlayers)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  const filtered = useMemo(() => {
    return players
      .filter((p) => filter === 'All' || p.group === filter)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.number || 999) - (b.number || 999))
  }, [players, filter, search])

  function openAdd() {
    setForm(emptyForm)
    setEditing(null)
    setErrors({})
    setModal('add')
  }

  function openEdit(player) {
    setForm({ ...player, number: String(player.number || ''), age: String(player.age || '') })
    setEditing(player.id)
    setErrors({})
    setModal('edit')
  }

  function validate(f) {
    const e = {}
    if (!f.name.trim()) e.name = 'Required'
    if (f.number && isNaN(Number(f.number))) e.number = 'Must be a number'
    if (f.age && isNaN(Number(f.age))) e.age = 'Must be a number'
    return e
  }

  function handleSave() {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    const data = {
      ...form,
      number: form.number ? Number(form.number) : null,
      age: form.age ? Number(form.age) : null,
    }
    if (editing) {
      setPlayers((prev) => prev.map((p) => p.id === editing ? { ...data, id: editing } : p))
    } else {
      setPlayers((prev) => [...prev, { ...data, id: newId() }])
    }
    setModal(null)
  }

  function handleDelete() {
    setPlayers((prev) => prev.filter((p) => p.id !== editing))
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

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-100">
            Players
            <span className="ml-2 text-sm font-normal text-slate-500">({players.length})</span>
          </h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-emerald-400 text-slate-900 text-sm font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Group filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
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
              {f !== 'All' && (
                <span className="ml-1 opacity-60">{players.filter((p) => p.group === f).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">
              {search ? `No players matching "${search}"` : 'No players found'}
            </p>
            {!search && (
              <button onClick={openAdd} className="mt-3 text-emerald-400 text-sm font-medium">
                + Add player
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                {/* Number badge */}
                <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-slate-300">
                    {p.number || '–'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.group ? `${p.group}` : ''}
                    {p.group && p.age ? ' · ' : ''}
                    {p.age ? `Age ${p.age}` : ''}
                  </p>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${POS_COLOR[p.position]}`}>
                  {p.position}
                </span>

                <button
                  onClick={() => openEdit(p)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'New Player' : 'Edit Player'}
          onClose={() => setModal(null)}
        >
          {field('name', 'Full Name', 'text', { placeholder: 'e.g. Carlos Vargas' })}

          <div className="grid grid-cols-2 gap-3">
            {field('number', 'Jersey #', 'number', { placeholder: '10', min: 1 })}
            {field('age', 'Age', 'number', { placeholder: '16', min: 10, max: 25 })}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Position</label>
            <div className="grid grid-cols-4 gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, position: pos }))}
                  className={`text-xs font-semibold py-2 rounded-lg border transition-colors ${
                    form.position === pos
                      ? 'bg-emerald-400 text-slate-900 border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Group</label>
            <div className="flex gap-2 flex-wrap">
              {PLAYER_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, group: f.group === g ? '' : g }))}
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

          {field('phone', 'Phone', 'tel', { placeholder: '+506 8800-0000' })}

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-none transition-colors"
            />
          </div>

          <div className="flex gap-3 mt-2">
            {modal === 'edit' && (
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl border border-rose-500/50 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-colors"
              >
                Remove
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-emerald-400 text-slate-900 text-sm font-semibold active:scale-95 transition-transform"
            >
              {modal === 'add' ? 'Add Player' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
