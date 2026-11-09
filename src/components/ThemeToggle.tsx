import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'
const themeKey = 'conpeex-theme'
const systemTheme = '(prefers-color-scheme: dark)'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(themeKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function ThemeToggle() {
  const [choice, setChoice] = useState(storedTheme)
  const [prefersDark, setPrefersDark] = useState(() => matchMedia(systemTheme).matches)
  const theme = choice ?? (prefersDark ? 'dark' : 'light')

  useEffect(() => {
    const media = matchMedia(systemTheme)
    const change = () => setPrefersDark(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101110' : '#fafbf9')
  }, [theme])

  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setChoice(next)
    try {
      localStorage.setItem(themeKey, next)
    } catch {
      // The current tab still keeps the selection when storage is unavailable.
    }
  }

  return <button type="button" className="theme-toggle icon-button" aria-label={label} title={label} onClick={toggle}>
    {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
  </button>
}
