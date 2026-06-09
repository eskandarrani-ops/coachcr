/**
 * Lightweight module-level status tracker.
 * All useCollection / useGroups / useAttendance hooks write here.
 * Components subscribe via useSupabaseStatus().
 *
 * States:
 *   'checking'   – initial, haven't completed a round-trip yet
 *   'connected'  – at least one successful read from Supabase
 *   'rls-error'  – read works but writes are blocked (RLS policy missing)
 *   'offline'    – network / fetch error
 */

let _status = 'checking'
const _listeners = new Set()

export function getStatus() {
  return _status
}

export function setStatus(next) {
  if (next === _status) return   // no-op if unchanged
  console.log(`[Supabase status] ${_status} → ${next}`)
  _status = next
  _listeners.forEach(fn => fn(next))
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function onStatusChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
