import { timeLabel } from '../calendar'
import { displayAuthor, displayText } from '../presentationText'
import type { Presentation } from '../types'
import { AcronymHelp } from './AcronymHelp'
import { areaInfo } from '../areas'
import { AreaLabel } from './AreaLabel'

export function PresentationCard({ item, onOpen, compact = false }: {
  item: Presentation
  onOpen: (item: Presentation) => void
  compact?: boolean
}) {
  const modality = displayText(item.modality ?? 'Modalidade não informada')
  const table = item.table ? displayText(item.table) : null
  return <article className="presentation-card" data-area={areaInfo(item.knowledgeArea).tone}>
    <div className="card-heading">
      <button type="button" className="card-title" onClick={() => onOpen(item)}>{displayText(item.title)}</button>
      <AcronymHelp text={item.title} />
    </div>
    {!compact && item.authors.length > 0 && <p className="card-authors">{item.authors.map(displayAuthor).join('; ')}</p>}
    <div className="card-meta">
      <AreaLabel label={item.knowledgeArea} />
      <span className="card-modality">{modality} <AcronymHelp text={modality} /></span>
      {table && <span>{table} <AcronymHelp text={table} /></span>}
      {!compact && <span className="card-time">{timeLabel(item)}</span>}
    </div>
  </article>
}
