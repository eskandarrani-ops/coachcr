/**
 * useCollection – drop-in replacement for useLocalStorage for arrays of objects with an `id` field.
 *
 * Priority on load:
 *   1. Render from localStorage immediately (instant first paint, works offline).
 *   2. Fetch from Supabase async:
 *        – Got rows  → Supabase is source of truth, overwrite state + localStorage.
 *        – Empty     → Seed Supabase with current localStorage data.
 *        – Error     → Stay on localStorage, log details, mark status.
 *
 * Priority on write:
 *   Update state + localStorage synchronously.
 *   Diff against previous value → upsert changed/added rows, delete removed rows in Supabase.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { setStatus } from '../lib/supabaseStatus'

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function normaliseRow(tableName, row) {
  if (tableName === 'sessions') {
    return { ...row, coaches: row.coaches ?? [] }
  }
  return row
}

export function useCollection(localKey, tableName, initialValue) {
  const [data, setDataState] = useState(() => {
    const cached = lsGet(localKey, initialValue)
    console.log(`[useCollection] ${tableName} — init from localStorage: ${cached.length} rows`)
    return cached
  })

  // ------------------------------------------------------------------
  // Initial Supabase fetch
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) {
      console.warn(`[useCollection] ${tableName} — Supabase client is null (missing env vars), using localStorage only`)
      setStatus('offline')
      return
    }

    console.log(`[useCollection] ${tableName} — fetching from Supabase…`)

    supabase.from(tableName).select('*').then(({ data: rows, error }) => {
      if (error) {
        console.error(`[useCollection] ${tableName} — fetch error:`, error.code, error.message)
        setStatus('offline')
        return
      }

      console.log(`[useCollection] ${tableName} — Supabase returned ${rows.length} rows`)
      setStatus('connected')

      if (rows.length > 0) {
        // ✅ Supabase has data — use it as the source of truth
        const normalised = rows.map(r => normaliseRow(tableName, r))
        console.log(`[useCollection] ${tableName} — overwriting localStorage with Supabase data`)
        setDataState(normalised)
        lsSet(localKey, normalised)
      } else {
        // ⚠️ Supabase is empty — attempt to seed it from localStorage
        const seed = lsGet(localKey, initialValue)
        console.log(`[useCollection] ${tableName} — Supabase empty, seeding with ${seed.length} rows from localStorage…`)

        if (seed.length > 0) {
          const seedRows = seed.map(r => normaliseRow(tableName, r))
          supabase.from(tableName).upsert(seedRows).then(({ error: seedErr }) => {
            if (seedErr) {
              console.error(
                `[useCollection] ${tableName} — seed FAILED:`,
                seedErr.code, seedErr.message,
                seedErr.code === '42501'
                  ? '\n⚠️  RLS POLICY MISSING — run: ALTER TABLE ' + tableName + ' DISABLE ROW LEVEL SECURITY;'
                  : ''
              )
              setStatus('rls-error')
            } else {
              console.log(`[useCollection] ${tableName} — seed OK ✓`)
              setStatus('connected')
            }
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
        const nextMap = new Map(next.map(r => [r.id, r]))
        const currentMap = new Map(current.map(r => [r.id, r]))

        const deletedIds = current.filter(r => !nextMap.has(r.id)).map(r => r.id)
        const toUpsert = next.filter(r => {
          const old = currentMap.get(r.id)
          return !old || JSON.stringify(old) !== JSON.stringify(r)
        }).map(r => normaliseRow(tableName, r))

        if (deletedIds.length > 0) {
          console.log(`[useCollection] ${tableName} — deleting IDs:`, deletedIds)
          supabase.from(tableName).delete().in('id', deletedIds).then(({ error }) => {
            if (error) console.error(`[useCollection] ${tableName} delete error:`, error.message)
            else console.log(`[useCollection] ${tableName} — deleted ${deletedIds.length} row(s) ✓`)
          })
        }

        if (toUpsert.length > 0) {
          console.log(`[useCollection] ${tableName} — upserting ${toUpsert.length} row(s)`)
          supabase.from(tableName).upsert(toUpsert).then(({ error }) => {
            if (error) {
              console.error(
                `[useCollection] ${tableName} upsert error:`, error.code, error.message,
                error.code === '42501' ? '\n⚠️  RLS POLICY BLOCKING WRITES' : ''
              )
              setStatus('rls-error')
            } else {
              console.log(`[useCollection] ${tableName} — upserted ${toUpsert.length} row(s) ✓`)
            }
          })
        }
      }

      return next
    })
  }

  return [data, setData]
}
