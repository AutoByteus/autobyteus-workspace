<template>
  <div class="dialog-overlay" @click.self="close" @keydown.esc="!confirmation && close()">
    <section class="dialog" :inert="confirmation ? true : undefined" role="dialog" aria-modal="true" aria-labelledby="skill-sources-title">
      <header>
        <h3 id="skill-sources-title">{{ t('skills.components.skills.SkillSourcesModal.manage_skill_sources') }}</h3>
        <button :aria-label="t('skills.sources.close')" class="close-btn" @click="close">×</button>
      </header>
      <div class="content">
        <p v-if="loading && !sources.length">{{ t('skills.components.skills.SkillSourcesModal.loading_sources') }}</p>
        <p v-if="error || registryError" role="alert" class="error-alert">{{ error || registryError }}</p>
        <p v-if="successMessage" role="status" class="success-alert">{{ successMessage }}</p>
        <ul v-if="warnings.length" class="warning-alert" role="status"><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul>
        <div class="sources-list">
          <SkillSourceRow v-for="source in sources" :key="source.sourceId" :source="source"
            :pending="pending[source.sourceId]" :disabled="busy"
            @check="check(source)" @update="confirmation = { action: 'update', source }"
            @remove="confirmation = { action: 'remove', source }" />
        </div>
        <div class="add-source-section">
          <div class="input-modes" role="group" :aria-label="t('skills.sources.sourceType')">
            <button :aria-pressed="mode === 'local'" :disabled="busy" @click="mode = 'local'">{{ t('skills.sources.local') }}</button>
            <button :aria-pressed="mode === 'github'" :disabled="busy" @click="mode = 'github'">{{ t('skills.sources.github') }}</button>
          </div>
          <form @submit.prevent="handleAdd">
            <label for="skill-source-input">{{ t(mode === 'github' ? 'skills.sources.repositoryUrl' : 'skills.components.skills.SkillSourcesModal.add_new_source_folder') }}</label>
            <div class="input-group">
              <input id="skill-source-input" v-model="newPath" :disabled="busy" type="text" autocomplete="off"
                :placeholder="mode === 'github' ? 'https://github.com/owner/repository' : t('skills.components.skills.SkillSourcesModal.absolute_path_to_skills_folder')" />
              <button class="btn-add" type="submit" :disabled="!newPath.trim() || busy">
                {{ busy ? t('skills.sources.working') : t(mode === 'github' ? 'skills.sources.import' : 'skills.components.skills.SkillSourcesModal.add_folder') }}
              </button>
            </div>
          </form>
          <p class="hint">{{ t(mode === 'github' ? 'skills.sources.trust' : 'skills.components.skills.SkillSourcesModal.enter_the_absolute_path_to_a') }}</p>
        </div>
      </div>
      <footer><button class="btn-done" @click="close">{{ t('skills.components.skills.SkillSourcesModal.done') }}</button></footer>
    </section>
    <ConfirmationModal :show="!!confirmation" :pending="confirming"
      :title="t(confirmation?.action === 'update' ? 'skills.sources.updateTitle' : 'skills.components.skills.SkillSourcesModal.remove_skill_source')"
      :confirm-button-text="t(confirmation?.action === 'update' ? 'skills.sources.update' : 'skills.sources.remove')"
      variant="danger" @confirm="confirmAction" @cancel="confirmation = null">
      <p class="confirm-copy">{{ confirmationMessage }}</p>
      <p class="confirm-source">{{ confirmation?.source.github?.repositoryUrl ?? confirmation?.source.path }}</p>
    </ConfirmationModal>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillSourcesStore, type SkillSource } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import SkillSourceRow from './SkillSourceRow.vue'

const { t } = useLocalization()
const emit = defineEmits(['close'])
const store = useSkillSourcesStore()
const skillStore = useSkillStore()
const skillNames = useSkillNamesStore()
const { skillSources, loading, error, registryError, warnings, pending } = storeToRefs(store)
const newPath = ref('')
const mode = ref<'local' | 'github'>('local')
const successMessage = ref('')
const scanning = ref(false)
const confirming = ref(false)
const confirmation = ref<{ action: 'update' | 'remove'; source: SkillSource } | null>(null)
const busy = computed(() => loading.value || scanning.value || Object.keys(pending.value).length > 0)
const sources = computed(() => [...skillSources.value].sort((a, b) =>
  Number(b.isDefault) - Number(a.isDefault) || a.path.localeCompare(b.path)))
const confirmationMessage = computed(() => t(confirmation.value?.action === 'update'
  ? 'skills.sources.updateWarning' : confirmation.value?.source.github
    ? 'skills.sources.removeWarning' : 'skills.sources.unlinkWarning'))

function close() { if (!confirming.value) emit('close') }
onMounted(async () => {
  try { await store.fetchSkillSources(); await store.checkGitHubSources() } catch { /* visible store error */ }
})

async function refreshCatalog() {
  try {
    await Promise.all([skillStore.fetchAllSkills(), skillNames.fetchIssues()])
  } catch {
    store.warnings.push(t('skills.sources.refreshWarning'))
  }
}
async function handleAdd() {
  if (!newPath.value.trim() || busy.value) return
  scanning.value = true
  successMessage.value = ''
  try {
    await skillNames.runWithSkillNameChecks(() => mode.value === 'github'
      ? store.githubOperation('import', undefined, newPath.value.trim())
      : store.addSkillSource(newPath.value.trim()))
    newPath.value = ''
    successMessage.value = t('skills.sources.imported')
    await refreshCatalog()
  } catch { /* shared conflict dialog / store error */ }
  finally { scanning.value = false }
}
async function check(source: SkillSource) {
  if (busy.value) return
  successMessage.value = ''
  try { await store.githubOperation('check', source.sourceId) } catch { /* visible store error */ }
}
async function confirmAction() {
  const action = confirmation.value
  if (!action || confirming.value || busy.value) return
  confirming.value = true
  successMessage.value = ''
  try {
    await skillNames.runWithSkillNameChecks(() => action.source.github
      ? store.githubOperation(action.action, action.source.sourceId)
      : store.removeSkillSource(action.source.path))
    successMessage.value = t(action.action === 'update' ? 'skills.sources.updated' : 'skills.components.skills.SkillSourcesModal.remove_success')
  } catch { /* includes retryable REMOVING state */ }
  finally {
    await refreshCatalog()
    confirming.value = false
    confirmation.value = null
  }
}
</script>
<style scoped>
.dialog-overlay { position: fixed; inset: 0; z-index: 40; background: #0008; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.dialog { background: white; border-radius: 12px; width: 100%; max-width: 650px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px #0002; }
header, footer { padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
header { border-bottom: 1px solid #e5e7eb; } h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #111827; }
.close-btn { font-size: 1.5rem; border: 0; padding: 0 .4rem; }
.content { padding: 1.5rem; overflow-y: auto; min-height: 0; }
.sources-list { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.5rem; }
.error-alert, .success-alert, .warning-alert { padding: .75rem; border-radius: 6px; font-size: .875rem; margin-bottom: 1rem; overflow-wrap: anywhere; }
.error-alert { background: #fee2e2; color: #b91c1c; } .success-alert { background: #d1fae5; color: #065f46; }
.warning-alert { background: #fef3c7; color: #92400e; }
.add-source-section { border-top: 1px solid #e5e7eb; padding-top: 1.25rem; }
.input-modes { display: flex; gap: .5rem; margin-bottom: 1rem; }
button { border: 1px solid #d1d5db; border-radius: 6px; padding: .5rem .75rem; cursor: pointer; color: #374151; background: white; }
button[aria-pressed="true"] { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
button:disabled { opacity: .5; cursor: not-allowed; } button:focus-visible, input:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
label { display: block; font-size: .875rem; margin-bottom: .5rem; color: #374151; }
.input-group { display: flex; gap: .5rem; }
input { flex: 1; min-width: 0; border: 1px solid #d1d5db; border-radius: 6px; padding: .625rem; font-family: monospace; font-size: .875rem; }
.btn-add { background: #059669; color: white; border-color: #059669; white-space: nowrap; }
.hint { font-size: .75rem; line-height: 1.5; color: #6b7280; margin-top: .5rem; }
footer { border-top: 1px solid #e5e7eb; justify-content: flex-end; }
.btn-done { background: #2563eb; color: white; border-color: #2563eb; padding: .6rem 1.5rem; }
.confirm-copy { font-size: .9rem; line-height: 1.5; color: #4b5563; } .confirm-source { margin-top: .5rem; font-family: monospace; font-size: .8rem; overflow-wrap: anywhere; }
@media (max-width: 480px) { header, footer, .content { padding: 1rem; } .input-group { flex-direction: column; } h3 { font-size: 1.1rem; } }
</style>
