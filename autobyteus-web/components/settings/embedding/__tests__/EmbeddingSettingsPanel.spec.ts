import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ bindingRevision: 0, lastReadyError: null, waitForBoundBackendReady: async () => true }),
}))

import EmbeddingSettingsPanel from '../EmbeddingSettingsPanel.vue'
import { BUSY_POLL_MS, IDLE_POLL_MS } from '~/composables/settings/useEmbeddingSettings'
import type { EmbeddingModelInfo, EmbeddingSettingsStatus, ProjectTaskIndex } from '~/types/embeddingSettings'

const GRANITE = 'granite-embedding-small-english-r2'
const LEAF = 'mdbr-leaf-ir'
const GEMMA = 'embeddinggemma-2'
const file = (state: EmbeddingModelInfo['file']['state'], extra: Partial<EmbeddingModelInfo['file']> = {}) => ({ state, done: null, total: null, reason: null, ...extra })
const ready = { state: 'READY' as const, phase: null, done: null, total: null, reason: null }
const model = (id: string, displayName: string, languages: string[], downloadBytes: number, overrides: Partial<EmbeddingModelInfo> = {}): EmbeddingModelInfo =>
  ({ id, displayName, languages, downloadBytes, file: file('NOT_DOWNLOADED'), activeDisplay: null, ...overrides })
const project = (projectId: string, name: string, state: ProjectTaskIndex['state'], extra: Partial<ProjectTaskIndex> = {}): ProjectTaskIndex =>
  ({ projectId, name, state, done: null, total: 0, changed: null, ...extra })

/** The default fixture: Granite active and ready, LEAF-IR downloaded, EmbeddingGemma not downloaded. */
const baseline = (): EmbeddingSettingsStatus => ({
  models: {
    activeModelId: GRANITE, defaultModelId: GRANITE, onDiskBytes: 79_000_000,
    models: [
      model(GRANITE, 'IBM Granite Embedding Small English R2', ['en'], 55_000_000, { file: file('DOWNLOADED'), activeDisplay: ready }),
      model(LEAF, 'MongoDB LEAF-IR', ['en'], 23_900_000, { file: file('DOWNLOADED') }),
      model(GEMMA, 'Google EmbeddingGemma 2', ['multilingual'], 346_000_000),
    ],
  },
  projects: [
    project('p-archive', 'Archive', 'READY', { total: 0 }),
    project('p-billing', 'Billing', 'NOT_INDEXED', { total: 12 }),
    project('p-docs', 'Docs', 'READY', { total: 1 }),
    project('p-mobile', 'Mobile', 'NEEDS_UPDATE', { total: 30, changed: 2 }),
    project('p-web', 'Web', 'INDEXING', { done: 4, total: 10 }),
  ],
})

let current: EmbeddingSettingsStatus
// Like Apollo, every answer is a fresh copy of the server state.
const respond = () => structuredClone({ data: { embeddingModelsStatus: current.models, projectTaskIndexes: current.projects } })
/** Visible text with the separator dots spaced as rendered (the dot is its own element). */
/** The labels of the buttons inside an element, in order. */
const buttonsOf = (node: { findAll: (selector: string) => Array<{ text: () => string }> }) => node.findAll('button').map((button) => button.text())
const textOf = (node: { text: () => string }) => node.text().replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim()
const mutations = () => io.mutate.mock.calls.map(([options]) => ({ name: options.mutation.definitions[0].name.value, variables: options.variables }))
const set = (change: (status: EmbeddingSettingsStatus) => void) => { change(current) }
const modelOf = (id: string) => current.models.models.find((entry) => entry.id === id)!

let wrapper: VueWrapper | null = null
const mountPanel = async () => {
  wrapper = mount(EmbeddingSettingsPanel, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const row = (id: string) => wrapper!.get(`[data-testid="embedding-model-${id}"]`)
const projectRow = (id: string) => wrapper!.get(`[data-testid="embedding-project-${id}"]`)
const poll = async () => { await vi.advanceTimersByTimeAsync(IDLE_POLL_MS); await flushPromises() }

describe('EmbeddingSettingsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    current = baseline()
    io.query.mockImplementation(async () => respond())
    io.mutate.mockResolvedValue({ data: {} })
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('shows the models and every Project state from one read-only request, and starts nothing by opening', async () => {
    let resolve!: () => void
    io.query.mockImplementationOnce(() => new Promise((done) => { resolve = () => done(respond()) }))
    wrapper = mount(EmbeddingSettingsPanel, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.get('[data-testid="embedding-loading"]').attributes('aria-busy')).toBe('true')
    resolve()
    await flushPromises()

    expect(io.query).toHaveBeenCalledTimes(1)
    expect(io.mutate).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="embedding-models-footnote"]').text()).toBe('Used for meaning search. Downloaded from Hugging Face.')
    expect(wrapper.get('[data-testid="embedding-source-link"]').attributes()).toMatchObject({ href: 'https://huggingface.co', target: '_blank', rel: 'noopener noreferrer' })
    expect(wrapper.get('[data-testid="embedding-disk-total"]').text()).toBe('On disk: 79 MB')

    expect(row(GRANITE).classes()).toContain('bg-blue-50/40')
    expect(row(GRANITE).text()).toContain('Default')
    expect(textOf(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-status"]`))).toBe('Active · Ready')
    expect(textOf(wrapper.get(`[data-testid="embedding-model-${GRANITE}-facts"]`))).toBe('Languages: English · Download size: 55 MB')
    expect(wrapper.get(`[data-testid="embedding-model-${GRANITE}-actions"]`).findAll('button')).toHaveLength(0)
    expect(row(LEAF).attributes('data-state')).toBe('downloaded')
    expect(wrapper.get(`[data-testid="embedding-model-${LEAF}-facts"]`).text()).toContain('24 MB')
    expect(buttonsOf(wrapper!.get(`[data-testid="embedding-model-${LEAF}-actions"]`))).toEqual(['Use this model', 'Remove'])
    expect(row(GEMMA).attributes('data-state')).toBe('not_downloaded')
    expect(wrapper.get(`[data-testid="embedding-model-${GEMMA}-facts"]`).text()).toContain('100+ languages')
    expect(buttonsOf(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-actions"]`))).toEqual(['Download', 'Use this model'])

    expect(wrapper.get('[data-testid="embedding-projects-subtitle"]').text()).toBe('Using IBM Granite Embedding Small English R2.')
    const statusOf = (id: string) => wrapper!.get(`[data-testid="embedding-project-${id}-status"]`).text()
    expect(statusOf('p-archive')).toBe('Ready · 0 Tasks')
    expect(statusOf('p-billing')).toBe('Not indexed')
    expect(statusOf('p-docs')).toBe('Ready · 1 Task')
    expect(statusOf('p-mobile')).toBe('Needs update · 2 changed')
    expect(statusOf('p-web')).toBe('Indexing 4 of 10')
    expect(projectRow('p-web').get('[role="progressbar"]').attributes()).toMatchObject({ 'aria-valuenow': '4', 'aria-valuemax': '10' })
    expect(projectRow('p-archive').findAll('button')).toHaveLength(0)
    expect(projectRow('p-billing').text()).toContain('Index now')
    expect(projectRow('p-docs').text()).toContain('Rebuild')
    expect(projectRow('p-mobile').text()).toContain('Index now')
    expect(projectRow('p-mobile').text()).toContain('Rebuild')
    expect(buttonsOf(wrapper.get('[data-testid="embedding-project-filters"]'))).toEqual(['All 5', 'Needs indexing 2', 'Indexing 1', 'Ready 2'])
    expect(wrapper.find('[data-testid="embedding-project-find"]').exists()).toBe(false)
  })

  it('shows an active model that is not downloaded with Download, which prepares it without Cancel (AC-011)', async () => {
    set((status) => {
      status.models.onDiskBytes = 0
      for (const entry of status.models.models) entry.file = file('NOT_DOWNLOADED')
      modelOf(GRANITE).activeDisplay = { state: 'NOT_DOWNLOADED', phase: null, done: null, total: null, reason: null }
      status.projects = [project('p-billing', 'Billing', 'NOT_INDEXED', { total: 12 })]
    })
    await mountPanel()
    expect(textOf(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-status"]`))).toBe('Active · Not downloaded')
    expect(projectRow('p-billing').text()).toContain('Index now')
    expect((wrapper!.get('[data-testid="embedding-index-all"]').element as HTMLButtonElement).disabled).toBe(false)

    io.mutate.mockImplementationOnce(async () => {
      modelOf(GRANITE).activeDisplay = { state: 'PREPARING', phase: 'DOWNLOADING', done: 10_000_000, total: 55_000_000, reason: null }
      modelOf(GRANITE).file = file('DOWNLOADING', { done: 10_000_000, total: 55_000_000 })
      current.projects = [project('p-billing', 'Billing', 'WAITING', { total: 12 })]
      return { data: { downloadEmbeddingModel: true } }
    })
    await wrapper!.get(`[data-testid="embedding-model-${GRANITE}-download"]`).trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'DownloadEmbeddingModel', variables: { modelId: GRANITE } }])
    expect(textOf(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-status"]`))).toBe('Active · Preparing…')
    expect(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-preparing"]`).text()).toBe('Downloading the model: 10 of 55 MB · 18%')
    expect(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-actions"]`).findAll('button')).toHaveLength(0)
    expect(projectRow('p-billing').text()).toContain('Waiting for the model…')

    modelOf(GRANITE).activeDisplay = { state: 'PREPARING', phase: 'LOADING', done: 0, total: 0, reason: null }
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    await flushPromises()
    expect(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-preparing"]`).text()).toBe('Loading the model…')
    modelOf(GRANITE).activeDisplay = ready
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    await flushPromises()
    expect(wrapper!.get('[data-testid="embedding-announce"]').text()).toBe('IBM Granite Embedding Small English R2 is ready.')
  })

  it('downloads ahead with progress and Cancel only, and shows a failed download with its reason and Retry', async () => {
    await mountPanel()
    io.mutate.mockImplementationOnce(async () => {
      modelOf(GEMMA).file = file('DOWNLOADING', { done: 140_000_000, total: 346_000_000 })
      return { data: { downloadEmbeddingModel: true } }
    })
    await wrapper!.get(`[data-testid="embedding-model-${GEMMA}-download"]`).trigger('click')
    await flushPromises()
    expect(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-status"]`).text()).toBe('Downloading')
    expect(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-progress"]`).text()).toBe('140 of 346 MB · 40%')
    expect(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-actions"]`).text()).toBe('Cancel')

    // Progress follows within 2 s while work runs; completion is announced.
    modelOf(GEMMA).file = file('DOWNLOADED')
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    await flushPromises()
    expect(row(GEMMA).attributes('data-state')).toBe('downloaded')
    expect(wrapper!.get('[data-testid="embedding-announce"]').text()).toBe('Google EmbeddingGemma 2 downloaded.')

    modelOf(GEMMA).file = file('FAILED', { reason: 'Could not reach huggingface.co.' })
    await poll()
    expect(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-status"]`).text()).toBe('Not downloaded')
    expect(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-failed"]`).text()).toBe('Download failed: Could not reach huggingface.co.')
    expect(buttonsOf(wrapper!.get(`[data-testid="embedding-model-${GEMMA}-actions"]`))).toEqual(['Retry', 'Use this model'])
    await wrapper!.get(`[data-testid="embedding-model-${GEMMA}-retry"]`).trigger('click')
    await flushPromises()
    expect(mutations().at(-1)).toEqual({ name: 'DownloadEmbeddingModel', variables: { modelId: GEMMA } })
  })

  it('cancels a download ahead', async () => {
    modelOf(GEMMA).file = file('DOWNLOADING', { done: 1_000_000, total: 346_000_000 })
    await mountPanel()
    io.mutate.mockImplementationOnce(async () => { modelOf(GEMMA).file = file('NOT_DOWNLOADED'); return { data: {} } })
    await wrapper!.get(`[data-testid="embedding-model-${GEMMA}-cancel"]`).trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'CancelEmbeddingModelDownload', variables: { modelId: GEMMA } }])
    expect(row(GEMMA).attributes('data-state')).toBe('not_downloaded')
  })

  it('confirms Remove inline: focus on Cancel, Esc returns focus, confirming removes and focuses the row', async () => {
    await mountPanel()
    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove"]`).trigger('click')
    await flushPromises()
    const confirmation = wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove-confirmation"]`)
    expect(confirmation.text()).toContain('Remove MongoDB LEAF-IR? This frees 24 MB.')
    expect(document.activeElement?.getAttribute('data-testid')).toBe(`embedding-model-${LEAF}-remove-cancel`)
    await confirmation.trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(wrapper!.find(`[data-testid="embedding-model-${LEAF}-remove-confirmation"]`).exists()).toBe(false)
    expect(document.activeElement?.getAttribute('data-testid')).toBe(`embedding-model-${LEAF}-remove`)

    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove"]`).trigger('click')
    await flushPromises()
    io.mutate.mockImplementationOnce(async () => { modelOf(LEAF).file = file('NOT_DOWNLOADED'); current.models.onDiskBytes = 55_000_000; return { data: {} } })
    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove-confirm"]`).trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'RemoveEmbeddingModel', variables: { modelId: LEAF } }])
    expect(row(LEAF).attributes('data-state')).toBe('not_downloaded')
    expect(wrapper!.get('[data-testid="embedding-disk-total"]').text()).toBe('On disk: 55 MB')
    expect(document.activeElement?.getAttribute('data-testid')).toBe(`embedding-model-${LEAF}`)
  })

  it('asks before a switch: Cancel changes nothing; confirming uses the model and focuses its row', async () => {
    await mountPanel()
    await wrapper!.get(`[data-testid="embedding-model-${GEMMA}-use"]`).trigger('click')
    await flushPromises()
    const dialog = () => document.querySelector('[data-testid="embedding-switch-dialog"]') as HTMLElement
    expect(dialog().getAttribute('role')).toBe('dialog')
    expect(dialog().textContent).toContain('Use Google EmbeddingGemma 2?')
    expect(dialog().textContent).toContain('Every Project has to be indexed again with this model.')
    expect(dialog().textContent).toContain('Until then, meaning search finds exact matches only.')
    expect(document.querySelector('[data-testid="embedding-switch-cost"]')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Download: 346 MB, not downloaded yet')
    expect(document.activeElement?.getAttribute('data-testid')).toBe('embedding-switch-cancel')
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(dialog()).toBeNull()
    expect(io.mutate).not.toHaveBeenCalled()

    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-use"]`).trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-testid="embedding-switch-cost-download"]')!.textContent).toBe('Already downloaded')
    io.mutate.mockImplementationOnce(async () => {
      current.models.activeModelId = LEAF
      modelOf(GRANITE).activeDisplay = null
      modelOf(LEAF).activeDisplay = { state: 'PREPARING', phase: 'LOADING', done: 0, total: 0, reason: null }
      current.projects = current.projects.map((entry) => ({ ...entry, state: 'NOT_INDEXED', done: null, changed: null }))
      return { data: { useEmbeddingModel: true } }
    })
    ;(document.querySelector('[data-testid="embedding-switch-confirm"]') as HTMLElement).click()
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'UseEmbeddingModel', variables: { modelId: LEAF } }])
    expect(row(LEAF).attributes('data-state')).toBe('active-preparing')
    expect(row(GRANITE).attributes('data-state')).toBe('downloaded')
    expect(wrapper!.get('[data-testid="embedding-projects-subtitle"]').text()).toBe('Using MongoDB LEAF-IR.')
    expect(wrapper!.findAll('[data-testid$="-status"]').filter((node) => node.attributes('data-testid')!.startsWith('embedding-project-')).every((node) => node.text() === 'Not indexed')).toBe(true)
    expect(document.activeElement?.getAttribute('data-testid')).toBe(`embedding-model-${LEAF}`)
  })

  it('shows an unavailable active model with Retry, and every Project unavailable without actions', async () => {
    set((status) => {
      modelOf(GRANITE).activeDisplay = { state: 'UNAVAILABLE', phase: null, done: null, total: null, reason: 'The model files failed verification.' }
      status.projects = status.projects.map((entry) => ({ ...entry, state: 'UNAVAILABLE', total: null }))
    })
    await mountPanel()
    expect(textOf(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-status"]`))).toBe('Active · Unavailable')
    expect(wrapper!.get(`[data-testid="embedding-model-${GRANITE}-unavailable"]`).text()).toBe('Unavailable: The model files failed verification.')
    expect(wrapper!.find('[data-testid="embedding-project-filters"]').exists()).toBe(false)
    expect(projectRow('p-billing').text()).toContain('Unavailable')
    expect(wrapper!.get('[data-testid="embedding-project-list"]').findAll('button')).toHaveLength(0)
    const indexAll = wrapper!.get('[data-testid="embedding-index-all"]')
    expect((indexAll.element as HTMLButtonElement).disabled).toBe(true)
    expect(indexAll.attributes('title')).toBe('Retry the model above to continue indexing.')
    await wrapper!.get(`[data-testid="embedding-model-${GRANITE}-retry"]`).trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'RetryEmbeddingModel', variables: undefined }])
  })

  it('indexes on request: Index now, Rebuild after an inline confirmation, and Index all Projects', async () => {
    await mountPanel()
    await projectRow('p-billing').get('[data-testid="embedding-project-p-billing-index"]').trigger('click')
    await flushPromises()
    await projectRow('p-docs').get('[data-testid="embedding-project-p-docs-rebuild"]').trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-testid="embedding-project-p-docs-rebuild-confirmation"]').text())
      .toContain('Rebuild “Docs” from scratch? Meaning search is exact-only until it finishes.')
    expect(document.activeElement?.getAttribute('data-testid')).toBe('embedding-project-p-docs-rebuild-cancel')
    await wrapper!.get('[data-testid="embedding-project-p-docs-rebuild-confirm"]').trigger('click')
    await flushPromises()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('embedding-project-p-docs')
    await wrapper!.get('[data-testid="embedding-index-all"]').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([
      { name: 'IndexProjectTasks', variables: { projectId: 'p-billing' } },
      { name: 'RebuildProjectTaskIndex', variables: { projectId: 'p-docs' } },
      { name: 'IndexAllProjectTasks', variables: undefined },
    ])

    current.projects = current.projects.map((entry) => entry.state === 'NOT_INDEXED' || entry.state === 'NEEDS_UPDATE' ? { ...entry, state: 'READY' } : entry)
    await poll()
    const indexAll = wrapper!.get('[data-testid="embedding-index-all"]')
    expect((indexAll.element as HTMLButtonElement).disabled).toBe(true)
    expect(indexAll.attributes('title')).toBe('Every Project is up to date.')
  })

  it('announces a Project that finished indexing, and shows a failed action\'s server message until the next action (AC-014)', async () => {
    await mountPanel()
    current.projects = current.projects.map((entry) => entry.projectId === 'p-web' ? { ...entry, state: 'READY', done: null } : entry)
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    await flushPromises()
    expect(wrapper!.get('[data-testid="embedding-announce"]').text()).toBe('Web indexed.')

    io.mutate.mockRejectedValueOnce({ graphQLErrors: [{ message: 'MongoDB LEAF-IR is downloading; cancel the download first.', extensions: { code: 'EMBEDDING_MODEL_DOWNLOADING' } }] })
    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove"]`).trigger('click')
    await flushPromises()
    await wrapper!.get(`[data-testid="embedding-model-${LEAF}-remove-confirm"]`).trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-testid="embedding-action-error"]').text()).toBe('MongoDB LEAF-IR is downloading; cancel the download first.')
    expect(wrapper!.get('[data-testid="embedding-action-error"]').attributes('role')).toBe('alert')
    // The next action clears it (AC-014); an unreachable node shows its error the same way.
    io.mutate.mockRejectedValueOnce(new Error('Failed to fetch'))
    await wrapper!.get('[data-testid="embedding-project-p-billing-index"]').trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-testid="embedding-action-error"]').text()).toBe('Failed to fetch')
    await wrapper!.get('[data-testid="embedding-index-all"]').trigger('click')
    await flushPromises()
    expect(wrapper!.find('[data-testid="embedding-action-error"]').exists()).toBe(false)
  })

  it('filters many Projects by name and state, with counts unchanged by the name filter', async () => {
    current.projects = Array.from({ length: 12 }, (_, i) => project(`p${i}`, `Project ${String(i).padStart(2, '0')}`, i % 3 ? 'READY' : 'NOT_INDEXED', { total: 5 }))
    await mountPanel()
    const find = wrapper!.get('[data-testid="embedding-project-find"]')
    await find.setValue('project 1')
    expect(wrapper!.findAll('[data-testid="embedding-project-list"] > li').map((item) => item.text().split('\n')[0]!.trim().slice(0, 10)))
      .toEqual(['Project 10', 'Project 11'])
    await wrapper!.get('[data-testid="embedding-filter-needs"]').trigger('click')
    expect(wrapper!.get('[data-testid="embedding-filter-needs"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper!.get('[data-testid="embedding-filter-needs"]').text()).toBe('Needs indexing 4')
    await find.setValue('nothing like this')
    expect(wrapper!.get('[data-testid="embedding-projects-no-match"]').text()).toBe('No Projects match.')
  })

  it('shows the empty state with Index all disabled', async () => {
    current.projects = []
    await mountPanel()
    expect(wrapper!.get('[data-testid="embedding-projects-empty"]').text()).toBe('No Projects yet.')
    expect((wrapper!.get('[data-testid="embedding-index-all"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a load error with Retry, and keeps the last status when a later poll fails', async () => {
    io.query.mockRejectedValueOnce(new Error('Network down'))
    await mountPanel()
    expect(wrapper!.get('[data-testid="embedding-load-error"]').text()).toContain('Couldn’t load the search status.')
    await poll()
    expect(io.query).toHaveBeenCalledTimes(1)
    await wrapper!.get('[data-testid="embedding-load-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper!.find('[data-testid="embedding-models-card"]').exists()).toBe(true)

    io.query.mockRejectedValueOnce(new Error('Network down'))
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    await flushPromises()
    expect(wrapper!.find('[data-testid="embedding-models-card"]').exists()).toBe(true)
    expect(wrapper!.find('[data-testid="embedding-load-error"]').exists()).toBe(false)
  })

  it('polls every 2 s while work runs and every 10 s otherwise, and stops when closed', async () => {
    await mountPanel()
    expect(io.query).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    expect(io.query).toHaveBeenCalledTimes(2)
    current.projects = current.projects.map((entry) => entry.state === 'INDEXING' ? { ...entry, state: 'READY', done: null } : entry)
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    expect(io.query).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(BUSY_POLL_MS)
    expect(io.query).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(IDLE_POLL_MS - BUSY_POLL_MS)
    expect(io.query).toHaveBeenCalledTimes(4)
    wrapper!.unmount()
    wrapper = null
    await vi.advanceTimersByTimeAsync(IDLE_POLL_MS * 3)
    expect(io.query).toHaveBeenCalledTimes(4)
    expect(io.mutate).not.toHaveBeenCalled()
  })
})
