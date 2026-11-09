import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { dateLabel, periods, timeLabel, timePeriod } from '../calendar'
import { displayAuthor, displayText } from '../presentationText'
import type { Presentation } from '../types'
import { AcronymHelp } from './AcronymHelp'
import { PresentationCard } from './PresentationCard'
import { AreaLabel } from './AreaLabel'
import './details.css'

export interface Slot { date: string; time: string; items: Presentation[] }

export function Details({ item, slot, onClose, onBack, onOpen }: {
  item: Presentation | null
  slot: Slot | null
  onClose: () => void
  onBack: () => void
  onOpen: (item: Presentation) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLHeadingElement>(null)
  const open = Boolean(item || slot)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    dialog.showModal()
    return () => dialog.close()
  }, [open])

  useEffect(() => {
    if (!open || !content.current) return
    content.current.scrollTop = 0
    header.current?.focus({ preventScroll: true })
  }, [item, slot, open])

  function closeBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  const facts = item ? [
    ['Data', item.date ? dateLabel(item.date) : 'Não informada'],
    ['Horário', item.startTime && !item.endTime ? `${item.startTime} · término a confirmar` : timeLabel(item)],
    ['Modalidade', displayText(item.modality ?? 'Não informada')],
    ['Mesa / TV', displayText(item.table ?? 'Não informada')],
    ['Sessão', displayText(item.session ?? 'Não informada')],
    ...(item.location ? [['Local', displayText(item.location)]] : []),
    ...(item.workNumber ? [['Número do trabalho', item.workNumber]] : []),
  ] : []

  const slotPeriod = slot && periods.find(period => period.key === timePeriod(slot.time))?.label
  const venues = new Map<string, Presentation[]>()
  for (const entry of slot?.items ?? []) {
    const venue = entry.table ?? 'Mesa ou TV a confirmar'
    const entries = venues.get(venue) ?? []
    entries.push(entry)
    venues.set(venue, entries)
  }

  return <dialog className="details-dialog" ref={ref} data-slot={slot ? '' : undefined} aria-labelledby="details-title"
    onCancel={event => { event.preventDefault(); onClose() }} onClick={closeBackdrop}>
    <div className="dialog-inner">
      <div className="dialog-controls">
        {item && slot ? <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} /> Voltar ao horário</button>
          : <span>{item ? 'Detalhes da apresentação' : 'Apresentações no horário'}</span>}
        <button type="button" className="icon-button close-dialog" aria-label="Fechar detalhes" onClick={onClose}><X size={20} /></button>
      </div>
      {!item && slot && <div className="slot-header">
        <h2 id="details-title" ref={header} tabIndex={-1}>{slot.time || 'Horário a confirmar'}</h2>
        <p className="slot-summary">{dateLabel(slot.date)}{slotPeriod && ` · ${slotPeriod}`} · {slot.items.length} apresentações</p>
      </div>}
      <div className="dialog-content" ref={content} key={item?.id ?? 'slot'}>
        {item ? <>
          <div className="detail-heading">
            <h2 id="details-title" ref={header} tabIndex={-1}>{displayText(item.title)}</h2>
            <AcronymHelp text={item.title} />
          </div>
          <div className="detail-authors">
            <strong>Autoria</strong>
            {item.authors.length ? <ul>{item.authors.map((author, index) => <li key={index}>{displayAuthor(author)}</li>)}</ul> : <p>Não informada.</p>}
          </div>
          <dl className="detail-facts">
            {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value} <AcronymHelp text={value} /></dd></div>)}
            <div><dt>Área do conhecimento</dt><dd><AreaLabel label={item.knowledgeArea} inferred={item.inferredArea} /></dd></div>
          </dl>
          {item.scheduleNote && <p className="schedule-note">{item.scheduleNote}</p>}
          <section className="detail-description"><h3>Descrição</h3><p>{item.description ? displayText(item.description) : 'A descrição deste trabalho não foi fornecida.'}</p></section>
        </> : slot && <div className="slot-list">
          {[...venues].map(([venue, entries]) => <section className="venue-group" key={venue} aria-label={venue}>
            <h3>{venue}</h3>
            <div className="slot-items">{entries.map(entry => <PresentationCard key={entry.id} item={entry} onOpen={onOpen} />)}</div>
          </section>)}
        </div>}
      </div>
    </div>
  </dialog>
}
