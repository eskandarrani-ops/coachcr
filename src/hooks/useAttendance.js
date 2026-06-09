/**
 * useAttendance – manages attendance records.
 *
 * App shape:  { [session_id]: { [player_id]: true | false } }
 * Supabase table: `attendance (session_id text, player_id text, status boolean, PRIMARY KEY (session_id, player_id))`
 * localStorage key: `coachcr_attendance`
 *
 * On write, identifies which session(s) changed, deletes their old rows in
 * Supabase, then inserts the new rows.  Rows are deleted (not updated to false)
 * when a player's status is cleared (set to undefined in the app).
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LOCAL_KEY = 'coachcr_attendance'

function lsGet() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function lsSet(value) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)) } catch {}
}

/** Convert Supabase rows → nested app object */
function rowsToNested(rows) {
  const out = {}
  for (const { session_id, player_id, status } of rows) {
    if (!out[session_id]) out[session_id] = {}
    out[session_id][player_id] = status
  }
  return out
}

/** Convert nested app object → Supabase rows */
function nestedToRows(nested) {
  return Object.entries(nested).flatMap(([session_id, players]) =>
    Object.entries(players).map(([player_id, status]) => ({ session_id, player_id, status }))
  )
}

export function useAttendance() {
  const [attendance, setAttState] = useState(() => lsGet())

  // ------------------------------------------------------------------
  // Initial fetch
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return

    supabase.from('attendance').select('*').then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] fetch attendance:', error.message)
        return
      }

      if (data && data.length > 0) {
        const nested = rowsToNested(data)
        setAttState(nested)
        lsSet(nested)
      } else {
        // Seed Supabase with localStorage data
        const seed = lsGet()
        const rows = nestedToRows(seed)
        if (rows.length > 0) {
          supabase.from('attendance').upsert(rows).then(({ error: e }) => {
            if (e) console.warn('[Supabase] seed attendance:', e.message)
          })
        }
      }
    })
  }, [])

  // ------------------------------------------------------------------
  // Setter
  // ------------------------------------------------------------------
  function setAttendance(valueOrFn) {
    setAttState(current => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(current) : valueOrFn
      lsSet(next)

      if (supabase) {
        // Find every session whose attendance object changed (or was deleted)
        const allSessionIds = new Set([...Object.keys(current), ...Object.keys(next)])

        for (const sid of allSessionIds) {
          const oldSess = JSON.stringify(current[sid] ?? {})
          const newSess = JSON.stringify(next[sid] ?? {})
          if (oldSess === newSess) continue  // unchanged – skip

          // Delete all existing rows for this session, then insert the new ones.
          // This handles adds, updates, and removals in one simple operation.
          supabase.from('attendance').delete().eq('session_id', sid).then(({ error }) => {
            if (error) { console.warn('[Supabase] attendance delete:', error.message); return }

            const newRows = Object.entries(next[sid] ?? {}).map(([player_id, status]) => ({
              session_id: sid,
              player_id,
              status,
            }))
            if (newRows.length > 0) {
              supabase.from('attendance').insert(newRows).then(({ error: e }) => {
                if (e) console.warn('[Supabase] attendance insert:', e.message)
              })
            }
          })
        }
      }

      return next
    })
  }

  return [attendance, setAttendance]
}
