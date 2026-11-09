import { useEffect, useRef, useState } from 'react'

const min = .8
const max = 1.5
const clamp = (value: number) => Math.round(Math.max(min, Math.min(max, value)) * 100) / 100

export function useCalendarZoom() {
  const [zoom, setZoom] = useState(1)
  const surface = useRef<HTMLDivElement>(null)
  const current = useRef(1)

  function change(value: number) {
    current.current = clamp(value)
    setZoom(current.current)
  }

  useEffect(() => {
    const element = surface.current
    if (!element) return
    let initial: { distance: number; zoom: number } | null = null

    function distance(event: TouchEvent) {
      const [first, second] = Array.from(event.touches)
      return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
    }

    function start(event: TouchEvent) {
      if (event.touches.length === 2) {
        initial = { distance: distance(event), zoom: current.current }
      }
    }

    function move(event: TouchEvent) {
      if (event.touches.length !== 2 || !initial?.distance) return
      if (event.cancelable) event.preventDefault()
      change(initial.zoom * distance(event) / initial.distance)
    }

    function end() { initial = null }
    element.addEventListener('touchstart', start, { passive: true })
    element.addEventListener('touchmove', move, { passive: false })
    element.addEventListener('touchend', end)
    element.addEventListener('touchcancel', end)
    return () => {
      element.removeEventListener('touchstart', start)
      element.removeEventListener('touchmove', move)
      element.removeEventListener('touchend', end)
      element.removeEventListener('touchcancel', end)
    }
  }, [])

  return { zoom, surface, change, min, max }
}
