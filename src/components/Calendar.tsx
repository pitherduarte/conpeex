import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import { dateLabel, dayNumber, scheduleByTime, weekdayLabel } from '../calendar'
import type { Presentation } from '../types'
import { PresentationCard } from './PresentationCard'
import './calendar.css'

export function WeekNavigation({ label, onStep, onReset, isInitial }: {
  label: string
  onStep: (offset: number) => void
  onReset: () => void
  isInitial: boolean
}) {
  return <div className="week-navigation">
    <h2 id="calendar-title"><CalendarDays size={20} aria-hidden="true" />{label}</h2>
    <div className="week-buttons">
      {!isInitial && <button type="button" className="pill reset-week" onClick={onReset}>Semana do evento</button>}
      <div className="arrow-group">
        <button type="button" aria-label="Semana anterior" onClick={() => onStep(-7)}><ChevronLeft size={20} /></button>
        <button type="button" aria-label="Próxima semana" onClick={() => onStep(7)}><ChevronRight size={20} /></button>
      </div>
    </div>
  </div>
}

interface Props {
  days: string[]
  selected: string
  onDay: (date: string) => void
  items: Presentation[]
  onOpen: (item: Presentation) => void
  onSlot: (date: string, time: string, items: Presentation[]) => void
  hasFilters: boolean
  onClear: () => void
}

function Empty({ hasFilters, onClear }: Pick<Props, 'hasFilters' | 'onClear'>) {
  return <div className="empty">
    <div className="empty-icon"><CalendarDays size={24} aria-hidden="true" /></div>
    <strong>{hasFilters ? 'Nenhum resultado por aqui' : 'Agenda livre neste período'}</strong>
    <p>{hasFilters ? 'Ajuste a busca ou os filtros para encontrar outros trabalhos.' : 'Escolha outro dia ou navegue para uma semana com apresentações.'}</p>
    {hasFilters && <button type="button" className="pill" onClick={onClear}>Limpar busca e filtros <ArrowRight size={15} /></button>}
  </div>
}

export function Calendar({ days, selected, onDay, items, onOpen, onSlot, hasFilters, onClear }: Props) {
  const byDay = new Map(days.map(day => [day, scheduleByTime(items.filter(item => item.date === day))]))
  const times = [...new Set([...byDay.values()].flatMap(slots => [...slots.keys()]))].sort((a, b) => (a || 'Z').localeCompare(b || 'Z'))
  const daySlots = byDay.get(selected)
  const dayTimes = times.filter(time => daySlots?.has(time))
  const undated = items.filter(item => !item.date)
  return <>
    <div className="weekly-calendar" style={{ '--day-columns': days.length } as React.CSSProperties}>
      <div className="calendar-row week-head">
        <div className="hour-head" title="Horário"><Clock3 size={17} aria-label="Horário" /></div>
        {days.map(day => <div key={day} className={day === selected ? 'day-head current' : 'day-head'} aria-label={dateLabel(day)}>
          <span>{weekdayLabel(day)}</span><strong>{dayNumber(day)}</strong>
        </div>)}
      </div>
      {times.length ? times.map(time => <div className="calendar-row time-row" key={time}>
        <div className="time-label">{time || 'A confirmar'}</div>
        {days.map(day => {
          const group = byDay.get(day)?.get(time) ?? []
          return <div className="calendar-cell" key={day} role={group.length ? 'group' : undefined}
            aria-label={group.length ? `${dateLabel(day)}, ${time || 'horário a confirmar'}` : undefined}>
            {group.slice(0, 1).map(item => <PresentationCard key={item.id} item={item} onOpen={onOpen} compact />)}
            {group.length > 1 && <button type="button" className="more-button" onClick={() => onSlot(day, time, group)}
              aria-label={`Ver ${group.length} apresentações de ${dateLabel(day)} às ${time || 'horário a confirmar'}`}>
              <Plus size={15} aria-hidden="true" />{group.length - 1} {group.length === 2 ? 'apresentação' : 'apresentações'}
            </button>}
          </div>
        })}
      </div>) : !undated.length && <Empty hasFilters={hasFilters} onClear={onClear} />}
    </div>
    <div className="daily-calendar">
      <div className="day-picker" role="group" aria-label="Escolher dia">
        {days.map(day => <button type="button" className="day-pill" key={day} aria-pressed={day === selected}
          aria-label={dateLabel(day)} onClick={() => onDay(day)}>
          <span>{weekdayLabel(day)}</span><strong>{dayNumber(day)}</strong>
        </button>)}
      </div>
      {dayTimes.length > 1 && <label className="filter-pill time-picker">
        <Clock3 size={15} aria-hidden="true" /><span aria-hidden="true">Ir para um horário</span><ChevronDown size={14} aria-hidden="true" />
        <select aria-label="Ir para um horário" value="" onChange={event => {
          const target = document.getElementById(event.target.value)
          target?.scrollIntoView({ block: 'start' })
          target?.focus({ preventScroll: true })
        }}>
          <option value="" disabled>Escolher horário</option>
          {dayTimes.map(time => <option key={time} value={`slot-${selected}-${time}`}>{time || 'Horário a confirmar'}</option>)}
        </select>
      </label>}
      {dayTimes.length ? <div className="daily-slots">
        {dayTimes.map(time => {
          const group = daySlots?.get(time) ?? []
          return <section className="daily-slot" key={time} id={`slot-${selected}-${time}`} tabIndex={-1}>
            <h3>{time || 'Horário a confirmar'}{group.length > 1 && <span>{group.length} apresentações</span>}</h3>
            <div className="slot-items">{group.map(item => <PresentationCard key={item.id} item={item} onOpen={onOpen} />)}</div>
          </section>
        })}
      </div> : <Empty hasFilters={hasFilters} onClear={onClear} />}
    </div>
    {undated.length > 0 && <section className="undated">
      <h3>Data a confirmar</h3>
      <div className="slot-items">{undated.map(item => <PresentationCard key={item.id} item={item} onOpen={onOpen} />)}</div>
    </section>}
  </>
}
