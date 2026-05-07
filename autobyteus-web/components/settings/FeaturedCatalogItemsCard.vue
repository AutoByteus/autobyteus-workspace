<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="featured-catalog-items-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.components.settings.FeaturedCatalogItemsCard.title') }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ t('settings.components.settings.FeaturedCatalogItemsCard.description') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" :class="secondaryButtonClass" :disabled="isBusy" data-testid="featured-catalog-add-agent" @click="addRow('AGENT')">
          <Icon icon="heroicons:plus" class="h-4 w-4" />
          <span>{{ t('settings.components.settings.FeaturedCatalogItemsCard.addAgent') }}</span>
        </button>
        <button type="button" :class="secondaryButtonClass" :disabled="isBusy" data-testid="featured-catalog-add-team" @click="addRow('AGENT_TEAM')">
          <Icon icon="heroicons:plus" class="h-4 w-4" />
          <span>{{ t('settings.components.settings.FeaturedCatalogItemsCard.addTeam') }}</span>
        </button>
        <button type="button" :class="iconSaveButtonClass" :disabled="!canSave" data-testid="featured-catalog-save" :aria-label="t('settings.components.settings.FeaturedCatalogItemsCard.save')" :title="t('settings.components.settings.FeaturedCatalogItemsCard.save')" @click="saveRows">
          <span v-if="isSaving" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-700"></span>
          <Icon v-else icon="heroicons:check" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="loadError" class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ loadError }}
    </div>
    <div v-if="parseWarning" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {{ t('settings.components.settings.FeaturedCatalogItemsCard.invalidSettingWarning') }} {{ parseWarning }}
    </div>

    <div v-if="rows.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {{ t('settings.components.settings.FeaturedCatalogItemsCard.emptyState') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(row, index) in rows"
        :key="row.id"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        :data-testid="`featured-catalog-row-${index}`"
      >
        <div class="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <select
            v-model="row.resourceKind"
            class="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:col-span-3"
            :aria-label="t('settings.components.settings.FeaturedCatalogItemsCard.resourceKind')"
            @change="onKindChanged(row)"
          >
            <option value="AGENT">{{ t('settings.components.settings.FeaturedCatalogItemsCard.kindAgent') }}</option>
            <option value="AGENT_TEAM">{{ t('settings.components.settings.FeaturedCatalogItemsCard.kindTeam') }}</option>
          </select>

          <select
            v-model="row.definitionId"
            class="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:col-span-6"
            :aria-label="row.resourceKind === 'AGENT' ? t('settings.components.settings.FeaturedCatalogItemsCard.selectAgent') : t('settings.components.settings.FeaturedCatalogItemsCard.selectTeam')"
          >
            <option value="">{{ row.resourceKind === 'AGENT' ? t('settings.components.settings.FeaturedCatalogItemsCard.selectAgent') : t('settings.components.settings.FeaturedCatalogItemsCard.selectTeam') }}</option>
            <option v-if="isUnresolved(row)" :value="row.definitionId">
              {{ t('settings.components.settings.FeaturedCatalogItemsCard.unresolvedDefinition', { id: row.definitionId }) }}
            </option>
            <option v-for="option in getOptions(row.resourceKind)" :key="option.id" :value="option.id">
              {{ option.name }}
            </option>
          </select>

          <div class="flex justify-end gap-1 md:col-span-3">
            <button type="button" :class="iconActionButtonClass" :disabled="index === 0" :aria-label="t('settings.components.settings.FeaturedCatalogItemsCard.moveUp')" :title="t('settings.components.settings.FeaturedCatalogItemsCard.moveUp')" @click="moveRow(index, -1)">
              <Icon icon="heroicons:arrow-up" class="h-4 w-4" />
            </button>
            <button type="button" :class="iconActionButtonClass" :disabled="index === rows.length - 1" :aria-label="t('settings.components.settings.FeaturedCatalogItemsCard.moveDown')" :title="t('settings.components.settings.FeaturedCatalogItemsCard.moveDown')" @click="moveRow(index, 1)">
              <Icon icon="heroicons:arrow-down" class="h-4 w-4" />
            </button>
            <button type="button" :class="iconRemoveButtonClass" :aria-label="t('settings.components.settings.FeaturedCatalogItemsCard.remove')" :title="t('settings.components.settings.FeaturedCatalogItemsCard.remove')" @click="removeRow(row.id)">
              <Icon icon="heroicons:trash" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-3 min-h-5 text-sm">
      <p v-if="validationMessage" class="text-red-600">{{ validationMessage }}</p>
      <p v-else-if="hasChanges" class="text-slate-500">{{ t('settings.components.settings.FeaturedCatalogItemsCard.unsavedChanges') }}</p>
      <p v-else class="text-slate-400">{{ t('settings.components.settings.FeaturedCatalogItemsCard.currentCount', { count: rows.length }) }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useServerSettingsStore } from '~/stores/serverSettings'
import {
  FEATURED_CATALOG_ITEMS_SETTING_KEY, parseFeaturedCatalogItemsSetting,
  serializeFeaturedCatalogItemsSetting, validateFeaturedCatalogItems,
  type FeaturedCatalogItem, type FeaturedCatalogResourceKind,
} from '~/utils/catalog/featuredCatalogItems'

interface DefinitionOption {
  id: string
  name: string
}

interface DraftRow {
  id: string
  resourceKind: FeaturedCatalogResourceKind
  definitionId: string
}

const { t } = useLocalization()
const settingsStore = useServerSettingsStore()
const agentStore = useAgentDefinitionStore()
const teamStore = useAgentTeamDefinitionStore()

const rows = ref<DraftRow[]>([])
const originalSerialized = ref(serializeFeaturedCatalogItemsSetting([]))
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const parseWarning = ref<string | null>(null)

const secondaryButtonClass = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
const iconActionButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300'
const iconSaveButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-700 transition-colors hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
const iconRemoveButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition-colors hover:border-red-100 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

const createRowId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const currentSettingValue = computed(() => (
  settingsStore.getSettingByKey(FEATURED_CATALOG_ITEMS_SETTING_KEY)?.value ?? null
))

const sortedAgentOptions = computed<DefinitionOption[]>(() => (
  agentStore.agentDefinitions
    .map((definition) => ({ id: definition.id, name: definition.name || definition.id }))
    .sort((left, right) => left.name.localeCompare(right.name))
))

const sortedTeamOptions = computed<DefinitionOption[]>(() => (
  teamStore.agentTeamDefinitions
    .map((definition) => ({ id: definition.id, name: definition.name || definition.id }))
    .sort((left, right) => left.name.localeCompare(right.name))
))

const draftItems = computed<FeaturedCatalogItem[]>(() => rows.value.map((row, index) => ({
  resourceKind: row.resourceKind,
  definitionId: row.definitionId.trim(),
  sortOrder: (index + 1) * 10,
})))

const serializedRows = computed(() => serializeFeaturedCatalogItemsSetting(draftItems.value))
const validationErrors = computed(() => validateFeaturedCatalogItems(draftItems.value))
const validationMessage = computed(() => {
  if (validationErrors.value.length === 0) return ''
  const hasEmpty = draftItems.value.some((item) => !item.definitionId.trim())
  return hasEmpty
    ? t('settings.components.settings.FeaturedCatalogItemsCard.emptyDefinitionError')
    : t('settings.components.settings.FeaturedCatalogItemsCard.duplicateError')
})
const hasChanges = computed(() => serializedRows.value !== originalSerialized.value)
const isBusy = computed(() => isSaving.value || settingsStore.isUpdating)
const canSave = computed(() => hasChanges.value && validationErrors.value.length === 0 && !isBusy.value)

const getOptions = (kind: FeaturedCatalogResourceKind): DefinitionOption[] => (
  kind === 'AGENT' ? sortedAgentOptions.value : sortedTeamOptions.value
)

const isUnresolved = (row: DraftRow): boolean => (
  Boolean(row.definitionId.trim()) && !getOptions(row.resourceKind).some((option) => option.id === row.definitionId)
)

const firstUnusedDefinitionId = (kind: FeaturedCatalogResourceKind): string => {
  const usedIds = new Set(rows.value.filter((row) => row.resourceKind === kind).map((row) => row.definitionId))
  return getOptions(kind).find((option) => !usedIds.has(option.id))?.id ?? ''
}

const applySettingValue = (rawValue: string | null) => {
  const parsed = parseFeaturedCatalogItemsSetting(rawValue)
  parseWarning.value = parsed.ok ? null : parsed.error
  rows.value = parsed.setting.items.map((item) => ({
    id: createRowId(),
    resourceKind: item.resourceKind,
    definitionId: item.definitionId,
  }))
  originalSerialized.value = parsed.ok ? serializeFeaturedCatalogItemsSetting(parsed.setting.items) : (rawValue ?? '')
}

const addRow = (kind: FeaturedCatalogResourceKind) => {
  rows.value.push({
    id: createRowId(),
    resourceKind: kind,
    definitionId: firstUnusedDefinitionId(kind),
  })
}

const removeRow = (rowId: string) => {
  rows.value = rows.value.filter((row) => row.id !== rowId)
}

const moveRow = (index: number, direction: -1 | 1) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= rows.value.length) return
  const nextRows = [...rows.value]
  const [row] = nextRows.splice(index, 1)
  nextRows.splice(targetIndex, 0, row)
  rows.value = nextRows
}

const onKindChanged = (row: DraftRow) => {
  if (!getOptions(row.resourceKind).some((option) => option.id === row.definitionId)) {
    row.definitionId = firstUnusedDefinitionId(row.resourceKind)
  }
}

const saveRows = async () => {
  if (!canSave.value) return

  isSaving.value = true
  loadError.value = null
  try {
    await settingsStore.updateServerSetting(FEATURED_CATALOG_ITEMS_SETTING_KEY, serializedRows.value)
    originalSerialized.value = serializedRows.value
  } catch (error: any) {
    loadError.value = error?.message || t('settings.components.settings.FeaturedCatalogItemsCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}

watch(currentSettingValue, (rawValue) => {
  if (!hasChanges.value) {
    applySettingValue(rawValue)
  }
}, { immediate: true })

onMounted(async () => {
  try {
    await Promise.all([
      settingsStore.fetchServerSettings(),
      agentStore.fetchAllAgentDefinitions(),
      teamStore.fetchAllAgentTeamDefinitions(),
    ])
  } catch (error: any) {
    loadError.value = error?.message || t('settings.components.settings.FeaturedCatalogItemsCard.loadFailed')
  }
})
</script>
