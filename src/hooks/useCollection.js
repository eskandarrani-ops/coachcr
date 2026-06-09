/**
 * useCollection – drop-in replacement for useLocalStorage for arrays of objects with an `id` field.
 *
 * Behaviour:
 *  1. Reads from localStorage immediately (instant first render, works offline).
 *  2. On mount, fetches the table from Supabase:
 *       – If Supabase has rows → use as source of truth, update localStorage.
 *       – If Supabase is empty → seed it with whatever is in localStorage.
 *       – If Supabase is unreachable → stay on localStorage silently.
 *  3. On every write, updates state + localStorage synchronously, then diffs
 *     against the previous value and pushes only the changes to Supabase
 *     (upsert added/edited rows, delete removed rows).
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota / private mode */ }
}

// Normalise a row coming back from Supabase so it matches the app's shape.
// Handles jsonb fields that PostgREST already parses, and ensures coaches is always [].
function normaliseRow(tableName, row) {
  if (tableName === 'sessions') {
    return { ...row, coaches: row.coaches ?? [] }
  }
  return row
}

export function useCollection(localKey, tableName, initialValue) {
  const [data, setDataState] = useState(() => lsGet(localKey, initialValue))

  // ------------------------------------------------------------------
  // Initial fetch from Supabase
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return

    supabase.from(tableName).select('*').then(({ data: rows, error }) => {
      if (error) {
        console.warn(`[Supabase] fetch ${tableName}:`, error.message)
        return
      }

      if (rows.length > 0) {
        // Supabase is the source of truth
        const normalised = rows.map(r => normaliseRow(tableName, r))
        setDataState(normalised)
        lsSet(localKey, normalised)
      } else {
        // Supabase is empty – seed it with localStorage data
        const seed = lsGet(localKey, initialValue)
        if (seed.length > 0) {
          const seedRows = seed.map(r => normaliseRow(tableName, r))
          supabase.from(tableName).upsert(seedRows).then(({ error: e }) => {
            if (e) console.warn(`[Supabase] seed ${tableName}:`, e.message)
          })
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ------------------------------------------------------------------
  // Setter – synchronous localStorage update + async Supabase diff sync
  // ------------------------------------------------------------------
  function setData(valueOrFn) {
    setDataState(current => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(current) : valueOrFn
      lsSet(localKey, next)

      if (supabase) {
        const nextIds = new Set(next.map(r => r.id))
        const currentIds = new Set(current.map(r => r.id))

        // Rows removed from the array → DELETE
        const deletedIds = current.filter(r => !nextIds.has(r.id)).map(r => r.id)

        // Rows that are new or changed → UPSERT
        const toUpsert = next.filter(r => {
          if (!currentIds.has(r.id)) return true               // new row
          const old = current.find(o => o.id === r.id)
          return JSON.stringify(old) !== JSON.stringify(r)     // changed row
        }).map(r => normaliseRow(tableName, r))

        if (deletedIds.length > 0) {
          supabase.from(tableName).delete().in('id', deletedIds)
            .then(({ error }) => { if (error) console.warn(`[Supabase] delete ${tableName}:`, error.message) })
        }
        if (toUpsert.length > 0) {
          supabase.from(tableName).upsert(toUpsert)
            .then(({ error }) => { if (error) console.warn(`[Supabase] upsert ${tableName}:`, error.message) })
        }
      }

      return next
    })
  }

  return [data, setData]
}
