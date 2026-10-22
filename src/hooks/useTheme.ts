import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

const EVT = 'kasaja-theme-change'

function read(): Theme {
  try {
    const saved = localStorage.getItem('kasaja_theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* ignore */ }
  return 'dark'
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  try { localStorage.setItem('kasaja_theme', theme) } catch { /* ignore */ }
}

/** Dark / light mood. Every component using it (menu, map, settings) stays in step. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(read)

  useEffect(() => {
    apply(theme)
  }, [theme])

  useEffect(() => {
    const on = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail)
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])

  const setTheme = (t: Theme) => {
    apply(t)
    setThemeState(t)
    window.dispatchEvent(new CustomEvent<Theme>(EVT, { detail: t }))
  }
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return { theme, setTheme, toggle }
}
