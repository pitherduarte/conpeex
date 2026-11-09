import { useEffect, useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import event from './data/event.json'
import dataUrl from './data/presentations.json?url&no-inline'
import { eventDates, filterPresentations, indexPresentations, weekLabel } from './calendar'
import type { FilterKey, Filters as FilterState, Period } from './calendar'
import type { Presentation } from './types'
import { Calendar } from './components/Calendar'
import { Filters, makeOptions, SearchBox } from './components/Filters'
import { Details } from './components/Details'
import type { Slot } from './components/Details'
import { ThemeToggle } from './components/ThemeToggle'

const days = eventDates(event.firstDay, event.lastDay)
const eventDaySet = new Set(days)
const dateRange = weekLabel(event.firstDay, event.lastDay)
const collator = new Intl.Collator('pt-BR', { numeric: true })

function Agenda({ items }: { items: Presentation[] }) {
  const { index, options, initialDay } = useMemo(() => ({
    index: indexPresentations(items),
    options: makeOptions(items, days),
    initialDay: items.find(item => item.date)?.date ?? days[0],
  }), [items])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [selected, setSelected] = useState(initialDay)
  const [period, setPeriod] = useState<Period>('all')
  const [detail, setDetail] = useState<Presentation | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)

  const matching = useMemo(() => filterPresentations(index, query, filters, period), [index, query, filters, period])
  const hasFilters = Boolean(query.trim() || Object.keys(filters).length)
  const dayCount = matching.filter(item => item.date === selected).length

  function revealMatches(nextQuery: string, nextFilters: FilterState) {
    const matches = filterPresentations(index, nextQuery, nextFilters, period)
    if (matches.some(item => item.date === selected)) return
    const next = matches.find(item => item.date)?.date
    if (next) setSelected(next)
  }

  function changeQuery(value: string) {
    setQuery(value)
    if (value.trim()) revealMatches(value, filters)
  }

  function changeFilter(key: FilterKey, values: string[]) {
    const next = { ...filters }
    if (values.length) next[key] = values
    else delete next[key]
    setFilters(next)
    if (key === 'date' && eventDaySet.has(values[0])) setSelected(values[0])
    else if (values.length) revealMatches(query, next)
  }

  function clear() {
    setQuery('')
    setFilters({})
    setPeriod('all')
  }

  return <>
    <div className="program-tools">
      <SearchBox value={query} onChange={changeQuery} />
      <Filters filters={filters} options={options} onFilter={changeFilter} onClear={clear} canClear={hasFilters || period !== 'all'} />
    </div>
    <section id="agenda" className="agenda" aria-labelledby="calendar-title">
      <div className="agenda-header">
        <h2 id="calendar-title">Programação das apresentações</h2>
        <span className="timezone"><Clock3 size={15} aria-hidden="true" /> {event.timeZone}</span>
      </div>
      <Calendar days={days} selected={selected} onDay={date => {
        if (filters.date) changeFilter('date', [date])
        else setSelected(date)
      }} period={period} onPeriod={setPeriod} items={matching} onOpen={setDetail}
        onSlot={(date, time, group) => setSlot({ date, time, items: group })}
        hasFilters={hasFilters} onClear={clear}>
        <div className="agenda-meta" role="status">
          <strong>{matching.length.toLocaleString('pt-BR')}</strong> {matching.length === 1 ? 'apresentação encontrada' : 'apresentações encontradas'}
          <span className="day-count"> · {dayCount.toLocaleString('pt-BR')} neste dia</span>
        </div>
      </Calendar>
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
        const eventRecords = records.filter(item => !item.date || eventDaySet.has(item.date))
        eventRecords.sort((a, b) => (a.date ?? 'Z').localeCompare(b.date ?? 'Z') ||
          (a.startTime ?? 'Z').localeCompare(b.startTime ?? 'Z') || collator.compare(a.table ?? '', b.table ?? ''))
        if (!controller.signal.aborted) setItems(eventRecords)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }
    void loadProgram()
    return () => controller.abort()
  }, [attempt])

  return <>
    <a className="skip-link" href="#agenda">Ir para a programação</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a href={import.meta.env.BASE_URL} className="brand" aria-label={`${event.name} · início`}>
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>{event.name}</strong><small>{event.edition} · {event.year}</small></span>
        </a>
        <div className="header-actions">
          <span className="institution"><span className="institution-full">{event.institution}</span><span className="institution-short">{event.institutionShort}</span></span>
          <ThemeToggle />
        </div>
      </div>
    </header>
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <div className="event-date"><span className="event-marker" aria-hidden="true" />{dateRange}</div>
        <h1 id="page-title">Apresentações do {event.name}</h1>
        <p className="intro-text">Encontre trabalhos, consulte horários e conheça as pesquisas apresentadas durante o congresso.</p>
      </section>
      {items ? <Agenda items={items} /> : <div id="agenda" className="empty agenda">
        {failed ? <>
          <p role="alert">Não foi possível carregar a programação.</p>
          <button type="button" className="pill" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Tentar novamente</button>
        </> : <p role="status">Carregando a programação…</p>}
      </div>}
    </main>
    <footer className="site-footer"><div className="shell"><strong>{event.fullName} · {event.institutionShort}</strong><a href={event.sourceUrl}>Programação oficial da UFG</a></div></footer>
  </>
}
