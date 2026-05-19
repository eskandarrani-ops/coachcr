import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const next = value instanceof Function ? value(stored) : value
      setStored(next)
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch (err) {
      console.error(err)
    }
  }

  return [stored, setValue]
}
