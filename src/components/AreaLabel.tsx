import { areas, areaInfo } from '../areas'
import './areas.css'

export function AreaLabel({ label, inferred = false }: { label: string | null; inferred?: boolean }) {
  const area = areaInfo(label)
  return <span className="area-label" data-area={area.tone}>
    <span className="area-dot" aria-hidden="true" />{area.label}{inferred && <small>Inferida</small>}
  </span>
}

export function AreaLegend() {
  return <details className="area-legend">
    <summary>Legenda de áreas</summary>
    <ul>{areas.map(area => <li key={area.tone}><AreaLabel label={area.label} /></li>)}</ul>
  </details>
}
