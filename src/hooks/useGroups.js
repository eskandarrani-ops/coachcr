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
import { setStatus } from '../lib/supabaseStatus'

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

    console.log('[useGroups] fetching from Supabase…')
    supabase.from('groups').select('name').then(({ data, error }) => {
      if (error) {
        console.error('[useGroups] fetch error:', error.code, error.message)
        setStatus('offline')
        return
      }

      console.log(`[useGroups] Supabase returned ${data.length} groups`)
      setStatus('connected')

      if (data && data.length > 0) {
        const names = data.map(r => r.name)
        setGroupsState(names)
        lsSet(names)
      } else {
        const seed = lsGet()
        console.log(`[useGroups] Supabase empty, seeding with ${seed.length} groups…`)
        if (seed.length > 0) {
          supabase.from('groups').upsert(seed.map(name => ({ name }))).then(({ error: e }) => {
            if (e) {
              console.error('[useGroups] seed error:', e.code, e.message,
                e.code === '42501' ? '\n⚠️  RLS POLICY MISSING on groups table' : '')
              setStatus('rls-error')
            } else {
              console.log('[useGroups] seed OK ✓')
            }
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
            .then(({ error }) => {
              if (error) console.error('[useGroups] delete error:', error.code, error.message)
              else console.log('[useGroups] deleted groups ✓', toDelete)
            })
        }
        if (toInsert.length > 0) {
          supabase.from('groups').insert(toInsert.map(name => ({ name })))
            .then(({ error }) => {
              if (error) console.error('[useGroups] insert error:', error.code, error.message)
              else console.log('[useGroups] inserted groups ✓', toInsert)
            })
        }
      }

      return next
    })
  }

  return [groups, setGroups]
}
