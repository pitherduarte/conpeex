export interface Presentation {
  id: string
  title: string
  authors: string[]
  description: string | null
  date: string | null
  startTime: string | null
  endTime: string | null
  knowledgeArea: string | null
  knowledgeField?: string
  knowledgeSubarea?: string
  knowledgeSpecialty?: string
  knowledgeTopic?: string
  sourceKnowledgeArea?: string
  inferredArea?: boolean
  modality: string | null
  session: string | null
  table: string | null
  workNumber: string | null
  workId?: string
  location: string | null
  sourceFile: string
  sourcePage: number | null
  scheduleNote?: string
  sources?: { file: string; page: number | null; sheet?: string; row?: number }[]
}
