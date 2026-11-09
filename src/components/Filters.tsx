import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { dateLabel, filterKeys, filterValue, unknown } from '../calendar'
import type { FilterKey, Filters as FilterState } from '../calendar'
import type { Presentation } from '../types'
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

export function makeOptions(items: Presentation[]) {
  return Object.fromEntries(filterKeys.map(key => {
    const values = new Set(items.map(item => filterValue(item, key)))
    const options = [...values].filter(value => value !== unknown).sort(collator.compare)
    const ordered = key === 'knowledgeArea' ? [...new Set([...areas, ...options])] : options
    if (values.has(unknown) || key === 'knowledgeArea') ordered.push(unknown)
    return [key, ordered]
  })) as Record<FilterKey, string[]>
}

function optionLabel(key: FilterKey, value: string) {
  if (value === unknown) return key === 'knowledgeArea' ? 'Não classificada' : 'Não informado'
  return key === 'date' ? dateLabel(value) : value
}

export function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="search-box" role="search">
    <Search size={21} aria-hidden="true" />
    <input type="search" value={value} onChange={event => onChange(event.target.value)}
      aria-label="Pesquisar apresentações" placeholder="Buscar trabalho, autor ou área" />
    {value && <button type="button" className="search-clear" aria-label="Limpar pesquisa" onClick={() => onChange('')}><X size={18} /></button>}
  </div>
}

interface Props {
  filters: FilterState
  options: ReturnType<typeof makeOptions>
  onFilter: (key: FilterKey, value: string) => void
  onClear: () => void
  canClear: boolean
}

export function Filters({ filters, options, onFilter, onClear, canClear }: Props) {
  return <div className="filter-bar" role="group" aria-label="Filtros da programação">
    <span className="filter-label"><SlidersHorizontal size={17} /> <span>Filtros</span></span>
    <div className="filter-options">
      {filterKeys.map(key => <label key={key} className={'filter-pill' + (filters[key] ? ' is-active' : '')}>
        <span aria-hidden="true">{filters[key] ? optionLabel(key, filters[key]) : labels[key]}</span>
        <select aria-label={labels[key]} value={filters[key] ?? ''} onChange={event => onFilter(key, event.target.value)}>
          <option value="">Todas as opções · {labels[key]}</option>
          {options[key].map(value => <option key={value} value={value}>{optionLabel(key, value)}</option>)}
        </select>
        <ChevronDown size={14} aria-hidden="true" />
      </label>)}
    </div>
    {canClear && <button type="button" className="clear-all" onClick={onClear}><X size={15} /> Limpar tudo</button>}
  </div>
}
