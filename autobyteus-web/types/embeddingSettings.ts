/** Settings → Server Settings → Embedding: the node's embedding models and its Projects' index states. */

export type EmbeddingModelFileStateKind = 'NOT_DOWNLOADED' | 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED'
export type EmbeddingActiveDisplayState = 'READY' | 'PREPARING' | 'NOT_DOWNLOADED' | 'UNAVAILABLE'
export type ProjectTaskIndexState = 'NOT_INDEXED' | 'WAITING' | 'INDEXING' | 'READY' | 'NEEDS_UPDATE' | 'UNAVAILABLE'

/** A model's files; `done`/`total` are bytes while downloading; `reason` after a failed download. */
export interface EmbeddingModelFile {
  state: EmbeddingModelFileStateKind
  done: number | null
  total: number | null
  reason: string | null
}

/** The active model's display state: Preparing only while its download (bytes) or load runs. */
export interface EmbeddingActiveModelDisplay {
  state: EmbeddingActiveDisplayState
  phase: 'DOWNLOADING' | 'LOADING' | null
  done: number | null
  total: number | null
  reason: string | null
}

export interface EmbeddingModelInfo {
  id: string
  displayName: string
  /** Catalog language codes, e.g. `["en"]` or `["multilingual"]`. */
  languages: string[]
  downloadBytes: number
  file: EmbeddingModelFile
  /** Only on the active model. */
  activeDisplay: EmbeddingActiveModelDisplay | null
}

export interface EmbeddingModelsStatus {
  activeModelId: string
  defaultModelId: string
  onDiskBytes: number
  models: EmbeddingModelInfo[]
}

/** One Project's index for the active model. `done` only while indexing; `changed` only when it needs an update. */
export interface ProjectTaskIndex {
  projectId: string
  name: string
  state: ProjectTaskIndexState
  done: number | null
  total: number | null
  changed: number | null
}

export interface EmbeddingSettingsStatus {
  models: EmbeddingModelsStatus
  /** Alphabetical by name (the server's order). */
  projects: ProjectTaskIndex[]
}
