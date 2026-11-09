import { useEffect, useState } from 'react'

const timeZone = 'America/Sao_Paulo'
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
const hourFormat = new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fullFormat = new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'full' })
const compactFormat = new Intl.DateTimeFormat('pt-BR', { timeZone, day: 'numeric', month: 'short', year: 'numeric' })

function readClock() {
  const now = new Date()
  const parts = Object.fromEntries(dateFormat.formatToParts(now).map(part => [part.type, part.value]))
  return {
    instant: now.toISOString(),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: hourFormat.format(now),
    full: fullFormat.format(now),
    compact: compactFormat.format(now).replace('.', ''),
  }
}

export function useEventClock() {
  const [now, setNow] = useState(readClock)
  useEffect(() => {
    let timer: number
    function update() {
      window.clearTimeout(timer)
      setNow(readClock())
      timer = window.setTimeout(update, 60_000 - Date.now() % 60_000 + 30)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return now
}

export function minutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
