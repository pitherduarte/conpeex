import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { dateLabel, filterKeys, filterValue, normalize, unknown } from '../calendar'
import type { FilterKey, Filters as FilterState } from '../calendar'
import { displayText } from '../presentationText'
import type { Presentation } from '../types'
import { AcronymHelp } from './AcronymHelp'
import './filters.css'

const labels: Record<FilterKey, string> = {
  knowledgeArea: 'Área', modality: 'Modalidade', session: 'Sessão', table: 'Mesa / TV', date: 'Dia',
}
const areas = [
  'Ciências Exatas e da Terra', 'Engenharias', 'Ciências Biológicas', 'Ciências da Saúde',
  'Ciências Agrárias', 'Ciências Sociais Aplicadas', 'Ciências Humanas', 'Linguística, Letras e Artes',
  'Multidisciplinar',
]
const collator = new Intl.Collator('pt-BR', { numeric: true })

export function makeOptions(items: Presentation[], days: readonly string[] = []) {
  return Object.fromEntries(filterKeys.map(key => {
    const values = new Set(items.map(item => filterValue(item, key)))
    const options = [...values].filter(value => value !== unknown).sort(collator.compare)
    const ordered = key === 'knowledgeArea' ? [...new Set([...areas, ...options])] : options
    if (key === 'date' && days.length) return [key, [...days]]
    if (values.has(unknown) || key === 'knowledgeArea') ordered.push(unknown)
    return [key, ordered]
  })) as Record<FilterKey, string[]>
}

function optionLabel(key: FilterKey, value: string) {
  if (value === unknown) return key === 'knowledgeArea' ? 'Não classificada' : 'Não informado'
  return key === 'date' ? dateLabel(value) : displayText(value)
}

export function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null)

  return <div className="search-box" role="search">
    <Search size={19} aria-hidden="true" />
    <input ref={input} type="search" value={value} onChange={event => onChange(event.target.value)}
      aria-label="Pesquisar apresentações" placeholder="Buscar trabalho, autor ou área" />
    {value && <button type="button" className="search-clear" aria-label="Limpar pesquisa" onClick={() => {
      onChange('')
      input.current?.focus()
    }}><X size={17} aria-hidden="true" /></button>}
  </div>
}

interface PickerProps {
  field: FilterKey
  values: string[]
  options: string[]
  onChange: (values: string[]) => void
  onClose: () => void
}

function FilterPicker({ field, values, options, onChange, onClose }: PickerProps) {
  const panel = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [query, setQuery] = useState('')
  const isMultiple = field !== 'date'
  const showSearch = options.length >= 10
  const term = normalize(query.trim())
  const displayed = options
    .map(value => ({ value, label: optionLabel(field, value) }))
    .filter(({ label }) => normalize(label).includes(term))

  useEffect(() => {
    heading.current?.focus()
  }, [])

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const fromSearch = target.matches('[type="search"]')
    const fromOption = target.hasAttribute('data-filter-option')
    const fromHeading = target === heading.current
    if (!(fromSearch || fromOption || fromHeading)) return

    const choices = [...(panel.current?.querySelectorAll<HTMLElement>('[data-filter-option]') ?? [])]
    if (!choices.length) return
    const index = choices.indexOf(target)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      choices[Math.min(index + 1, choices.length - 1)].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      choices[index < 0 ? choices.length - 1 : Math.max(index - 1, 0)].focus()
    } else if (!fromSearch && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      choices[event.key === 'Home' ? 0 : choices.length - 1].focus()
    }
  }

  return <div ref={panel} className="filter-dropdown" id={`filter-options-${field}`} role="group"
    aria-labelledby={`filter-title-${field}`} onKeyDown={handleKeys}>
    <div className="filter-dropdown-head">
      <h3 id={`filter-title-${field}`} ref={heading} tabIndex={-1}>{labels[field]}</h3>
      {values.length > 0 && <button type="button" className="filter-action" onClick={() => {
        onChange([])
        if (isMultiple) heading.current?.focus()
        else onClose()
      }}>Limpar seleção</button>}
    </div>
    {showSearch && <label className="filter-search">
      <Search size={15} aria-hidden="true" />
      <input type="search" aria-label="Buscar opções" placeholder="Buscar opções" value={query} onChange={event => setQuery(event.target.value)} />
    </label>}
    <div className="filter-choices">
      {displayed.length === 0 && <p className="filter-no-options" role="status">Nenhuma opção encontrada.</p>}
      {displayed.map(({ value, label }) => {
        const checked = values.includes(value)
        return <div key={value} className={checked ? 'filter-choice is-selected' : 'filter-choice'}>
          {isMultiple ? <label className="filter-choice-label">
            <input type="checkbox" data-filter-option checked={checked}
              onChange={() => onChange(checked ? values.filter(selected => selected !== value) : [...values, value])} />
            <span>{label}</span>
          </label> : <button type="button" className="filter-choice-label" data-filter-option aria-pressed={checked}
            onClick={() => { onChange([value]); onClose() }}>
            <span>{label}</span>
            {checked && <Check size={16} aria-hidden="true" />}
          </button>}
          <AcronymHelp text={label} />
        </div>
      })}
    </div>
    {isMultiple && <div className="filter-dropdown-footer">
      <button type="button" className="filter-action filter-done" onClick={onClose}>Concluir</button>
    </div>}
  </div>
}

interface Props {
  filters: FilterState
  options: ReturnType<typeof makeOptions>
  onFilter: (key: FilterKey, values: string[]) => void
  onClear: () => void
  canClear: boolean
}

export function Filters({ filters, options, onFilter, onClear, canClear }: Props) {
  const [active, setActive] = useState<FilterKey | null>(null)
  const bar = useRef<HTMLDivElement>(null)
  const triggers = useRef<Partial<Record<FilterKey, HTMLButtonElement>>>({})

  useEffect(() => {
    if (!active) return
    const control = triggers.current[active]?.parentElement

    function dismissOutside(event: Event) {
      if (!control?.contains(event.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
    }
  }, [active])

  function closePicker() {
    if (active) triggers.current[active]?.focus()
    setActive(null)
  }

  function handleEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !active) return
    if (bar.current?.querySelector('[data-acronym-open]')) return
    event.stopPropagation()
    event.preventDefault()
    closePicker()
  }

  return <div ref={bar} className="filter-bar" role="group" aria-label="Filtros da programação" onKeyDown={handleEscape}>
    <span className="filter-label"><SlidersHorizontal size={16} aria-hidden="true" /> Filtros</span>
    <div className="filter-options">
      {filterKeys.map(key => {
        const values = filters[key] ?? []
        const open = active === key
        return <div key={key} className="filter-control">
          <button type="button" className={values.length ? 'filter-pill is-active' : 'filter-pill'}
            ref={node => { if (node) triggers.current[key] = node }}
            aria-label={labels[key]} aria-expanded={open} aria-controls={open ? `filter-options-${key}` : undefined}
            aria-description={values.length ? values.map(value => optionLabel(key, value)).join(', ') : undefined}
            onClick={() => setActive(open ? null : key)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' && !open) {
                event.preventDefault()
                setActive(key)
              }
            }}>
            {labels[key]} {values.length > 0 && <span className="filter-count" aria-hidden="true">{values.length}</span>}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {open && <FilterPicker field={key} options={options[key]} values={values} onChange={next => onFilter(key, next)} onClose={closePicker} />}
        </div>
      })}
      {canClear && <button type="button" className="clear-all" onClick={() => {
        triggers.current.knowledgeArea?.focus()
        setActive(null)
        onClear()
      }}><X size={15} aria-hidden="true" /> Limpar tudo</button>}
    </div>
  </div>
}
