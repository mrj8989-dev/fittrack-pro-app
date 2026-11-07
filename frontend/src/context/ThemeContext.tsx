import { createContext, useContext, useEffect, useState } from 'react'

type AccentColor = 'green' | 'blue' | 'purple' | 'cyan' | 'orange'
type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  mode: ThemeMode
  accent: AccentColor
  toggleMode: () => void
  setAccent: (color: AccentColor) => void
}

const accentColors: Record<AccentColor, { primary: string; light: string; dark: string }> = {
  green:  { primary: '#10B981', light: '#6EE7B7', dark: '#047857' },
  blue:   { primary: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8' },
  purple: { primary: '#8B5CF6', light: '#C4B5FD', dark: '#6D28D9' },
  cyan:   { primary: '#06B6D4', light: '#67E8F9', dark: '#0E7490' },
  orange: { primary: '#F97316', light: '#FDBA74', dark: '#C2410C' },
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('ft-mode') as ThemeMode) || 'dark'
  )
  const [accent, setAccentState] = useState<AccentColor>(
    () => (localStorage.getItem('ft-accent') as AccentColor) || 'green'
  )

  // useState<string>('hola')     // solo acepta strings
  // useState<number>(0)          // solo acepta números
  // useState<boolean>(false)     // solo acepta booleanos
  // useState<string[]>([])       // solo acepta array de strings


  //   function setAccentState(nuevoValor) {
  //   accent = nuevoValor        // actualiza el valor
  //   renderizaElComponente()    // re-renderiza
  //   ejecutaLosUseEffects()     // dispara los useEffect que escuchan
  // }

  // setAccentState('blue')
  //       ↓
  // const [accent, setAccentState] = useState<AccentColor>('green')
  // // accent pasa de 'green' a 'blue'
  //         ↓
  // useEffect(() => { ... }, [mode, accent])
  // // detecta que accent cambió → se ejecuta
  //         ↓
  // --accent-primary: #378ADD
  // toda la app se pone azul

  useEffect(() => {
    const root = document.documentElement
    const colors = accentColors[accent]
    root.style.setProperty('--accent-primary', colors.primary)
    root.style.setProperty('--accent-light', colors.light)
    root.style.setProperty('--accent-dark', colors.dark)
    root.setAttribute('data-mode', mode)
    localStorage.setItem('ft-mode', mode)
    localStorage.setItem('ft-accent', accent)
  }, [mode, accent])

  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark')
  const setAccent = (color: AccentColor) => {
    setAccentState(color)
    localStorage.setItem('ft-accent', color)
  }

  return (
    <ThemeContext.Provider value={{ mode, accent, toggleMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { accentColors }
export type { AccentColor, ThemeMode }