<template>
  <header class="mb-6 mt-4">
    <p class="mb-2 break-words text-sm font-medium text-slate-500" data-testid="task-project-context">{{ projectName }}</p>
    <h1 ref="heading" tabindex="-1" class="break-words text-3xl font-semibold tracking-tight text-slate-900 outline-none" data-testid="task-page-heading">{{ t(task ? 'projects.ui.editTask' : 'projects.ui.newTask') }}</h1>
  </header>
  <form novalidate @submit.prevent="save">
    <div class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <label for="task-page-description" class="block text-sm font-medium text-slate-700">{{ t('projects.ui.description') }} <span class="font-normal text-slate-400">{{ t('projects.ui.required') }}</span></label>
      <TaskDescriptionComposer v-model="text" :files="files" :client="client" :draft-id="draftId" :saved-filenames="savedFilenames" :target="target" :disabled="saving" :adding="pending" :error="fieldError" :placeholder="t('projects.components.projects.ProjectTaskEditor.descriptionPlaceholder')" @add="addFiles" @remove="removeFile" @clear="clearFiles" @save="save" />
      <p v-if="fieldError" id="task-page-error" class="mt-2 text-sm text-red-600" role="alert" data-testid="task-page-description-error">{{ fieldError }}</p>
      <p v-if="error" role="alert" class="mt-3 text-sm text-red-700" data-testid="task-page-save-error">{{ error }}</p>
    </div>
    <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pb-2 pt-5">
      <NuxtLink :to="task ? detailTarget : boardTarget" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none" data-testid="task-page-cancel">{{ t('projects.common.cancel') }}</NuxtLink>
      <button type="submit" :disabled="blocked" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:flex-none" data-testid="task-page-save">{{ t(saving ? 'projects.common.saving' : task ? 'projects.ui.saveChanges' : 'projects.components.projects.ProjectTaskEditor.create') }}</button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskDraft } from '~/composables/projects/useProjectTaskDraft'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'
import TaskDescriptionComposer from './TaskDescriptionComposer.vue'
const props = defineProps<{projectId: string; projectName: string; task?: ProjectTask}>()
const {t} = useLocalization(), router = useRouter()
const draft = useProjectTaskDraft(props.projectId, props.task)
const {text, files, client, draftId, pending, saving, error, blocked, target, addFiles, removeFile} = draft
const fieldError = ref(''), heading = ref<HTMLElement | null>(null)
const boardTarget = `/projects/${props.projectId}`, detailTarget = `${boardTarget}/tasks/${props.task?.taskId}`
const savedFilenames = props.task?.contextFiles?.map((f) => f.storedFilename) ?? []
watch(text, (value) => { if (value.trim()) fieldError.value = '' })
const clearFiles = async () => {for (const file of [...files.value]) await removeFile(file.storedFilename)}
const save = async () => {
  if (blocked.value || !draft.current()) return
  if (!text.value.trim()) {fieldError.value = t('projects.errors.taskDescriptionRequired'); await nextTick(); document.getElementById('task-page-description')?.focus(); return}
  const saved = await draft.save()
  if (!saved || !draft.current()) return
  if (!props.task) useProjectTaskStore().setSearch(props.projectId, '')
  await router.push({path: props.task ? detailTarget : boardTarget, query: {notice: props.task ? 'saved' : 'task-created'}})
}
onMounted(() => heading.value?.focus())
</script>
