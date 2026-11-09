import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, GraduationCap } from 'lucide-react'
import event from './data/event.json'
import dataUrl from './data/presentations.json?url&no-inline'
import { filterPresentations, indexPresentations, moveDay, unknown, weekLabel, weekStart } from './calendar'
import type { FilterKey, Filters as FilterState } from './calendar'
import type { Presentation } from './types'
import { Calendar, WeekNavigation } from './components/Calendar'
import { Filters, makeOptions, SearchBox } from './components/Filters'
import { Details } from './components/Details'
import type { Slot } from './components/Details'

const initialWeek = weekStart(event.firstDay)

function Agenda({ items }: { items: Presentation[] }) {
  const { index, options, datesWithEvents, initialDay } = useMemo(() => ({
    index: indexPresentations(items),
    options: makeOptions(items),
    datesWithEvents: new Set(items.flatMap(item => item.date ? [item.date] : [])),
    initialDay: items.find(item => item.date && item.date >= event.firstDay && item.date <= event.lastDay)?.date ?? event.firstDay,
  }), [items])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [week, setWeek] = useState(initialWeek)
  const [selected, setSelected] = useState(initialDay)
  const [detail, setDetail] = useState<Presentation | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)

  const matching = useMemo(() => filterPresentations(index, query, filters), [index, query, filters])
  const days = Array.from({ length: 7 }, (_, i) => moveDay(week, i)).filter((day, i) => i < 5 || datesWithEvents.has(day))
  const visible = matching.filter(item => item.date ? days.includes(item.date) : week === initialWeek)
  const hasFilters = Boolean(query.trim() || Object.keys(filters).length)
  const firstMatch = matching.find(item => item.date)?.date
  const dayCount = visible.filter(item => item.date === selected).length

  function revealMatches(nextQuery: string, nextFilters: FilterState) {
    const dates = filterPresentations(index, nextQuery, nextFilters).flatMap(item => item.date ? [item.date] : [])
    if (dates.includes(selected)) return
    const next = dates.find(date => days.includes(date)) ?? dates[0]
    if (next) {
      setWeek(weekStart(next))
      setSelected(next)
    }
  }

  function changeQuery(value: string) {
    setQuery(value)
    if (value.trim()) revealMatches(value, filters)
  }

  function changeFilter(key: FilterKey, value: string) {
    const next = { ...filters }
    if (value) next[key] = value
    else delete next[key]
    setFilters(next)
    if (key === 'date' && value && value !== unknown) {
      setWeek(weekStart(value))
      setSelected(value)
    } else if (key === 'date' && value === unknown) {
      setWeek(initialWeek)
      setSelected(initialDay)
    } else if (value) {
      revealMatches(query, next)
    }
  }

  function changeWeek(next: string) {
    setWeek(next)
    setSelected(Array.from({ length: 7 }, (_, index) => moveDay(next, index)).find(day => datesWithEvents.has(day)) ?? next)
  }

  function clear() {
    setQuery('')
    setFilters({})
  }

  return <>
      <SearchBox value={query} onChange={changeQuery} />
      <Filters filters={filters} options={options} onFilter={changeFilter} onClear={clear} canClear={hasFilters} />
      <section id="agenda" className="agenda" aria-labelledby="calendar-title">
        <WeekNavigation label={weekLabel(days[0], days.at(-1)!)} onStep={offset => changeWeek(moveDay(week, offset))}
          onReset={() => changeWeek(initialWeek)} isInitial={week === initialWeek} />
        <div className="agenda-meta">
          <span role="status"><strong>{matching.length.toLocaleString('pt-BR')}</strong> {matching.length === 1 ? 'apresentação encontrada' : 'apresentações encontradas'}
            {visible.length !== matching.length && ` · ${visible.length} nesta semana`}
            <span className="day-count"> · {dayCount.toLocaleString('pt-BR')} neste dia</span></span>
          <span className="timezone"><Clock3 size={15} aria-hidden="true" /> {event.timeZone}</span>
        </div>
        {firstMatch && !visible.length && hasFilters && <button type="button" className="pill jump-results"
          onClick={() => { setWeek(weekStart(firstMatch)); setSelected(firstMatch) }}>Ir para a semana com resultados</button>}
        <Calendar days={days} selected={selected} onDay={date => {
          if (filters.date) changeFilter('date', date)
          else setSelected(date)
        }} items={visible} onOpen={setDetail}
          onSlot={(date, time, group) => setSlot({ date, time, items: group })} hasFilters={hasFilters} onClear={clear} />
      </section>
    <Details item={detail} slot={slot} onClose={() => { setDetail(null); setSlot(null) }} onBack={() => setDetail(null)} onOpen={setDetail} />
  </>
}

export function App() {
  const [items, setItems] = useState<Presentation[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProgram() {
      try {
        const response = await fetch(dataUrl, { signal: controller.signal })
        if (!response.ok) throw new Error('Falha ao carregar a programação')
        const records: Presentation[] = await response.json()
        const collator = new Intl.Collator('pt-BR', { numeric: true })
        records.sort((a, b) => (a.date ?? 'Z').localeCompare(b.date ?? 'Z') ||
          (a.startTime ?? 'Z').localeCompare(b.startTime ?? 'Z') || collator.compare(a.table ?? '', b.table ?? ''))
        if (!controller.signal.aborted) setItems(records)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }
    void loadProgram()
    return () => controller.abort()
  }, [attempt])

  return <>
    <a className="skip-link" href="#agenda">Ir para a agenda</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a href={import.meta.env.BASE_URL} className="brand" aria-label={`${event.name} · início`}>
          <img width="43" height="43" src={import.meta.env.BASE_URL + 'marca.svg'} alt="" />
          <span><strong>{event.name}</strong><small>{event.edition} · {event.year}</small></span>
        </a>
        <span className="institution"><GraduationCap size={19} aria-hidden="true" /><span className="institution-full">{event.institution}</span><span className="institution-short">{event.institutionShort}</span></span>
      </div>
    </header>
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow"><span /> {event.fullName}</p>
          <h1 id="page-title">Agenda acadêmica<span>.</span></h1>
          <p className="intro-text">Encontre trabalhos, consulte horários e planeje sua visita ao {event.name}.</p>
        </div>
        <div className="event-date"><CalendarDays size={19} aria-hidden="true" /> {weekLabel(event.firstDay, event.lastDay)}</div>
      </section>
      {items ? <Agenda items={items} /> : <div id="agenda" className="empty agenda">
        {failed ? <>
          <p role="alert">Não foi possível carregar a programação.</p>
          <button type="button" className="pill" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Tentar novamente</button>
        </> : <p role="status">Carregando a programação…</p>}
      </div>}
    </main>
    <footer className="site-footer"><div className="shell"><strong>{event.name} {event.year}</strong><span>{event.institution}</span></div></footer>
  </>
}
