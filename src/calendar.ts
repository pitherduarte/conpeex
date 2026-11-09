import type { Presentation } from './types'

const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })

export const asDate = (iso: string) => new Date(iso + 'T00:00:00Z')
export const dateLabel = (iso: string) => fullDate.format(asDate(iso))
export const shortDateLabel = (iso: string) => shortDate.format(asDate(iso)).replace('.', '')
export const weekdayLabel = (iso: string) => weekday.format(asDate(iso)).replace('.', '')
export const dayNumber = (iso: string) => asDate(iso).getUTCDate()
export const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '')

export function moveDay(iso: string, offset: number) {
  const date = asDate(iso)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function weekStart(iso: string) {
  return moveDay(iso, -((asDate(iso).getUTCDay() + 6) % 7))
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

export const filterKeys = ['knowledgeArea', 'modality', 'session', 'table', 'date'] as const
export type FilterKey = typeof filterKeys[number]
export type Filters = Partial<Record<FilterKey, string>>
export const unknown = '__unknown__'
export const filterValue = (item: Presentation, key: FilterKey) => key === 'knowledgeArea' && item.knowledgeArea === 'Lingüística, Letras e Artes'
  ? 'Linguística, Letras e Artes' : item[key] ?? unknown

export function indexPresentations(items: Presentation[]) {
  return items.map(item => ({
    item,
    text: normalize([item.title, ...item.authors, item.knowledgeArea ?? 'Não classificada', item.modality].join(' ')),
  }))
}

export function filterPresentations(index: ReturnType<typeof indexPresentations>, query: string, filters: Filters) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  return index.filter(({ item, text }) =>
    terms.every(term => text.includes(term)) &&
    filterKeys.every(key => !filters[key] || filterValue(item, key) === filters[key])
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

export function modalityColor(value: string | null) {
  const label = normalize(value ?? '')
  if (label.includes('pip') || label.includes('iniciacao')) return 'blue'
  if (label.includes('pos') || label.includes('prolicen')) return 'purple'
  if (label.includes('extensao') || label.includes('cultura') || label === 'probec') return 'amber'
  return 'green'
}
