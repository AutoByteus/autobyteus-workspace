import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { createProjectTaskContextClient } from '~/services/projects/projectTaskContextClient'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { mergeTranscriptWithDraft } from '~/utils/voiceInputCapture'
import { dependenciesOf } from '~/utils/projects/taskDependencies'
import { parentOf } from '~/utils/projects/taskParts'
import type { ProjectTask, ProjectTaskContextFile } from '~/types/project'
import type { VoiceTranscriptTarget } from '~/types/voiceInput'
export function useProjectTaskDraft(projectId: string, saved?: ProjectTask, initialPartOf?: string | null) {
  let alive = true
  const client = createProjectTaskContextClient(projectId, saved?.taskId, () => alive)
  const text = ref(saved?.description ?? '')
  const files = ref<ProjectTaskContextFile[]>([...(saved?.contextFiles ?? [])])
  // "Depends on" (same Project), starting from the dependencies that still exist, so a deleted one is never resubmitted.
  const dependsOn = ref<string[]>(saved ? dependenciesOf(saved, useProjectTaskStore().getList(projectId)?.tasks ?? []).map((t) => t.taskId) : [])
  // "Part of" (same Project): the parent that still exists (a deleted one is never resubmitted); a new Task may start with the
  // parent the "New part" shortcut gave it, while that names a current Task of this Project (checked once the list is known).
  const partOf = ref<string | null>(saved ? parentOf(saved, useProjectTaskStore().getList(projectId)?.tasks ?? [])?.taskId ?? null : initialPartOf ?? null)
  if (!saved && initialPartOf) {
    watch(() => useProjectTaskStore().getList(projectId)?.tasks, (tasks) => {
      if (tasks && partOf.value === initialPartOf && !tasks.some((task) => task.taskId === initialPartOf)) partOf.value = null
    }, {immediate: true})
  }
  const added = new Set<string>(), removed = new Set<string>()
  const draftId = ref<string>()
  let beginPromise: Promise<string> | null = null
  const pending = ref(false), saving = ref(false), error = ref('')
  const current = () => alive && client.current()
  const voice = useVoiceInputStore()
  const target: VoiceTranscriptTarget = {key: `task-draft-${Math.random().toString(36).slice(2)}`, isCurrent: current,
    appendTranscript: (transcript) => { if (current()) text.value = mergeTranscriptWithDraft(text.value, transcript) }}
  const voicePending = computed(() => voice.transcriptTarget?.key === target.key && (voice.isStarting || voice.isRecording || voice.isTranscribing))
  const blocked = computed(() => pending.value || saving.value || voicePending.value)
  const ensureDraft = () => {
    if (draftId.value) return Promise.resolve(draftId.value)
    beginPromise ??= client.begin().then(async (draft) => {
      draftId.value = draft.draftId
      if (!current()) { await client.discard(draft.draftId).catch(() => undefined); throw new Error('Task draft was closed.') }
      return draft.draftId
    }).finally(() => { beginPromise = null })
    return beginPromise
  }
  const addFiles = async (incoming: File[]) => {
    if (blocked.value || !current() || !incoming.length) return
    pending.value = true; error.value = ''
    try {
      const id = await ensureDraft()
      for (const file of incoming) {
        if (!current()) break
        const uploaded = await client.upload(id, file)
        if (!current()) { await client.discard(id).catch(() => undefined); break }
        added.add(uploaded.storedFilename); files.value = [...files.value, uploaded]
      }
    } catch (e) { if (current()) error.value = e instanceof Error ? e.message : 'File upload failed.' }
    finally { if (alive) pending.value = false }
  }
  const removeFile = async (name: string) => {
    if (blocked.value || !current()) return
    pending.value = true
    try {
      if (added.has(name)) { await client.remove(draftId.value!, name); added.delete(name) }
      else removed.add(name)
      if (current()) files.value = files.value.filter((f) => f.storedFilename !== name)
    } catch (e) { if (current()) error.value = e instanceof Error ? e.message : 'Context removal failed.' }
    finally { if (alive) pending.value = false }
  }
  const save = async (): Promise<ProjectTask | null> => {
    if (blocked.value || !current()) return null
    saving.value = true; error.value = ''
    try {
      const store = useProjectTaskStore()
      const additions = [...added]
      const changes = added.size || removed.size ? {
        ...(draftId.value ? {draftId: draftId.value} : {}), addStoredFilenames: additions, removeStoredFilenames: [...removed],
      } : undefined
      const result = saved ? await store.updateTask(projectId, saved.taskId, text.value.trim(), changes, current, [...dependsOn.value], partOf.value)
        : await store.createTask(projectId, text.value.trim(), draftId.value ? {draftId: draftId.value, storedFilenames: additions} : undefined, current, [...dependsOn.value], partOf.value)
      // Save may already be committed on a captured endpoint; only the live draft may navigate.
      return current() ? result : null
    } catch (e) { if (current()) error.value = e instanceof Error ? e.message : 'Task save failed.'; return null }
    finally { if (alive) saving.value = false }
  }
  const dispose = () => {
    alive = false
    void voice.cancelOperationForTarget(target.key)
    if (draftId.value) void client.discard(draftId.value).catch(() => undefined)
  }
  onBeforeUnmount(dispose)
  return {text, files, dependsOn, partOf, draftId, pending, saving, error, blocked, target, current, addFiles, removeFile, save, dispose, client}
}
