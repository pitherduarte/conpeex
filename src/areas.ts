export const areas = [
  { label: 'Ciências Exatas e da Terra', tone: 'exatas' },
  { label: 'Engenharias', tone: 'engenharias' },
  { label: 'Ciências Biológicas', tone: 'biologicas' },
  { label: 'Ciências da Saúde', tone: 'saude' },
  { label: 'Ciências Agrárias', tone: 'agrarias' },
  { label: 'Ciências Sociais Aplicadas', tone: 'sociais' },
  { label: 'Ciências Humanas', tone: 'humanas' },
  { label: 'Linguística, Letras e Artes', tone: 'artes' },
  { label: 'Multidisciplinar', tone: 'multi' },
  { label: 'Não classificada', tone: 'neutra' },
] as const

const areaByLabel = new Map<string, typeof areas[number]>(areas.map(area => [area.label, area]))

export function areaInfo(label: string | null) {
  const canonical = label === 'Lingüística, Letras e Artes' ? 'Linguística, Letras e Artes' : label
  return areaByLabel.get(canonical ?? '') ?? { label: canonical ?? 'Não classificada', tone: 'neutra' }
}
