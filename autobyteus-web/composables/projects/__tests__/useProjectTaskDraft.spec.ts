import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useProjectTaskDraft } from '../useProjectTaskDraft'
import type { ProjectTask, ProjectTaskContextFile } from '~/types/project'
const { client, tasks, voice } = vi.hoisted(() => ({
  client: {current: vi.fn(() => true), begin: vi.fn(), upload: vi.fn(), remove: vi.fn(), discard: vi.fn()},
  tasks: {createTask: vi.fn(), updateTask: vi.fn()},
  voice: {transcriptTarget: null, isStarting: false, isRecording: false, isTranscribing: false, cancelOperationForTarget: vi.fn()},
}))
vi.mock('~/services/projects/projectTaskContextClient', () => ({createProjectTaskContextClient: () => client}))
vi.mock('~/stores/projectTaskStore', () => ({useProjectTaskStore: () => tasks}))
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
const file: ProjectTaskContextFile = {storedFilename: 'ctx_file__note.txt', displayName: 'note.txt', mimeType: 'text/plain', sizeBytes: 4, locator: 'owned'}
const saved: ProjectTask = {projectId: 'p', taskId: 't', description: 'Saved', status: 'IN_PROGRESS', contextFiles: [file], createdAt: '1', updatedAt: '2'}
const setup = (task?: ProjectTask) => {
  let draft!: ReturnType<typeof useProjectTaskDraft>
  const wrapper = mount(defineComponent({setup() {draft = useProjectTaskDraft('p', task); return () => null}}))
  return {wrapper, draft}
}
describe('Task draft ordinary authoring lifetime', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    client.current.mockReturnValue(true)
    client.begin.mockResolvedValue({draftId: 'draft'})
    client.upload.mockResolvedValue(file)
    client.discard.mockResolvedValue(undefined)
    client.remove.mockResolvedValue(undefined)
    tasks.createTask.mockResolvedValue(saved)
    tasks.updateTask.mockResolvedValue(saved)
  })
  it('Cancel/text entry does not allocate files or mutate domain data', () => {
    const {wrapper, draft} = setup()
    draft.text.value = 'Unsaved'
    wrapper.unmount()
    expect(client.begin).not.toHaveBeenCalled()
    expect(tasks.createTask).not.toHaveBeenCalled()
    expect(voice.cancelOperationForTarget).toHaveBeenCalledWith(draft.target.key)
  })
  it('text-only edit patches description without stale status or a context replacement', async () => {
    const {wrapper, draft} = setup(saved)
    draft.text.value = ' Edited '
    await draft.save()
    expect(tasks.updateTask).toHaveBeenCalledWith('p', 't', 'Edited', undefined, expect.any(Function))
    expect(client.begin).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('saved Remove remains a draft delta until Save; failed Save retains editable text and files', async () => {
    const {wrapper, draft} = setup(saved)
    await draft.removeFile(file.storedFilename)
    expect(client.remove).not.toHaveBeenCalled()
    expect(tasks.updateTask).not.toHaveBeenCalled()
    tasks.updateTask.mockRejectedValueOnce(new Error('storage unavailable'))
    draft.text.value = 'Retained edit'
    expect(await draft.save()).toBeNull()
    expect(draft.text.value).toBe('Retained edit')
    expect(draft.files.value).toEqual([])
    expect(draft.error.value).toBe('storage unavailable')
    expect(tasks.updateTask.mock.calls[0][3]).toEqual({addStoredFilenames: [], removeStoredFilenames: [file.storedFilename]})
    wrapper.unmount()
    expect(client.remove).not.toHaveBeenCalled()
  })
  it('real upload metadata becomes explicit additions and draft Remove only touches that draft', async () => {
    const {wrapper, draft} = setup()
    await draft.addFiles([new File(['note'], 'note.txt', {type: 'text/plain'})])
    expect(draft.files.value).toEqual([file])
    draft.text.value = 'With file'
    await draft.save()
    expect(tasks.createTask).toHaveBeenCalledWith('p', 'With file', {draftId: 'draft', storedFilenames: [file.storedFilename]}, expect.any(Function))
    await draft.removeFile(file.storedFilename)
    expect(client.remove).toHaveBeenCalledWith('draft', file.storedFilename)
    wrapper.unmount()
    await flushPromises()
    expect(client.discard).toHaveBeenCalledWith('draft')
  })
  it('late upload after route disposal never publishes files or navigation eligibility', async () => {
    let resolve!: (file: ProjectTaskContextFile) => void
    client.upload.mockReturnValueOnce(new Promise((r) => {resolve = r}))
    const {wrapper, draft} = setup()
    const pending = draft.addFiles([new File(['note'], 'note.txt')])
    await flushPromises()
    wrapper.unmount()
    resolve(file)
    await pending
    expect(draft.files.value).toEqual([])
    expect(draft.current()).toBe(false)
    expect(client.discard).toHaveBeenCalledWith('draft')
    expect(await draft.save()).toBeNull()
  })
})
