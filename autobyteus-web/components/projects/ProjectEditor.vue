<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50" data-testid="project-editor-page">
    <div class="w-full max-w-[1040px] px-4 py-5 sm:px-6 lg:px-8">
      <NuxtLink :to="backTarget" class="inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="project-editor-back"><Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />{{ isEdit ? t('projects.ui.backProject') : t('projects.ui.projects') }}</NuxtLink>
      <header class="mb-5 mt-4">
        <h1 ref="heading" tabindex="-1" class="text-2xl font-semibold tracking-tight text-slate-900 outline-none">{{ isEdit ? t('projects.ui.editProject') : t('projects.ui.newProject') }}</h1>
        <p class="mt-1.5 text-sm leading-6 text-slate-500">{{ isEdit ? t('projects.ui.projectEditHelp') : t('projects.ui.projectCreateHelp') }}</p>
      </header>
      <p v-if="loading" role="status" class="mb-4 text-sm text-slate-500">{{ t('projects.components.projects.ProjectDetail.loading') }}</p>
      <p v-else-if="loadError" role="alert" class="mb-4 text-sm text-red-700">{{ loadError }} <button type="button" @click="load">{{ t('projects.common.retry') }}</button></p>
      <div v-else-if="isEdit && !existing" class="rounded-xl border border-slate-200 bg-white p-6" role="status"><h2 class="font-semibold text-slate-900">{{ t('projects.components.projects.ProjectDetail.notFoundTitle') }}</h2><p class="mt-2 text-sm text-slate-600">{{ t('projects.components.projects.ProjectDetail.notFoundHelp') }}</p><NuxtLink to="/projects" class="mt-4 inline-block text-sm font-medium text-blue-700">{{ t('projects.ui.backProjects') }}</NuxtLink></div>

      <form v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white" novalidate @submit.prevent="submit">
        <p v-if="saveError" ref="saveErrorElement" tabindex="-1" role="alert" class="outline-none mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ saveError }}</p>
        <div class="p-5 sm:p-6">
          <div>
            <label for="project-editor-name" class="block text-sm font-medium text-slate-700">{{ t('projects.ui.name') }} <span class="font-normal text-slate-500">{{ t('projects.ui.required') }}</span></label>
            <input id="project-editor-name" v-model="name" maxlength="200" required type="text" :placeholder="t('projects.ui.namePlaceholder')" :disabled="saving" :aria-invalid="nameError ? 'true' : 'false'" :aria-describedby="nameError ? 'project-editor-name-error' : undefined" class="mt-2 block min-h-11 w-full rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 sm:text-sm" :class="nameError ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'" data-testid="project-name-input" />
            <p v-if="nameError" id="project-editor-name-error" class="mt-2 text-sm text-red-600" role="alert" data-testid="project-name-error">{{ nameError }}</p>
          </div>
          <div class="mt-4">
            <label for="project-editor-description" class="block text-sm font-medium text-slate-700">{{ t('projects.ui.description') }} <span class="font-normal text-slate-500">{{ t('projects.ui.optional') }}</span></label>
            <textarea id="project-editor-description" v-model="description" rows="2" :disabled="saving" :placeholder="t('projects.ui.projectDescriptionPlaceholder')" class="mt-2 block min-h-[104px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base leading-6 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:min-h-0 sm:text-sm" data-testid="project-description-input" />
            <ProjectVoiceStatus :target="voiceTarget" class="mt-3" />
            <div class="mt-2 flex justify-end">
              <VoiceInputButton :target="voiceTarget" source="project-description" large :disabled="saving" data-testid="project-voice-button" />
            </div>
          </div>

          <section class="mt-6 border-t border-slate-200 pt-5" aria-labelledby="project-workspaces-heading" data-testid="project-create-workspaces">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div><h2 id="project-workspaces-heading" class="text-sm font-semibold text-slate-800">{{ t('projects.ui.workspaces') }} <span class="font-normal text-slate-500">{{ t('projects.ui.optional') }}</span></h2><p class="mt-1 text-xs leading-5 text-slate-500">{{ t('projects.ui.workspaceHelp') }}</p></div>
              <button type="button" :disabled="saving" class="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50" id="project-add-workspace-inline" data-testid="project-add-workspace-inline" @click="addWorkspace"><Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />{{ t('projects.ui.addWorkspace') }}</button>
            </div>
            <div v-if="rows.length === 0" class="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-4" data-testid="project-create-workspaces-empty"><Icon icon="heroicons:folder" class="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" /><p class="text-sm text-slate-500">{{ t('projects.ui.noWorkspaces') }}</p></div>

            <ProjectWorkspaceEntry v-for="(row, index) in rows" :key="row.key" v-model="rows[index]!" :index="index" :disabled="saving" :choices="availableChoices(row)" @remove="removeWorkspace(row)" />
          </section>
        </div>
        <div class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:px-6"><NuxtLink :to="backTarget" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium whitespace-nowrap text-slate-700 sm:px-5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none" data-testid="project-editor-cancel">{{ t('projects.common.cancel') }}</NuxtLink><button type="submit" :disabled="saving || voicePending" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-medium whitespace-nowrap text-white sm:px-5 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 sm:flex-none" data-testid="project-form-submit">{{ saving ? t('projects.common.saving') : isEdit ? t('projects.ui.saveChanges') : t('projects.ui.createProject') }}</button></div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '~/stores/projectStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useLocalization } from '~/composables/useLocalization'
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'
import ProjectVoiceStatus from './ProjectVoiceStatus.vue'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { mergeTranscriptWithDraft } from '~/utils/voiceInputCapture'
import type { VoiceTranscriptTarget } from '~/types/voiceInput'
import ProjectWorkspaceEntry from './ProjectWorkspaceEntry.vue'
import type { ProjectWorkspaceDraft } from '~/types/projectWorkspaceDraft'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'
const props = defineProps<{projectId?: string}>()
const route = useRoute(), router = useRouter(), projects = useProjectStore(), workspaces = useWorkspaceStore(), node = useWindowNodeContextStore()
const {t} = useLocalization()
const revision = node.bindingRevision
let alive = true, nextKey = 0
const current = () => alive && node.bindingRevision === revision

const isEdit = computed(() => Boolean(props.projectId))
const existing = computed(() => props.projectId ? projects.getProjectById(props.projectId) : null)
const name = ref(''), description = ref(''), nameError = ref(''), saving = ref(false), saveError = ref(''), loadError = ref(''), loading = ref(true)
const voice = useVoiceInputStore()
const initialProjectId = props.projectId
const voiceCurrent = () => current() && props.projectId === initialProjectId
  && !loading.value && !loadError.value && !saving.value && (!isEdit.value || Boolean(existing.value))
const voiceTarget: VoiceTranscriptTarget = {
  key: `project-description-${Math.random().toString(36).slice(2)}`,
  isCurrent: voiceCurrent,
  appendTranscript: (transcript) => {
    if (voiceCurrent()) description.value = mergeTranscriptWithDraft(description.value, transcript)
  },
}
const voicePending = computed(() => voice.transcriptTarget?.key === voiceTarget.key
  && (voice.isStarting || voice.isRecording || voice.isTranscribing))
onBeforeUnmount(() => {alive = false; void voice.cancelOperationForTarget(voiceTarget.key)})
const heading = ref<HTMLElement | null>(null)
const saveErrorElement = ref<HTMLElement | null>(null)
const rows = ref<ProjectWorkspaceDraft[]>([])
const backTarget = computed(() => isEdit.value ? `/projects/${props.projectId}${route.query.tab === 'workspaces' ? '?tab=workspaces' : ''}` : '/projects')
const choices = computed(() => Object.values(workspaces.workspaceMetadataById).filter((w) => w.kind !== 'temp').map((w) => ({displayName: w.displayName, workspaceRootPath: w.workspaceRootPath})))
const availableChoices = (row: ProjectWorkspaceDraft) => {
  const all = row.original && !choices.value.some((w) => w.workspaceRootPath === row.original!.workspaceRootPath) ? [...choices.value, row.original] : choices.value
  const distinct = all.filter((choice, index) => all.findIndex((w) => w.workspaceRootPath === choice.workspaceRootPath) === index)
  return distinct.filter((w) => !rows.value.some((other) => other.key !== row.key && other.workspaceRootPath === w.workspaceRootPath))
}
const addWorkspace = async () => {
  const key = nextKey++; rows.value.push({key, mode: 'existing', workspaceRootPath: '', description: '', error: ''})
  await nextTick(); document.getElementById(`workspace-choice-${key}`)?.focus()
}
const removeWorkspace = async (row: ProjectWorkspaceDraft) => {
  rows.value = rows.value.filter((r) => r.key !== row.key)
  await nextTick(); document.getElementById('project-add-workspace-inline')?.focus()
}
watch(name, (value) => { if (value.trim()) nameError.value = '' })
const load = async () => {
  loading.value = true; loadError.value = ''
  try {
    if (props.projectId) await projects.fetchProject(props.projectId)
    await workspaces.fetchAllWorkspaces(true)
    if (!current()) return
    name.value = existing.value?.name ?? ''; description.value = existing.value?.description ?? ''
    rows.value = (existing.value?.workspaces ?? []).map((link) => ({key: nextKey++, mode: 'existing', workspaceRootPath: link.workspaceRootPath, description: link.description, error: '', original: link}))
    loading.value = false
    await nextTick(); heading.value?.focus()
    if (route.query.addWorkspace === '1') await addWorkspace()
    else if (route.query.workspacePath) {
      const row = rows.value.find((r) => r.workspaceRootPath === route.query.workspacePath)
      if (row) document.getElementById(`workspace-description-${row.key}`)?.focus()
    }
  } catch (e) { if (current()) {loading.value = false; loadError.value = e instanceof Error ? e.message : t('projects.errors.requestFailed')} }
}
const submit = async () => {
  if (saving.value || voicePending.value || !current()) return
  nameError.value = name.value.trim() ? '' : t('projects.errors.nameRequired')
  if (nameError.value) { await nextTick(); document.getElementById('project-editor-name')?.focus(); return }
  for (const row of rows.value) row.error = row.mode === 'existing' && !row.workspaceRootPath ? t('projects.ui.chooseWorkspace') : row.mode === 'new' && !row.workspaceRootPath.trim() ? t('projects.ui.enterPath') : ''
  const invalid = rows.value.find((r) => r.error)
  if (invalid) { await nextTick(); document.getElementById(`workspace-choice-${invalid.key}`)?.focus(); return }
  saving.value = true; saveError.value = ''
  try {
    const links = rows.value.map((row) => ({workspaceRootPath: row.workspaceRootPath.trim(), description: row.description.trim()}))
    const input = {name: name.value.trim(), description: description.value.trim(), workspaces: links}
    const saved = props.projectId ? await projects.updateProject({projectId: props.projectId, ...input}, current) : await projects.createProject(input, current)
    if (!current()) return
    await router.push({path: `/projects/${saved.projectId}`, query: {notice: isEdit.value ? 'saved' : 'created', ...((!isEdit.value && links.length > 0) || route.query.tab === 'workspaces' ? {tab: 'workspaces'} : {})}})
  } catch (e) {
    if (!current()) return
    if (projectErrorMessageKey(e) === 'projects.errors.nameTaken') {nameError.value = t('projects.errors.nameTaken'); await nextTick(); document.getElementById('project-editor-name')?.focus()}
    else {saveError.value = t(projectErrorMessageKey(e)); await nextTick(); saveErrorElement.value?.focus()}
  } finally { if (current()) saving.value = false }
}
onMounted(load)
</script>
