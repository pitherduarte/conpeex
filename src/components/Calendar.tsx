import { useState } from 'react'
import { CalendarDays, ChevronRight, Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { dateLabel, dayNumber, periods, scheduleByTime, shortDateLabel, timePeriod, weekdayLabel } from '../calendar'
import type { Period } from '../calendar'
import type { Presentation } from '../types'
import { PresentationCard } from './PresentationCard'
import { minutes } from './eventClock'
import { useCalendarZoom } from './useCalendarZoom'
import './calendar.css'

interface Props {
  days: string[]
  selected: string
  onDay: (date: string) => void
  period: Period
  onPeriod: (period: Period) => void
  items: Presentation[]
  onOpen: (item: Presentation) => void
  onSlot: (date: string, time: string, items: Presentation[]) => void
  hasFilters: boolean
  onClear: () => void
  children: ReactNode
  now: { date: string; time: string }
}

function Empty({ hasFilters, onClear, period }: Pick<Props, 'hasFilters' | 'onClear' | 'period'>) {
  return <div className="empty">
    <CalendarDays size={23} aria-hidden="true" />
    <strong>{hasFilters ? 'Nenhum resultado por aqui' : period !== 'all' ? 'Nenhuma apresentação neste período' : 'Nenhuma apresentação neste dia'}</strong>
    <p>{hasFilters ? 'Ajuste a busca ou os filtros para ver outros trabalhos.' : 'Escolha outro dia ou período para consultar mais apresentações.'}</p>
    {hasFilters && <button type="button" className="pill" onClick={onClear}>Limpar busca e filtros</button>}
  </div>
}

function SlotPreview({ day, time, items, max, onOpen, onSlot }: {
  day: string
  time: string
  items: Presentation[]
  max: number
  onOpen: Props['onOpen']
  onSlot: Props['onSlot']
}) {
  if (items.length === 0) return null
  const remaining = items.length - max
  return <>
    <div className="slot-items">
      {items.slice(0, max).map(item => <PresentationCard key={item.id} item={item} onOpen={onOpen} compact={max === 1} />)}
    </div>
    {remaining > 0 && <button type="button" className="more-button" onClick={() => onSlot(day, time, items)}
      aria-label={`Ver ${items.length} apresentações de ${dateLabel(day)}${time ? ` às ${time}` : ', horário a confirmar'}`}>
      <span>+ {remaining} {remaining === 1 ? 'apresentação' : 'apresentações'}</span><ChevronRight size={14} aria-hidden="true" />
    </button>}
  </>
}

const sections = [
  { key: 'morning', label: 'Manhã', range: 'Antes de 12h' },
  { key: 'afternoon', label: 'Tarde', range: '12h às 17h59' },
  { key: 'evening', label: 'Noite', range: 'A partir de 18h' },
  { key: 'unknown', label: 'Horário a confirmar', range: '' },
] as const

export function Calendar({ days, selected, onDay, period, onPeriod, items, onOpen, onSlot, hasFilters, onClear, children, now }: Props) {
  const { zoom, surface, change, min, max } = useCalendarZoom()
  const [showWeek, setShowWeek] = useState(false)
  const byDay = new Map(days.map(day => [day, scheduleByTime(items.filter(item => item.date === day))]))
  const times = [...new Set([...byDay.values()].flatMap(slots => [...slots.keys()]))].sort((a, b) => (a || 'Z').localeCompare(b || 'Z'))
  const daySlots = byDay.get(selected)
  const dayTimes = times.filter(time => daySlots?.has(time))
  const undated = items.filter(item => !item.date)
  const nowMinute = minutes(now.time)
  const nowSlots = [...(byDay.get(now.date)?.values() ?? [])].flat()
    .filter(item => item.startTime && timePeriod(item.startTime) === timePeriod(now.time))
  const from = Math.min(...nowSlots.map(item => minutes(item.startTime!)))
  const until = Math.max(...nowSlots.map(item => minutes(item.endTime ?? item.startTime!)))

  function marker(sectionTimes: string[], time: string, index: number) {
    if (!time || nowMinute < from || nowMinute >= until || timePeriod(time) !== timePeriod(now.time)) return null
    const start = minutes(time)
    const end = minutes(sectionTimes[index + 1] ?? now.time)
    const limit = index + 1 < sectionTimes.length ? end : until
    if (nowMinute < start || nowMinute >= limit) return null
    return <span className="now-line" style={{ top: `${100 * (nowMinute - start) / (limit - start)}%` }}
      role="img" aria-label={`Agora, ${now.time}, no horário de Brasília`} />
  }

  return <>
    <div className="day-picker" role="group" aria-label="Escolher dia">
      {days.map(day => <button type="button" className="day-pill" key={day} aria-pressed={day === selected}
        aria-label={dateLabel(day)} onClick={() => onDay(day)}>
        <span>{weekdayLabel(day)}</span><strong>{dayNumber(day)}</strong>
      </button>)}
    </div>
    <div className="calendar-toolbar">
      <div className="period-picker" role="group" aria-label="Período do dia">
        {periods.map(option => <button key={option.key} type="button" aria-pressed={period === option.key}
          onClick={() => onPeriod(option.key)}>{option.label}</button>)}
      </div>
      {children}
    </div>
    <div className="calendar-view-tools">
      <button type="button" className="pill mobile-view" aria-pressed={showWeek} onClick={() => setShowWeek(value => !value)}>{showWeek ? 'Ver dia' : 'Ver semana'}</button>
      <div className="zoom-controls" role="group" aria-label="Zoom do calendário">
        <button type="button" aria-label="Diminuir zoom" disabled={zoom <= min} onClick={() => change(zoom - .1)}><Minus size={16} /></button>
        <button type="button" aria-label="Restaurar zoom padrão" onClick={() => change(1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="Aumentar zoom" disabled={zoom >= max} onClick={() => change(zoom + .1)}><Plus size={16} /></button>
      </div>
    </div>
    <div ref={surface} className={`calendar-surface${showWeek ? ' show-week' : ''}`} style={{ '--zoom': zoom } as React.CSSProperties}
      role="region" aria-label="Grade do calendário" tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return
        if (event.key !== '+' && event.key !== '=' && event.key !== '-' && event.key !== '0') return
        event.preventDefault()
        change(event.key === '0' ? 1 : zoom + (event.key === '-' ? -.1 : .1))
      }}>
    <div className="weekly-scroll"><div className="weekly-calendar">
      <div className="calendar-row week-head">
        <div className="hour-head">Horário</div>
        {days.map(day => <div key={day} className="day-head" aria-label={dateLabel(day)}>
          <span>{weekdayLabel(day)}</span>
          <strong>{shortDateLabel(day)}</strong>
          {!byDay.get(day)?.size && <small>Sem apresentações</small>}
        </div>)}
      </div>
      {!times.length && <Empty hasFilters={hasFilters} onClear={onClear} period={period} />}
      {sections.map(section => {
        const sectionTimes = times.filter(time => timePeriod(time) === section.key)
        if (!sectionTimes.length) return null
        return <section key={section.key} aria-label={section.label}>
          <div className="period-band"><h3>{section.label}</h3>{section.range && <span>{section.range}</span>}</div>
          {sectionTimes.map((time, index) => <div className="calendar-row time-row" key={time}>
            <div className="time-label">{time || 'A confirmar'}</div>
            {days.map(day => {
              const group = byDay.get(day)?.get(time) ?? []
              return <div className="calendar-cell" key={day} role={group.length ? 'group' : undefined}
                aria-label={group.length ? `${dateLabel(day)}, ${time || 'horário a confirmar'}` : undefined}>
                <SlotPreview day={day} time={time} items={group} max={1} onOpen={onOpen} onSlot={onSlot} />
                {day === now.date && marker(sectionTimes, time, index)}
              </div>
            })}
          </div>)}
        </section>
      })}
    </div></div>
    <div className="daily-calendar">
      {!dayTimes.length && <Empty hasFilters={hasFilters} onClear={onClear} period={period} />}
      {sections.map(section => {
        const sectionTimes = dayTimes.filter(time => timePeriod(time) === section.key)
        if (!sectionTimes.length) return null
        return <section className="daily-period" key={section.key} aria-label={section.label}>
          {period === 'all' && section.key !== 'unknown' && <div className="period-band"><h3>{section.label}</h3><span>{section.range}</span></div>}
          {sectionTimes.map((time, index) => {
            const group = daySlots?.get(time) ?? []
            return <section className="daily-slot" key={time} id={`slot-${selected}-${time}`}>
              <h4>{time || 'Horário a confirmar'}<span>{group.length} {group.length === 1 ? 'apresentação' : 'apresentações'}</span></h4>
              <SlotPreview day={selected} time={time} items={group} max={2} onOpen={onOpen} onSlot={onSlot} />
              {selected === now.date && marker(sectionTimes, time, index)}
            </section>
          })}
        </section>
      })}
    </div>
    </div>
    {undated.length > 0 && <section className="undated">
      <h3>Data a confirmar</h3>
      <div className="slot-items">{undated.map(item => <PresentationCard key={item.id} item={item} onOpen={onOpen} />)}</div>
    </section>}
  </>
}
