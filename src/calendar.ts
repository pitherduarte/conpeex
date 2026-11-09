import type { Presentation } from './types'

const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

const asDate = (iso: string) => new Date(iso + 'T00:00:00Z')
export const dateLabel = (iso: string) => fullDate.format(asDate(iso))
export const shortDateLabel = (iso: string) => dayMonth.format(asDate(iso))
export const weekdayLabel = (iso: string) => weekday.format(asDate(iso)).replace('.', '')
export const dayNumber = (iso: string) => asDate(iso).getUTCDate()
export const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '')

export function eventDates(first: string, last: string) {
  const days: string[] = []
  const end = asDate(last)
  for (const date = asDate(first); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    days.push(date.toISOString().slice(0, 10))
  }
  return days
}

export function weekLabel(first: string, last: string) {
  const start = asDate(first)
  const end = asDate(last)
  if (first.slice(0, 7) === last.slice(0, 7)) {
    return `${start.getUTCDate()} a ${end.getUTCDate()} de ${month.format(end)} de ${end.getUTCFullYear()}`
  }
  const startYear = start.getUTCFullYear() === end.getUTCFullYear() ? '' : ` de ${start.getUTCFullYear()}`
  return `${start.getUTCDate()} de ${month.format(start)}${startYear} a ${end.getUTCDate()} de ${month.format(end)} de ${end.getUTCFullYear()}`
}

export function timeLabel(item: Presentation) {
  if (!item.startTime) return item.endTime ? `Início a confirmar · término ${item.endTime}` : 'Horário a confirmar'
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime
}

export const periods = [
  { key: 'all', label: 'Todo o dia' },
  { key: 'morning', label: 'Manhã' },
  { key: 'afternoon', label: 'Tarde' },
  { key: 'evening', label: 'Noite' },
] as const
export type Period = typeof periods[number]['key']

export function timePeriod(time: string | null): Exclude<Period, 'all'> | 'unknown' {
  if (!time) return 'unknown'
  if (time < '12:00') return 'morning'
  if (time < '18:00') return 'afternoon'
  return 'evening'
}

export const filterKeys = ['knowledgeArea', 'modality', 'session', 'table', 'date'] as const
export type FilterKey = typeof filterKeys[number]
export type Filters = Partial<Record<FilterKey, string[]>>
export const unknown = '__unknown__'
export const filterValue = (item: Presentation, key: FilterKey) => key === 'knowledgeArea' && item.knowledgeArea === 'Lingüística, Letras e Artes'
  ? 'Linguística, Letras e Artes' : item[key] ?? unknown

export function indexPresentations(items: Presentation[]) {
  return items.map(item => ({
    item,
    text: normalize([item.title, ...item.authors, item.knowledgeArea ?? 'Não classificada', item.modality].join(' ')),
  }))
}

export function filterPresentations(index: ReturnType<typeof indexPresentations>, query: string, filters: Filters, period: Period = 'all') {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  return index.filter(({ item, text }) =>
    (period === 'all' || timePeriod(item.startTime) === period) &&
    terms.every(term => text.includes(term)) &&
    filterKeys.every(key => !filters[key]?.length || filters[key].includes(filterValue(item, key)))
  ).map(({ item }) => item)
}

export function scheduleByTime(items: Presentation[]) {
  const groups = new Map<string, Presentation[]>()
  for (const item of items) {
    const time = item.startTime ?? ''
    const group = groups.get(time) ?? []
    group.push(item)
    groups.set(time, group)
  }
  return groups
}
