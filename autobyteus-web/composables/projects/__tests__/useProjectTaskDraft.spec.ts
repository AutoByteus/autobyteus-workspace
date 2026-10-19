import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useProjectTaskDraft } from '../useProjectTaskDraft'
import type { ProjectTask, ProjectTaskContextFile } from '~/types/project'
const { client, tasks, voice } = vi.hoisted(() => ({
  client: {current: vi.fn(() => true), begin: vi.fn(), upload: vi.fn(), remove: vi.fn(), discard: vi.fn()},
  tasks: {createTask: vi.fn(), updateTask: vi.fn(), getList: vi.fn()},
  voice: {transcriptTarget: null, isStarting: false, isRecording: false, isTranscribing: false, cancelOperationForTarget: vi.fn()},
}))
vi.mock('~/services/projects/projectTaskContextClient', () => ({createProjectTaskContextClient: () => client}))
vi.mock('~/stores/projectTaskStore', () => ({useProjectTaskStore: () => tasks}))
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
const file: ProjectTaskContextFile = {storedFilename: 'ctx_file__note.txt', displayName: 'note.txt', mimeType: 'text/plain', sizeBytes: 4, locator: 'owned'}
const saved: ProjectTask = {projectId: 'p', taskId: 't', taskKey: 'p-2', description: 'Saved', status: 'IN_PROGRESS', dependsOnTaskIds: [], partOfTaskId: null, contextFiles: [file], createdAt: '1', updatedAt: '2', root: null}
const setup = (task?: ProjectTask, initialPartOf?: string | null) => {
  let draft!: ReturnType<typeof useProjectTaskDraft>
  const wrapper = mount(defineComponent({setup() {draft = useProjectTaskDraft('p', task, initialPartOf); return () => null}}))
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
    expect(tasks.updateTask).toHaveBeenCalledWith('p', 't', 'Edited', undefined, expect.any(Function), [], null)
    expect(client.begin).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('Edit starts from the dependencies that still exist and saves the chosen list; New task sends its own (REQ-011, RSK-003)', async () => {
    const dependency = {...saved, taskId: 'd', taskKey: 'p-1', dependsOnTaskIds: []}
    tasks.getList.mockReturnValue({tasks: [dependency, {...saved, dependsOnTaskIds: ['d', 'deleted']}]})
    const edit = setup({...saved, dependsOnTaskIds: ['d', 'deleted']})
    expect(edit.draft.dependsOn.value).toEqual(['d'])
    edit.draft.dependsOn.value = []
    await edit.draft.save()
    expect(tasks.updateTask).toHaveBeenCalledWith('p', 't', 'Saved', undefined, expect.any(Function), [], null)
    edit.wrapper.unmount()
    const create = setup()
    create.draft.text.value = 'Follow-up'
    create.draft.dependsOn.value = ['d']
    await create.draft.save()
    expect(tasks.createTask).toHaveBeenCalledWith('p', 'Follow-up', undefined, expect.any(Function), ['d'], null)
    create.wrapper.unmount()
  })
  it('Edit starts from the parent that still exists and always sends the choice; null clears (REQ-011, TR-008)', async () => {
    const parent = {...saved, taskId: 'parent', taskKey: 'p-1'}
    tasks.getList.mockReturnValue({tasks: [parent, {...saved, partOfTaskId: 'parent'}]})
    const edit = setup({...saved, partOfTaskId: 'parent'})
    expect(edit.draft.partOf.value).toBe('parent')
    await edit.draft.save()
    expect(tasks.updateTask).toHaveBeenLastCalledWith('p', 't', 'Saved', undefined, expect.any(Function), [], 'parent')
    edit.draft.partOf.value = null
    await edit.draft.save()
    expect(tasks.updateTask).toHaveBeenLastCalledWith('p', 't', 'Saved', undefined, expect.any(Function), [], null)
    edit.wrapper.unmount()
    // A deleted parent is never resubmitted.
    const dangling = setup({...saved, partOfTaskId: 'deleted'})
    expect(dangling.draft.partOf.value).toBeNull()
    dangling.wrapper.unmount()
  })
  it('New task takes the "New part" parent only while it names a current Task of the Project (REQ-018)', async () => {
    tasks.getList.mockReturnValue({tasks: [{...saved, taskId: 'parent'}]})
    const create = setup(undefined, 'parent')
    expect(create.draft.partOf.value).toBe('parent')
    create.draft.text.value = 'Slice'
    await create.draft.save()
    expect(tasks.createTask).toHaveBeenCalledWith('p', 'Slice', undefined, expect.any(Function), [], 'parent')
    create.wrapper.unmount()
    const unknown = setup(undefined, 'not-a-task')
    expect(unknown.draft.partOf.value).toBeNull()
    unknown.wrapper.unmount()
    // Before the list is known the choice waits for it.
    tasks.getList.mockReturnValue(null)
    const early = setup(undefined, 'parent')
    expect(early.draft.partOf.value).toBe('parent')
    early.wrapper.unmount()
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
    expect(tasks.createTask).toHaveBeenCalledWith('p', 'With file', {draftId: 'draft', storedFilenames: [file.storedFilename]}, expect.any(Function), [], null)
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
