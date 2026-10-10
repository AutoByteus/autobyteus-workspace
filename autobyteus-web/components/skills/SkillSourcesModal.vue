<template>
  <div class="dialog-overlay fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" @click.self="close">
    <section ref="panelRef" class="dialog flex max-h-[min(48rem,90vh)] w-full max-w-[45rem] flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
      :inert="confirmation ? true : undefined" role="dialog" aria-modal="true" aria-labelledby="skill-sources-title" :aria-busy="busy" tabindex="-1"
      data-testid="skill-sources-dialog">
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 py-4 pl-4 pr-3 sm:pl-6 sm:pr-4">
        <h2 id="skill-sources-title" class="text-lg font-semibold text-slate-900">{{ t('skills.components.skills.SkillSourcesModal.manage_skill_sources') }}</h2>
        <button type="button" :aria-label="t('skills.sources.close')" :title="t('skills.sources.close')"
          class="close-btn inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          @click="close">
          <Icon icon="heroicons:x-mark" class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div class="sources-scroll min-h-0 flex-1 overflow-y-auto" data-testid="skill-sources-list">
        <div v-if="loading && !sources.length" class="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
          <Icon icon="svg-spinners:ring-resize" class="h-4 w-4 text-slate-400" aria-hidden="true" />
          {{ t('skills.components.skills.SkillSourcesModal.loading_sources') }}
        </div>
        <ul v-else class="sources-list divide-y divide-slate-100 py-1" :aria-label="t('skills.sources.listLabel')">
          <SkillSourceRow v-for="source in sources" :key="source.sourceId" :source="source"
            :pending="pending[source.sourceId]" :disabled="busy"
            @check="check(source)" @update="confirmation = { action: 'update', source }"
            @remove="confirmation = { action: 'remove', source }" />
        </ul>
      </div>

      <div class="add-source-section shrink-0 border-t border-slate-200 px-4 pb-4 pt-3 sm:px-6">
        <div v-if="error || registryError || successMessage || warnings.length" class="alerts mb-3 space-y-2">
          <p v-if="error || registryError" role="alert" class="error-alert alert-bar border-red-200 bg-red-50 text-red-800">
            <Icon icon="heroicons:exclamation-circle-20-solid" class="alert-icon text-red-500" aria-hidden="true" />
            <span class="min-w-0">{{ error || registryError }}</span>
          </p>
          <p v-if="successMessage" role="status" class="success-alert alert-bar border-emerald-200 bg-emerald-50 text-emerald-900">
            <Icon icon="heroicons:check-circle-20-solid" class="alert-icon text-emerald-500" aria-hidden="true" />
            <span class="min-w-0">{{ successMessage }}</span>
          </p>
          <div v-if="warnings.length" role="status" class="warning-alert alert-bar border-amber-200 bg-amber-50 text-amber-900">
            <Icon icon="heroicons:exclamation-triangle-20-solid" class="alert-icon text-amber-500" aria-hidden="true" />
            <ul class="min-w-0 space-y-0.5"><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul>
          </div>
        </div>

        <form @submit.prevent="handleAdd">
          <label for="skill-source-input" class="mb-2 block text-[13px] font-medium text-slate-700">{{ t('skills.sources.addSource') }}</label>
          <div class="input-group flex gap-2">
            <input id="skill-source-input" ref="inputRef" v-model="newPath" :disabled="busy" type="text" autocomplete="off" spellcheck="false"
              aria-describedby="skill-source-hint"
              class="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-[13px] text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
              :placeholder="t('skills.sources.inputPlaceholder')" />
            <button v-if="pickerEligible" type="button" class="browse btn-secondary-sm" :disabled="busy || picking" @click="browse">
              {{ t('skills.sources.browse') }}
            </button>
            <button class="btn-add btn-primary-sm" type="submit" :disabled="!newPath.trim() || busy">
              <Icon v-if="scanning" icon="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
              <Icon v-else icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
              {{ scanning ? t('skills.sources.working') : t('skills.sources.add') }}
            </button>
          </div>
        </form>
        <p id="skill-source-hint" class="hint mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500" aria-live="polite">
          <Icon v-if="isRepositoryUrl" icon="heroicons:shield-exclamation" class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{{ t(isRepositoryUrl ? 'skills.sources.trust' : 'skills.sources.inputHint') }}</span>
        </p>
      </div>

      <footer class="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
        <button type="button" class="btn-done btn-secondary-sm" @click="close">{{ t('skills.components.skills.SkillSourcesModal.done') }}</button>
      </footer>
    </section>

    <ConfirmationModal :show="!!confirmation" :pending="confirming"
      :title="t(confirmation?.action === 'update' ? 'skills.sources.updateTitle' : 'skills.components.skills.SkillSourcesModal.remove_skill_source')"
      :confirm-button-text="t(confirmation?.action === 'update' ? 'skills.sources.update' : 'skills.sources.remove')"
      variant="danger" @confirm="confirmAction" @cancel="confirmation = null">
      <p class="confirm-copy text-sm leading-6 text-slate-600">{{ confirmationMessage }}</p>
      <div v-if="confirmation" class="confirm-source mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200" aria-hidden="true">
          <Icon :icon="confirmation.source.github ? 'mdi:github' : 'heroicons:folder'" class="h-4 w-4" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium text-slate-900">{{ skillSourceDisplayName(confirmation.source) }}</span>
          <span class="mt-0.5 block break-all font-mono text-[11.5px] leading-4 text-slate-500">{{ confirmation.source.github?.repositoryUrl ?? confirmation.source.path }}</span>
          <span v-if="confirmation.action === 'update' && confirmation.source.github?.latestRevision" class="version-change mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-slate-600">
            <span>{{ confirmation.source.github.defaultBranch }}</span>
            <span class="font-mono text-[11.5px]" :title="confirmation.source.github.installedRevision">{{ confirmation.source.github.installedRevision.slice(0, 10) }}</span>
            <Icon icon="heroicons:arrow-right-20-solid" class="h-3.5 w-3.5 text-slate-400" :aria-label="t('skills.sources.latest')" />
            <span class="font-mono text-[11.5px] font-medium text-slate-900" :title="confirmation.source.github.latestRevision">{{ confirmation.source.github.latestRevision.slice(0, 10) }}</span>
          </span>
        </span>
      </div>
    </ConfirmationModal>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useSkillSourcesStore, type SkillSource } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { canUseLocalFolderPicker } from '~/utils/mobileFeatureGates'
import { pickFolderPath } from '~/composables/useNativeFolderDialog'
import { skillSourceDisplayName } from '~/utils/skills/skillSourceDisplay'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import SkillSourceRow from './SkillSourceRow.vue'

const { t } = useLocalization()
const emit = defineEmits(['close'])
const store = useSkillSourcesStore()
const skillStore = useSkillStore()
const skillNames = useSkillNamesStore()
const nodeContext = useWindowNodeContextStore()
const { skillSources, loading, error, registryError, warnings, pending } = storeToRefs(store)
const newPath = ref('')
const successMessage = ref('')
const scanning = ref(false)
const confirming = ref(false)
const picking = ref(false)
const confirmation = ref<{ action: 'update' | 'remove'; source: SkillSource } | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const busy = computed(() => loading.value || scanning.value || Object.keys(pending.value).length > 0)
const sources = computed(() => [...skillSources.value].sort((a, b) =>
  Number(b.isDefault) - Number(a.isDefault) || a.path.localeCompare(b.path)))
const confirmationMessage = computed(() => t(confirmation.value?.action === 'update'
  ? 'skills.sources.updateWarning' : confirmation.value?.source.github
    ? 'skills.sources.removeWarning' : 'skills.sources.unlinkWarning'))
// One input for both kinds: a web address is imported as a GitHub repository (the import validates it and
// rejects non-GitHub or non-root URLs with its existing message); anything else is added as a local folder.
const isRepositoryUrl = computed(() => /^\s*(https?:\/\/|www\.|github\.com\/)/i.test(newPath.value))
// Browse… (DEC-002): the native folder picker, only where the workspace folder picker is offered.
const pickerEligible = computed(() => canUseLocalFolderPicker({
  isEmbeddedWindow: nodeContext.isEmbeddedWindow,
  hasElectronFolderDialog: typeof window !== 'undefined' && typeof window.electronAPI?.showFolderDialog === 'function',
}))

function close() { if (!confirming.value) emit('close') }

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
// Another layer owns the keyboard: the remove/update confirmation (the panel is inert) or the shared
// skill-name conflict dialog, which handles its own Esc.
const overlayOpen = computed(() => !!confirmation.value || skillNames.conflicts.length > 0)
// With no other layer open, focus outside this modal panel is stray: a focused control was disabled, made
// inert or removed (focus fell to <body>), or it is still on the fading-out confirmation's button.
const focusOutsidePanel = () => !panelRef.value?.contains(document.activeElement)

// Listens on the document so that Esc and the Tab cycle keep working when focus is stray.
function handleKeydown(event: KeyboardEvent) {
  const panel = panelRef.value
  const active = document.activeElement
  if (!panel || overlayOpen.value) return
  if (event.key === 'Escape') { event.preventDefault(); close(); return }
  if (event.key !== 'Tab') return
  const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (!items.length) return
  const first = items[0]!, last = items[items.length - 1]!
  if (focusOutsidePanel()) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
  else if (event.shiftKey && (active === first || active === panel)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
}

// While a confirmation, an operation or a conflict blocks the panel, its focused control is made inert,
// disabled or removed. Remember it when the block starts (before the DOM update) and return focus into the
// panel when the block ends: to that control if it is still usable, otherwise to the add input or the panel.
let focusBeforeBlock: HTMLElement | null = null
watch(() => overlayOpen.value || busy.value, async (blocked) => {
  const panel = panelRef.value
  if (!panel) return
  if (blocked) {
    const active = document.activeElement
    focusBeforeBlock = active instanceof HTMLElement && active !== panel && panel.contains(active) ? active : null
    return
  }
  await nextTick()
  const target = [focusBeforeBlock, inputRef.value].find(el => el?.isConnected && panel.contains(el) && !el.matches(':disabled'))
  focusBeforeBlock = null
  if (focusOutsidePanel()) (target ?? panel).focus()
})

let returnFocus: HTMLElement | null = null
onMounted(async () => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', handleKeydown)
  await nextTick()
  panelRef.value?.focus()
  try { await store.fetchSkillSources(); await store.checkGitHubSources() } catch { /* visible store error */ }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (returnFocus?.isConnected) returnFocus.focus()
})

async function browse() {
  if (picking.value || busy.value) return
  picking.value = true
  try {
    const picked = await pickFolderPath()
    if (picked) newPath.value = picked
  } finally {
    picking.value = false
    inputRef.value?.focus()
  }
}

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
    await skillNames.runWithSkillNameChecks(() => isRepositoryUrl.value
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
.alert-bar { display: flex; align-items: flex-start; gap: .5rem; border-width: 1px; border-radius: .5rem; padding: .375rem .75rem; font-size: .8125rem; line-height: 1.25rem; overflow-wrap: anywhere; }
.alert-icon { margin-top: .125rem; height: 1rem; width: 1rem; flex-shrink: 0; }
.btn-primary-sm { display: inline-flex; height: 2.25rem; flex-shrink: 0; align-items: center; gap: .375rem; border-radius: .5rem; background: #3b82f6; padding: 0 .875rem; font-size: .875rem; font-weight: 500; color: #fff; white-space: nowrap; transition: background-color .15s; }
.btn-primary-sm:hover:not(:disabled) { background: #2563eb; }
.btn-primary-sm:disabled { cursor: not-allowed; opacity: .5; }
.btn-secondary-sm { display: inline-flex; height: 2.25rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: .5rem; border: 1px solid #e2e8f0; background: #fff; padding: 0 .875rem; font-size: .875rem; font-weight: 500; color: #334155; white-space: nowrap; transition: background-color .15s, border-color .15s; }
.btn-secondary-sm:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.btn-secondary-sm:disabled { cursor: not-allowed; opacity: .5; }
.btn-primary-sm:focus-visible, .btn-secondary-sm:focus-visible { outline: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3b82f6; }
@media (max-width: 520px) {
  .input-group { flex-wrap: wrap; }
  .input-group input { flex-basis: 100%; }
  .input-group .btn-primary-sm { flex: 1; justify-content: center; }
}
</style>
