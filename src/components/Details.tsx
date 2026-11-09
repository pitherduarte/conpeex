import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { ArrowLeft, CalendarDays, Clock3, FileText, Hash, Layers3, MapPin, Tag, Users, X } from 'lucide-react'
import { dateLabel, modalityColor, timeLabel } from '../calendar'
import type { Presentation } from '../types'
import { PresentationCard } from './PresentationCard'
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
  const header = useRef<HTMLHeadingElement>(null)
  const open = Boolean(item || slot)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    dialog.showModal()
    return () => dialog.close()
  }, [open])

  useEffect(() => {
    if (open && ref.current) {
      ref.current.scrollTop = 0
      header.current?.focus({ preventScroll: true })
    }
  }, [item, slot, open])

  function closeBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  const facts = item ? [
    [CalendarDays, 'Data', item.date ? dateLabel(item.date) : 'Não informada'],
    [Clock3, 'Horário', item.startTime && !item.endTime ? `${item.startTime} · término a confirmar` : timeLabel(item)],
    [Tag, 'Área do conhecimento', item.knowledgeArea ?? 'Não classificada'],
    [Layers3, 'Sessão', item.session ?? 'Não informada'],
    [MapPin, 'Mesa / TV', item.table ?? 'Não informada'],
    ...(item.location ? [[MapPin, 'Local', item.location] as const] : []),
    ...(item.workNumber ? [[Hash, 'Número do trabalho', item.workNumber] as const] : []),
  ] as const : []

  return <dialog className="details-dialog" ref={ref} aria-labelledby="details-title"
    onCancel={event => { event.preventDefault(); onClose() }} onClick={closeBackdrop}>
    <div className="dialog-inner" key={item?.id ?? 'slot'}>
      <div className="sheet-handle" aria-hidden="true" />
      <div className="dialog-controls">
        {item && slot && <button type="button" className="pill" onClick={onBack}><ArrowLeft size={17} /> Voltar ao horário</button>}
        <button type="button" className="icon-button close-dialog" aria-label="Fechar detalhes" onClick={onClose}><X size={21} /></button>
      </div>
      {item ? <>
        <div className={`detail-modality tone-${modalityColor(item.modality)}`}>{item.modality ?? 'Modalidade não informada'}</div>
        <h2 id="details-title" ref={header} tabIndex={-1}>{item.title}</h2>
        <div className="detail-authors"><Users size={19} aria-hidden="true" />
          <div><strong>Autoria</strong>{item.authors.length ? <ul>{item.authors.map((author, index) => <li key={index}>{author}</li>)}</ul> : <p>Não informada.</p>}</div>
        </div>
        <dl className="detail-facts">
          {facts.map(([Icon, label, value]) => <div key={label}><Icon size={17} aria-hidden="true" /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
        </dl>
        {item.scheduleNote && <p className="schedule-note">{item.scheduleNote}</p>}
        <section className="detail-description"><h3>Descrição</h3><p>{item.description ?? 'A descrição deste trabalho não foi fornecida nos documentos de origem.'}</p></section>
        <div className="detail-source"><FileText size={16} aria-hidden="true" /><div>
          <strong>Fonte da programação</strong>
          {(item.sources ?? [{ file: item.sourceFile, page: item.sourcePage }]).map((source, index) =>
            <div key={index}>{source.file}{source.page ? ` · p. ${source.page}` : ''}{source.sheet ? ` · ${source.sheet}` : ''}{source.row ? ` · linha ${source.row}` : ''}</div>)}
        </div></div>
      </> : slot && <>
        <span className="eyebrow">APRESENTAÇÕES NO HORÁRIO</span>
        <h2 id="details-title" ref={header} tabIndex={-1}>{slot.time || 'Horário a confirmar'}</h2>
        <p className="slot-summary">{dateLabel(slot.date)} · {slot.items.length} apresentações</p>
        <div className="slot-items">{slot.items.map(entry => <PresentationCard key={entry.id} item={entry} onOpen={onOpen} />)}</div>
      </>}
    </div>
  </dialog>
}
