import { useEffect, useState } from 'react'

/**
 * True on computers (mouse + hover) with a window at least 560px wide.
 * Zooming the browser in or out never switches the layout: it stays the fixed
 * three-panel desktop screen. Phones and tablets (touch) keep the mobile layout.
 */
const QUERY = '(hover: hover) and (pointer: fine) and (min-width: 560px)'

export function useDesk(): boolean {
  const [desk, setDesk] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  useEffect(() => {
    const q = window.matchMedia(QUERY)
    const on = () => setDesk(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return desk
}
