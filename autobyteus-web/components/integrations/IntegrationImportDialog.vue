<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" data-testid="integration-import-overlay" @click.self="close">
    <section
      ref="panelRef"
      class="flex max-h-[min(44rem,90vh)] w-full max-w-[42rem] flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integration-import-title"
      :aria-busy="store.importing"
      tabindex="-1"
      data-testid="integration-import-dialog"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 py-4 pl-6 pr-4">
        <h2 id="integration-import-title" class="text-lg font-semibold text-slate-900">{{ t('integrations.import.title') }}</h2>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :aria-label="t('integrations.dialog.close')"
          :title="t('integrations.dialog.close')"
          data-testid="integration-import-close"
          @click="close"
        >
          <Icon icon="heroicons:x-mark" class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <form class="min-h-0 flex-1 overflow-y-auto px-6 py-5" @submit.prevent="runImport">
        <label for="integration-import-link" class="mb-2 block text-sm font-medium text-slate-700">{{ t('integrations.import.label') }}</label>
        <div class="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            id="integration-import-link"
            ref="inputRef"
            v-model="link"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            aria-describedby="integration-import-hint"
            class="h-10 min-w-0 flex-1 basis-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-[13px] text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 sm:basis-auto"
            :placeholder="t('integrations.import.placeholder')"
            :disabled="store.importing"
            data-testid="integration-import-input"
          >
          <button
            v-if="pickerEligible"
            type="button"
            class="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="store.importing || picking"
            data-testid="integration-import-browse"
            @click="browse"
          >
            {{ t('integrations.import.browse') }}
          </button>
          <button
            type="submit"
            class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none max-sm:flex-1"
            :disabled="!link.trim() || store.importing"
            data-testid="integration-import-submit"
          >
            <span v-if="store.importing" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white" aria-hidden="true" />
            {{ store.importing ? t('integrations.import.importing') : t('integrations.import.button') }}
          </button>
        </div>

        <p
          v-if="errorText"
          class="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-800"
          role="alert"
          data-testid="integration-import-error"
        >
          <Icon icon="heroicons:exclamation-circle-20-solid" class="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <span class="min-w-0 break-words">{{ errorText }}</span>
        </p>

        <p id="integration-import-hint" class="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500" aria-live="polite" data-testid="integration-import-hint">
          <Icon v-if="isRepositoryLink" icon="heroicons:shield-exclamation" class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{{ t(isRepositoryLink ? 'integrations.import.trust' : isFolder ? 'integrations.import.folderHint' : 'integrations.import.hint') }}</span>
        </p>
      </form>

      <footer class="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="store.importing"
          data-testid="integration-import-cancel"
          @click="close"
        >
          {{ t('integrations.import.cancel') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useModalDialog } from '~/composables/useModalDialog'
import { pickFolderPath } from '~/composables/useNativeFolderDialog'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { canUseLocalFolderPicker } from '~/utils/mobileFeatureGates'
import { IntegrationError, useIntegrationsStore } from '~/stores/integrationsStore'

const emit = defineEmits<{ close: []; imported: [payload: { names: string[]; repository: string }] }>()

const store = useIntegrationsStore()
const nodeContext = useWindowNodeContextStore()
const { t } = useLocalization()
const link = ref('')
const error = ref<IntegrationError | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// A web address is a GitHub repository (downloaded); anything else is a folder on this computer (used where it is).
const isRepositoryLink = computed(() => /^\s*(https?:\/\/|www\.|github\.com\/)/i.test(link.value))
const isFolder = computed(() => link.value.trim() !== '' && !isRepositoryLink.value)
const pickerEligible = computed(() => canUseLocalFolderPicker({
  isEmbeddedWindow: nodeContext.isEmbeddedWindow,
  hasElectronFolderDialog: typeof window !== 'undefined' && typeof window.electronAPI?.showFolderDialog === 'function',
}))
const picking = ref(false)
const browse = async () => {
  if (picking.value || store.importing) return
  picking.value = true
  try {
    const picked = await pickFolderPath()
    if (picked) link.value = picked
  } finally {
    picking.value = false
    inputRef.value?.focus()
  }
}

/** The importer's outcome in the page's words (codes from the server; the details carry the path, skill or reason). */
const errorText = computed(() => {
  const current = error.value
  if (!current) return ''
  const { details } = current
  switch (current.code) {
    case 'NOT_A_LINK_OR_PATH': return t('integrations.import.errorNotLocation')
    case 'DIRECTORY_NOT_FOUND': return t('integrations.import.errorFolderNotFound', { path: details.path ?? '' })
    case 'NO_INTEGRATIONS_FOUND': return t(details.kind === 'LOCAL_PATH' ? 'integrations.import.errorNoIntegrationsFolder' : 'integrations.import.errorNoIntegrations')
    case 'SKILL_NAME_CONFLICT': return t('integrations.import.errorClash', { skill: details.skill ?? '' })
    case 'GITHUB_UNREACHABLE': return t('integrations.import.errorUnreachable', { reason: details.reason ?? '' })
    case 'ALREADY_IMPORTED': return t(details.kind === 'LOCAL_PATH' ? 'integrations.import.errorAlreadyFolder' : 'integrations.import.errorAlready')
    case 'INTEGRATION_ALREADY_IMPORTED': return t('integrations.import.errorIntegrationAlready', { id: details.id ?? '', source: details.existingSource ?? '' })
    default: return t('integrations.import.errorFailed', { reason: details.reason ?? current.message })
  }
})

const close = () => { if (!store.importing) emit('close') }

const runImport = async () => {
  const value = link.value.trim()
  if (!value || store.importing) return
  error.value = null
  try {
    const { names, source } = await store.importLocation(value)
    emit('imported', { names, repository: source })
  } catch (cause) {
    error.value = cause instanceof IntegrationError ? cause : new IntegrationError('FAILED')
    await nextTick()
    inputRef.value?.focus()
  }
}

// The field is focused on open; Tab stays in the dialog; Esc closes (not while importing); focus returns to Import.
useModalDialog({ panelRef, onClose: close, initialFocus: () => inputRef.value })
</script>
