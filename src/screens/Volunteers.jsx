import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialVolunteers } from '../data/initial'
import Modal from '../components/Modal'

const ROLES = [
  'Head Coach',
  'Assistant Coach',
  'GK Coach',
  'Physical Trainer',
  'Team Manager',
  'Nutritionist',
  'Medical Staff',
  'Scout',
  'Volunteer',
]

const ROLE_COLOR = {
  'Head Coach':       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Assistant Coach':  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'GK Coach':         'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Physical Trainer': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Team Manager':     'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Nutritionist':     'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

const emptyForm = { name: '', role: 'Volunteer', phone: '', email: '', notes: '' }

function newId() {
  return 'v' + Date.now()
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-emerald-500', 'bg-pink-500', 'bg-indigo-500',
]

function avatarColor(id) {
  const idx = parseInt(id.replace(/\D/g, ''), 10) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx] || AVATAR_COLORS[0]
}

export default function Volunteers() {
  const [volunteers, setVolunteers] = useLocalStorage('coachcr_volunteers', initialVolunteers)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  function openAdd() {
    setForm(emptyForm)
    setEditing(null)
    setErrors({})
    setModal('add')
  }

  function openEdit(v) {
    setForm({ ...v })
    setEditing(v.id)
    setErrors({})
    setModal('edit')
  }

  function validate(f) {
    const e = {}
    if (!f.name.trim()) e.name = 'Required'
    return e
  }

  function handleSave() {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    if (editing) {
      setVolunteers((prev) => prev.map((v) => v.id === editing ? { ...form, id: editing } : v))
    } else {
      setVolunteers((prev) => [...prev, { ...form, id: newId() }])
    }
    setModal(null)
  }

  function handleDelete() {
    setVolunteers((prev) => prev.filter((v) => v.id !== editing))
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">
            Staff
            <span className="ml-2 text-sm font-normal text-slate-500">({volunteers.length})</span>
          </h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-emerald-400 text-slate-900 text-sm font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4">
        {volunteers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No staff members yet</p>
            <button onClick={openAdd} className="mt-3 text-emerald-400 text-sm font-medium">
              + Add staff
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {volunteers.map((v) => (
              <div key={v.id} className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${avatarColor(v.id)}`}>
                  {getInitials(v.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{v.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLOR[v.role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                      {v.role}
                    </span>
                    {v.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {v.phone}
                      </a>
                    )}
                  </div>
                  {v.notes && <p className="text-xs text-slate-500 mt-1 truncate">{v.notes}</p>}
                </div>

                <button
                  onClick={() => openEdit(v)}
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

      {/* Contact shortcut cards for head staff */}
      {volunteers.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Contact</h2>
          <div className="grid grid-cols-2 gap-3">
            {volunteers.slice(0, 4).map((v) => (
              <a
                key={v.id}
                href={v.phone ? `tel:${v.phone}` : v.email ? `mailto:${v.email}` : undefined}
                className="bg-slate-800 rounded-xl p-3 flex items-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${avatarColor(v.id)}`}>
                  {getInitials(v.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">{v.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate">{v.role}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'New Staff Member' : 'Edit Staff Member'}
          onClose={() => setModal(null)}
        >
          {field('name', 'Full Name', 'text', { placeholder: 'e.g. Roberto Elizondo' })}

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2.5 text-sm text-slate-100 transition-colors"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {field('phone', 'Phone', 'tel', { placeholder: '+506 8900-0000' })}
          {field('email', 'Email', 'email', { placeholder: 'name@example.com' })}

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Certifications, availability, etc."
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
              {modal === 'add' ? 'Add Member' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
