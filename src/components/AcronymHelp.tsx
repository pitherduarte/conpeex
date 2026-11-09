import { useEffect, useId, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { findGlossaryEntries } from '../presentationText'
import './acronym-help.css'

const nativePopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

export function AcronymHelp({ text }: { text: string }) {
  const entries = findGlossaryEntries(text)
  return entries.length ? <AcronymPopover entries={entries} /> : null
}

function AcronymPopover({ entries }: { entries: ReturnType<typeof findGlossaryEntries> }) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const terms = entries.map(entry => entry.term).join(', ')
  const label = entries.length === 1 ? 'O que significa ' + terms + '?' : 'O que significam ' + terms + '?'

  function positionPanel() {
    const anchor = trigger.current?.getBoundingClientRect()
    const element = panel.current
    if (!anchor || !element) return

    const { width, height } = element.getBoundingClientRect()
    const gutter = 12
    const gap = 7
    const below = anchor.bottom + gap
    const above = anchor.top - gap - height
    const top = below + height <= window.innerHeight - gutter ? below : above
    element.style.top = Math.max(gutter, Math.min(top, window.innerHeight - height - gutter)) + 'px'
    element.style.left = Math.max(gutter, Math.min(anchor.left, document.documentElement.clientWidth - width - gutter)) + 'px'
  }

  useEffect(() => {
    if (!open) return
    function dismissOutside(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && !panel.current?.contains(target) && !trigger.current?.contains(target)) {
        setOpen(false)
      }
    }

    if (!nativePopover) {
      positionPanel()
      panel.current?.focus({ preventScroll: true })
      document.addEventListener('pointerdown', dismissOutside)
    }
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, { capture: true, passive: true })
    return () => {
      if (!nativePopover) document.removeEventListener('pointerdown', dismissOutside)
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [open])

  return <span className="acronym-help" data-acronym-open={open ? '' : undefined} onKeyDown={event => {
    if (event.key !== 'Escape' || !(nativePopover ? panel.current?.matches(':popover-open') : open)) return
    event.preventDefault()
    event.stopPropagation()
    if (nativePopover) panel.current?.hidePopover()
    else setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }}>
    <button type="button" className="acronym-trigger" ref={trigger} aria-label={label}
      aria-expanded={open} aria-haspopup="dialog" aria-controls={id}
      popoverTarget={nativePopover ? id : undefined} onClick={nativePopover ? undefined : () => setOpen(value => !value)}>
      <CircleHelp size={15} aria-hidden="true" />
    </button>
    <span id={id} className="acronym-popover" ref={panel} popover={nativePopover ? 'auto' : undefined}
      hidden={!nativePopover && !open} role="dialog" aria-label={label}
      tabIndex={-1} onToggle={event => {
        const isOpen = event.newState === 'open'
        setOpen(isOpen)
        if (isOpen) {
          positionPanel()
          panel.current?.focus({ preventScroll: true })
        }
      }}>
      {entries.map(entry => <span className="acronym-entry" key={entry.term}>
        <strong>{entry.name}</strong>
        <span>{entry.description}</span>
        <a href={entry.source} target="_blank" rel="noreferrer">Referência institucional</a>
      </span>)}
    </span>
  </span>
}
