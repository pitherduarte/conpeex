import glossary from './data/glossary.json'

const pt = 'pt-BR'
const glossaryEntries = Object.entries(glossary)
const glossaryTerms = new Map(glossaryEntries.map(([term, entry]) => [term.toLocaleUpperCase(pt), { term, ...entry }]))

const preservedTerms = [
  ...Object.keys(glossary),
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
  'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
  'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
  'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
  'Anápolis', 'Aparecida de Goiânia', 'Araguaia', 'Brasília', 'Brasil', 'Caldas Novas',
  'Centro-Oeste', 'Cerrado', 'Goiânia', 'Jataí', 'Luziânia', 'Pirenópolis', 'Rio Verde',
  'Campus Samambaia', 'Câmpus Samambaia', 'Universidade Federal de Goiás', 'Universidade Estadual de Goiás',
  'Faculdade de Artes Visuais', 'Instituto Federal de Goiás', 'Instituto Federal Goiano',
  'Câmara Municipal de Goiânia', 'Politizar Goiânia', 'UFG Fashion Business', 'FAV Gala',
  'Dançarelando em Cena',
  'Espaço das Profissões', 'América Latina', 'Estados Unidos', 'Portugal', 'França', 'Europa',
  'Paulo Freire', 'Cora Coralina', 'Machado de Assis', 'Cecília Meireles',
  'Urochloa brizantha', 'Brachiaria brizantha', 'Bos indicus', 'Equus asinus', 'SARS-CoV-2',
  'Instagram', 'WhatsApp', 'YouTube', 'TikTok', 'ChatGPT', 'Google', 'Python', 'Linux',
  'ACEX', 'AGREE', 'AIDS', 'ALEGO', 'AINEs', 'BNCC', 'CADEN', 'CAPES', 'CECANE', 'CID', 'CNPq', 'CPF', 'CNPJ', 'CUGO',
  'CRAS', 'CREAS', 'DNA', 'DPOC', 'EaD', 'EJA', 'EMAC', 'ENEM', 'EPC', 'EPIs', 'ESF', 'FAPEG', 'FIC',
  'GEPA', 'GO', 'HIV', 'HPV', 'IA', 'IBGE', 'IC', 'ICJr', 'IFG', 'INSS', 'IT', 'LGBTQIA+',
  'MEC', 'MG', 'ODS', 'OMS', 'ONU', 'PCD', 'PNE', 'PPG', 'PUC Goiás', 'RNA', 'SUS', 'TDAH',
  'TEA', 'UBS', 'UEG', 'UFJ', 'UFMG', 'UFRJ', 'UnB', 'Unesp', 'Unicamp', 'USP', 'UTI', 'VigiMed',
  'NutriPet, GECOMPA e META',
]

function termPattern(terms: string[]) {
  const alternatives = terms.slice().sort((a, b) => b.length - a.length)
    .map(term => term.toLocaleUpperCase(pt).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return new RegExp('(?<![\\p{L}\\p{N}])(?:' + alternatives + ')(?![\\p{L}\\p{N}])', 'gu')
}

const canonicalTerms = new Map(preservedTerms.map(term => [term.toLocaleUpperCase(pt), term]))
const canonicalPattern = termPattern(preservedTerms)
const glossaryPattern = termPattern(Object.keys(glossary))

function isUppercase(text: string) {
  return text === text.toLocaleUpperCase(pt) && text !== text.toLocaleLowerCase(pt)
}

function capitalize(word: string) {
  return word.charAt(0).toLocaleUpperCase(pt) + word.slice(1)
}

export function displayText(text: string) {
  if (!isUppercase(text)) return text

  let normalized = ''
  let cursor = 0
  for (const match of text.matchAll(canonicalPattern)) {
    const offset = match.index
    normalized += text.slice(cursor, offset).toLocaleLowerCase(pt)
    normalized += canonicalTerms.get(match[0]) ?? match[0]
    cursor = offset + match[0].length
  }
  normalized += text.slice(cursor).toLocaleLowerCase(pt)

  // Keep Roman numerals and short letter-number codes such as CO2.
  normalized = normalized.replace(/(?<![\p{L}\p{N}])(?:(?=[ivxlcdm])m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})|[a-z]{1,4}\d+[a-z]?)(?![\p{L}\p{N}])/gu,
    (token: string, offset: number) => token === 'cv' && normalized[offset + token.length] === '.'
      ? token : token.toLocaleUpperCase(pt))
  return normalized.replace(/(^[^\p{L}]*|(?:[.!?:]|\s[-–—])\s+["“'‘(]*)(\p{L})/gu,
    (_, prefix: string, letter: string) => prefix + capitalize(letter))
}

const nameParticles = new Set(['da', 'das', 'de', 'do', 'dos', 'e'])

export function displayAuthor(name: string) {
  if (!isUppercase(name)) return name
  return name.toLocaleLowerCase(pt).replace(/\p{L}+/gu,
    (word: string, offset: number) => offset > 0 && nameParticles.has(word) ? word : capitalize(word))
}

export function findGlossaryEntries(text: string) {
  const terms = new Set(Array.from(text.toLocaleUpperCase(pt).matchAll(glossaryPattern), match => match[0]))
  return Array.from(terms, term => glossaryTerms.get(term)!)
}
