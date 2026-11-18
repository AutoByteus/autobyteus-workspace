<template>
  <div class="h-full overflow-auto bg-gray-50">
    <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-testid="integrations-page">
      <div v-if="store.loaded && store.items.length > 0" class="mb-4 flex flex-wrap items-center justify-end gap-3" data-testid="integrations-toolbar">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          data-testid="integrations-manage-sources"
          @click="dialog = 'sources'"
        >
          <Icon icon="heroicons:cog-6-tooth" class="h-4 w-4" aria-hidden="true" />
          {{ t('integrations.toolbar.manage') }}
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          data-testid="integrations-import"
          @click="dialog = 'import'"
        >
          <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
          {{ t('integrations.toolbar.import') }}
        </button>
      </div>
      <p
        v-if="notice && store.loaded"
        class="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        role="status"
        data-testid="integrations-notice"
      >
        <Icon icon="heroicons:check-circle-20-solid" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
        <span class="min-w-0 flex-1">{{ notice }}</span>
        <button type="button" class="-my-1 -mr-1 rounded-md p-1 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" :aria-label="t('integrations.imported.dismiss')" @click="notice = ''">
          <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
        </button>
      </p>

      <div v-if="!store.loaded" class="flex flex-col items-center gap-3 py-16 text-gray-500" data-testid="integrations-loading">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" aria-hidden="true" />
        <p class="text-sm">{{ t('integrations.page.loading') }}</p>
      </div>

      <p v-else-if="store.loadError" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid="integrations-load-error">
        {{ t('integrations.page.loadFailed', { reason: store.loadError.message }) }}
      </p>

      <!-- Nothing imported yet: the page invites Import. -->
      <template v-else-if="store.items.length === 0">
        <div class="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm" data-testid="integrations-empty">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon icon="heroicons:puzzle-piece" class="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 class="mt-4 text-lg font-semibold text-gray-900">{{ t('integrations.empty.title') }}</h2>
          <p class="mx-auto mt-1 max-w-md text-sm text-gray-500">{{ t('integrations.empty.body') }}</p>
          <button
            type="button"
            class="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            data-testid="integrations-empty-import"
            @click="dialog = 'import'"
          >
            <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
            {{ t('integrations.empty.import') }}
          </button>
        </div>
      </template>

      <template v-else>
        <ul class="grid grid-cols-1 gap-4 lg:grid-cols-2" role="list" :aria-label="t('integrations.page.listLabel')">
          <li v-for="item in store.items" :key="item.id">
            <IntegrationTile :item="item" @open="openId = $event" />
          </li>
        </ul>
      </template>

      <IntegrationDialog v-if="openItem" :item="openItem" @close="openId = null" />
      <IntegrationImportDialog v-if="dialog === 'import'" @close="dialog = null" @imported="onImported" />
      <IntegrationSourcesDialog v-if="dialog === 'sources'" @close="dialog = null" @notice="notice = $event" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import IntegrationDialog from '~/components/integrations/IntegrationDialog.vue'
import IntegrationImportDialog from '~/components/integrations/IntegrationImportDialog.vue'
import IntegrationSourcesDialog from '~/components/integrations/IntegrationSourcesDialog.vue'
import IntegrationTile from '~/components/integrations/IntegrationTile.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useIntegrationsStore } from '~/stores/integrationsStore'

const store = useIntegrationsStore()
const route = useRoute()
const { t } = useLocalization()
const openId = ref<string | null>(null)
const dialog = ref<'import' | 'sources' | null>(null)
const notice = ref('')
const openItem = computed(() => store.items.find(item => item.id === openId.value) ?? null)

const onImported = ({ names, repository }: { names: string[]; repository: string }) => {
  dialog.value = null
  notice.value = t('integrations.imported.notice', { names: names.join(', '), repository })
}

// The Skills page links a skill to its card: /integrations#integration-<id> scrolls to the card and focuses it.
const focusLinkedCard = async () => {
  const hash = route.hash
  if (!hash.startsWith('#integration-')) return
  await nextTick()
  const card = document.getElementById(hash.slice(1))
  card?.scrollIntoView({ block: 'center' })
  card?.focus({ preventScroll: true })
}

onMounted(async () => {
  await store.load()
  await focusLinkedCard()
})
watch(() => route.hash, () => { void focusLinkedCard() })
</script>
