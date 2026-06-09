/**
 * useGroups – manages the custom age-groups list.
 *
 * Supabase table: `groups (name text PRIMARY KEY)`
 * localStorage key: `coachcr_groups`
 *
 * Same offline-first behaviour as useCollection:
 *  – Reads from localStorage instantly.
 *  – Syncs with Supabase on mount.
 *  – On write, diffs and pushes only changes (insert new names, delete removed ones).
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LOCAL_KEY = 'coachcr_groups'
const DEFAULT_GROUPS = ['U7', 'U10', 'U12', 'U14', 'U16', 'U18', 'Senior']

function lsGet() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_GROUPS
  } catch {
    return DEFAULT_GROUPS
  }
}

function lsSet(value) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)) } catch {}
}

export function useGroups() {
  const [groups, setGroupsState] = useState(() => lsGet())

  // ------------------------------------------------------------------
  // Initial fetch
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return

    supabase.from('groups').select('name').then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] fetch groups:', error.message)
        return
      }

      if (data && data.length > 0) {
        const names = data.map(r => r.name)
        setGroupsState(names)
        lsSet(names)
      } else {
        // Seed Supabase with localStorage data
        const seed = lsGet()
        if (seed.length > 0) {
          supabase.from('groups').upsert(seed.map(name => ({ name }))).then(({ error: e }) => {
            if (e) console.warn('[Supabase] seed groups:', e.message)
          })
        }
      }
    })
  }, [])

  // ------------------------------------------------------------------
  // Setter
  // ------------------------------------------------------------------
  function setGroups(valueOrFn) {
    setGroupsState(current => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(current) : valueOrFn
      lsSet(next)

      if (supabase) {
        const toDelete = current.filter(g => !next.includes(g))
        const toInsert = next.filter(g => !current.includes(g))

        if (toDelete.length > 0) {
          supabase.from('groups').delete().in('name', toDelete)
            .then(({ error }) => { if (error) console.warn('[Supabase] delete groups:', error.message) })
        }
        if (toInsert.length > 0) {
          supabase.from('groups').insert(toInsert.map(name => ({ name })))
            .then(({ error }) => { if (error) console.warn('[Supabase] insert groups:', error.message) })
        }
      }

      return next
    })
  }

  return [groups, setGroups]
}
