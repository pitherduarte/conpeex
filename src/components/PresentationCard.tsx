import { MapPin } from 'lucide-react'
import { modalityColor, timeLabel } from '../calendar'
import type { Presentation } from '../types'

export function PresentationCard({ item, onOpen, compact = false }: {
  item: Presentation
  onOpen: (item: Presentation) => void
  compact?: boolean
}) {
  return <button type="button" className={`presentation-card tone-${modalityColor(item.modality)}`} onClick={() => onOpen(item)}>
    <span className="card-meta">
      <span className="card-modality">{item.modality ?? 'Modalidade não informada'}</span>
      {item.table && <span className="card-venue"><MapPin size={12} aria-hidden="true" />{item.table}</span>}
    </span>
    <span className="card-title">{item.title}</span>
    {!compact && <span className="card-subtitle">{[item.authors.join('; '), timeLabel(item)].filter(Boolean).join(' · ')}</span>}
  </button>
}
