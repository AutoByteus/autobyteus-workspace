<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" data-testid="integration-sources-overlay" @click.self="close">
    <section
      ref="panelRef"
      class="flex max-h-[min(44rem,90vh)] w-full max-w-[42rem] flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
      :inert="confirmation ? true : undefined"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integration-sources-title"
      :aria-busy="busy"
      tabindex="-1"
      data-testid="integration-sources-dialog"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 py-4 pl-4 pr-3 sm:pl-6 sm:pr-4">
        <h2 id="integration-sources-title" class="text-lg font-semibold text-slate-900">{{ t('integrations.sources.title') }}</h2>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :aria-label="t('integrations.dialog.close')"
          :title="t('integrations.dialog.close')"
          data-testid="integration-sources-close"
          @click="close"
        >
          <Icon icon="heroicons:x-mark" class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <p class="px-4 pb-1 pt-4 text-sm text-slate-500 sm:px-6">{{ t('integrations.sources.intro') }}</p>
        <ul class="divide-y divide-slate-100 py-1" role="list" :aria-label="t('integrations.sources.listLabel')" data-testid="integration-sources-list">
          <IntegrationSourceRow
            v-for="source in store.sources"
            :key="source.sourceId"
            :source="source"
            :disabled="busy"
            @update="confirmation = { action: 'update', source }"
            @remove="confirmation = { action: 'remove', source }"
          />
        </ul>
      </div>

      <div v-if="message" class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-6">
        <p
          class="flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] leading-5"
          :class="message.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'"
          :role="message.kind === 'error' ? 'alert' : 'status'"
          data-testid="integration-sources-message"
        >
          <Icon
            :icon="message.kind === 'error' ? 'heroicons:exclamation-circle-20-solid' : 'heroicons:check-circle-20-solid'"
            class="mt-0.5 h-4 w-4 shrink-0"
            :class="message.kind === 'error' ? 'text-red-500' : 'text-emerald-500'"
            aria-hidden="true"
          />
          <span class="min-w-0 break-words">{{ message.text }}</span>
        </p>
      </div>

      <footer class="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          data-testid="integration-sources-done"
          @click="close"
        >
          {{ t('integrations.sources.done') }}
        </button>
      </footer>
    </section>

    <SkillSourceUpdateConfirmation
      :show="confirmation?.action === 'update'"
      :pending="confirming"
      :source="updateTarget"
      @confirm="confirmAction"
      @cancel="confirmation = null"
    />
    <ConfirmationModal
      :show="confirmation?.action === 'remove'"
      :pending="confirming"
      :title="t('integrations.sources.removeTitle')"
      :confirm-button-text="t('integrations.sources.remove')"
      variant="danger"
      @confirm="confirmAction"
      @cancel="confirmation = null"
    >
      <p v-if="confirmation" class="text-sm leading-6 text-slate-600" data-testid="integration-source-remove-confirm">
        {{ t(confirmation.source.kind === 'LOCAL_PATH' ? 'integrations.sources.removeBodyFolder' : 'integrations.sources.removeBody', {
          name: nameOf(confirmation.source),
          skills: confirmation.source.skillCount === 1 ? t('integrations.sources.skillsOne') : t('integrations.sources.skillsMany', { count: confirmation.source.skillCount }),
        }) }}
        <span v-if="connectedNames.length > 0" class="mt-1 block" data-testid="integration-source-remove-connections">
          {{ t(connectedNames.length === 1 ? 'integrations.sources.removeConnections' : 'integrations.sources.removeConnectionsMany', { names: connectedNames.join(', ') }) }}
        </span>
      </p>
      <div v-if="confirmation" class="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200" aria-hidden="true">
          <Icon :icon="confirmation.source.kind === 'LOCAL_PATH' ? 'heroicons:folder' : 'mdi:github'" class="h-4 w-4" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium text-slate-900">{{ nameOf(confirmation.source) }}</span>
          <span class="mt-0.5 block break-all font-mono text-[11.5px] leading-4 text-slate-500">{{ confirmation.source.location }}</span>
        </span>
      </div>
    </ConfirmationModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import IntegrationSourceRow from '~/components/integrations/IntegrationSourceRow.vue'
import SkillSourceUpdateConfirmation, { type SkillSourceUpdateTarget } from '~/components/skills/SkillSourceUpdateConfirmation.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useModalDialog } from '~/composables/useModalDialog'
import { IntegrationError, sourceDisplayName, useIntegrationsStore, type IntegrationSourceView } from '~/stores/integrationsStore'

const emit = defineEmits<{ close: []; notice: [text: string] }>()

const store = useIntegrationsStore()
const { t } = useLocalization()
const panelRef = ref<HTMLElement | null>(null)
const confirmation = ref<{ action: 'update' | 'remove'; source: IntegrationSourceView } | null>(null)
const confirming = ref(false)
const message = ref<{ kind: 'success' | 'error'; text: string } | null>(null)
const busy = computed(() => confirming.value || Object.values(store.sourceBusy).some(Boolean))

const nameOf = (source: IntegrationSourceView) => sourceDisplayName(source)

// The connections that go with the source: an integration without its source has no card, so its token goes too.
const connectedNames = computed(() => {
  const source = confirmation.value?.action === 'remove' ? confirmation.value.source : null
  if (!source) return []
  return store.items.filter(item => source.integrationIds.includes(item.id) && item.state === 'CONNECTED').map(item => item.name)
})

const updateTarget = computed<SkillSourceUpdateTarget | null>(() => {
  const source = confirmation.value?.action === 'update' ? confirmation.value.source : null
  return source?.github ? {
    name: nameOf(source), repositoryUrl: source.github.repositoryUrl, branch: source.github.defaultBranch,
    installedRevision: source.github.installedRevision, latestRevision: source.github.latestRevision,
  } : null
})



const close = () => { if (!busy.value) emit('close') }

const failureText = (cause: unknown, name: string): string => {
  const failure = cause instanceof IntegrationError ? cause : null
  if (failure?.code === 'GITHUB_UNREACHABLE') return t('integrations.sources.errorUpdate', { name, reason: failure.details.reason ?? '' })
  if (failure?.code === 'UPDATE_FAILED' || failure?.code === 'REMOVE_FAILED') {
    return t('integrations.sources.errorChange', { name, reason: failure.details.reason ?? '' })
  }
  return t('integrations.sources.errorFailed')
}

async function confirmAction() {
  const current = confirmation.value
  if (!current || confirming.value) return
  confirming.value = true
  message.value = null
  const name = nameOf(current.source)
  try {
    await store.sourceAction(current.source.sourceId, current.action)
    const text = t(current.action === 'update' ? 'integrations.sources.updated' : 'integrations.sources.removed', { name })
    // Nothing left to manage: the dialog closes and the page says what happened.
    if (store.sources.length === 0) { emit('notice', text); emit('close') } else message.value = { kind: 'success', text }
  } catch (cause) {
    message.value = { kind: 'error', text: failureText(cause, name) }
  } finally {
    confirming.value = false
    confirmation.value = null
  }
}

// The confirmations own the keyboard while open; otherwise Tab stays here, Esc closes, focus returns to the button.
useModalDialog({ panelRef, onClose: close, blocked: () => confirmation.value !== null })

onMounted(async () => {
  try {
    await store.loadSources()
  } catch (cause) {
    message.value = { kind: 'error', text: t('integrations.page.loadFailed', { reason: cause instanceof Error ? cause.message : String(cause) }) }
  }
})
</script>
