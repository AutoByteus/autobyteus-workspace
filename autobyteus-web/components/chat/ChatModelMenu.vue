<template>
  <div ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      data-test="chat-model-trigger"
      class="inline-flex max-w-[20rem] items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :class="['hover:bg-gray-100', popover.open.value ? 'bg-gray-100' : '']"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      aria-haspopup="menu"
      :aria-label="$t('chat.model.triggerAria', { model: modelLabel, runtime: runtimeLabel })"
      :title="`${modelLabel} · ${runtimeLabel}`"
      @click="onToggle"
    >
      <span class="truncate whitespace-nowrap font-medium text-gray-800">{{ modelLabel || $t('chat.model.chooseModel') }}</span>
      <span class="truncate whitespace-nowrap text-gray-400 max-sm:hidden">{{ runtimeShortLabel }}</span>
      <Icon icon="heroicons:chevron-down" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
    </button>

    <div v-if="popover.open.value && popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>

    <div
      v-if="popover.open.value"
      ref="menuRef"
      role="menu"
      :aria-label="$t('chat.model.menuAria')"
      data-test="chat-model-menu"
      class="z-50 flex flex-col rounded-lg border border-gray-200 bg-white text-left shadow-lg"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2 max-h-[80vh]'
        : ['absolute right-0 w-[19rem] max-w-[calc(100vw-1rem)]', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : { maxHeight: `${popover.maxHeight.value}px` }"
      @keydown="onMenuKeydown"
    >
      <button
        v-if="drilledRuntime"
        type="button"
        data-row
        data-test="chat-model-drill-back"
        class="flex items-center gap-1.5 rounded-t-lg border-b border-gray-100 px-3 py-2 text-left text-[0.8125rem] font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
        @click="closeSubmenu(true)"
      >
        <Icon icon="heroicons:chevron-left" class="h-3.5 w-3.5 text-gray-400" aria-hidden="true" /> {{ runtimeLabelFor(drilledRuntime) }}
      </button>

      <div v-else class="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <Icon icon="heroicons:magnifying-glass" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
        <input
          ref="searchRef"
          v-model="query"
          data-test="chat-model-search"
          type="text"
          class="w-full border-0 bg-transparent p-0 text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          :placeholder="$t('chat.model.search')"
          :aria-label="$t('chat.model.search')"
          @keydown.down.prevent="focusRow(0)"
        >
      </div>

      <!-- Browsing runtimes must not clip the side submenu (so the menu root has no overflow); lists scroll. -->
      <div class="min-h-0 p-1" :class="query.trim() || drilledRuntime ? 'max-h-[22rem] overflow-y-auto' : ''">
        <!-- Narrow drill-in: one runtime's models -->
        <ChatModelList
          v-if="drilledRuntime"
          :runtime-kind="drilledRuntime"
          :state="catalog.catalogState(drilledRuntime)"
          :groups="catalog.modelGroups(drilledRuntime)"
          :current-model-identifier="drilledRuntime === runtimeKind ? llmModelIdentifier : null"
          @choose="choose"
          @retry="catalog.ensureCatalog(drilledRuntime)"
        />

        <!-- Search -->
        <template v-else-if="query.trim()">
          <p v-if="!searchResults.length && !searchLoading" class="px-2 py-3 text-center text-[0.8125rem] text-gray-500" data-test="chat-model-search-empty">{{ $t('chat.model.noMatch', { query: query.trim() }) }}</p>
          <button
            v-for="model in searchResults"
            :key="`${model.runtimeKind}:${model.llmModelIdentifier}`"
            type="button"
            role="menuitemradio"
            data-row
            :aria-checked="isCurrent(model) ? 'true' : 'false'"
            :data-test="`chat-model-search-option-${model.llmModelIdentifier}`"
            :title="optionFullText(model)"
            :aria-label="optionFullText(model)"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            @click="choose(model)"
          >
            <ChatModelOptionLabel :option="model" />
            <span class="flex-shrink-0 whitespace-nowrap text-xs text-gray-400">{{ runtimeShortLabelFor(model.runtimeKind) }}</span>
            <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <Icon v-if="isCurrent(model)" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
            </span>
          </button>
          <p v-if="searchLoading" class="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400 motion-reduce:animate-none" aria-hidden="true"></span>
            {{ $t('chat.model.searchingAll') }}
          </p>
        </template>

        <!-- Browse runtimes -->
        <template v-else>
          <p class="px-2 pb-0.5 pt-1.5 text-[0.6875rem] font-medium text-gray-400">{{ $t('chat.model.runtimes') }}</p>
          <div
            v-for="runtime in catalog.runtimes.value"
            :key="runtime.runtimeKind"
            class="relative"
            @mouseenter="!popover.narrow.value && (runtime.enabled ? openSubmenu(runtime.runtimeKind, false) : closeSubmenu(false))"
          >
            <button
              type="button"
              role="menuitem"
              data-row
              aria-haspopup="menu"
              :aria-expanded="submenuRuntime === runtime.runtimeKind ? 'true' : 'false'"
              :aria-disabled="runtime.enabled ? undefined : 'true'"
              :data-runtime="runtime.runtimeKind"
              :data-test="`chat-runtime-${runtime.runtimeKind}`"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] focus:outline-none"
              :class="[
                runtime.enabled ? 'text-gray-900 hover:bg-gray-100 focus:bg-gray-100' : 'cursor-default text-gray-400',
                submenuRuntime === runtime.runtimeKind ? 'bg-gray-100' : '',
              ]"
              :title="runtime.enabled ? undefined : (runtime.reason || $t('chat.model.notInstalled'))"
              @click="runtime.enabled && openSubmenu(runtime.runtimeKind, true)"
            >
              <span class="min-w-0 flex-1 truncate">{{ runtime.label }}</span>
              <span v-if="runtime.runtimeKind === runtimeKind" class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" :aria-label="$t('chat.model.currentRuntime')"></span>
              <template v-if="runtime.enabled">
                <span v-if="catalog.catalogState(runtime.runtimeKind) === 'ready'" class="flex-shrink-0 text-xs tabular-nums text-gray-400">{{ catalog.modelCount(runtime.runtimeKind) }}</span>
                <Icon icon="heroicons:chevron-right" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              </template>
              <span v-else class="flex-shrink-0 text-xs text-gray-400" data-test="chat-runtime-not-installed">{{ $t('chat.model.notInstalled') }}</span>
            </button>

            <!-- Desktop side submenu -->
            <div
              v-if="submenuRuntime === runtime.runtimeKind && !popover.narrow.value"
              role="menu"
              :aria-label="$t('chat.model.runtimeModelsAria', { runtime: runtime.label })"
              class="absolute z-50 w-[17rem] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
              :class="flyoutSide === 'left' ? 'right-full mr-1.5' : 'left-full ml-1.5'"
              :style="{ bottom: `-${FLYOUT_ROW_OVERHANG_PX}px` }"
              data-test="chat-model-submenu"
              @keydown.left.stop.prevent="closeSubmenu(true)"
            >
              <div class="overflow-y-auto" :style="{ maxHeight: `${flyoutListMaxHeight}px` }">
                <ChatModelList
                  :runtime-kind="runtime.runtimeKind"
                  :state="catalog.catalogState(runtime.runtimeKind)"
                  :groups="catalog.modelGroups(runtime.runtimeKind)"
                  :current-model-identifier="runtime.runtimeKind === runtimeKind ? llmModelIdentifier : null"
                  @choose="choose"
                  @retry="catalog.ensureCatalog(runtime.runtimeKind)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ChatModelList from '~/components/chat/ChatModelList.vue'
import ChatModelOptionLabel from '~/components/chat/ChatModelOptionLabel.vue'
import { chatModelOptionFullText as optionFullText } from '~/components/chat/chatModelOptionText'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useChatModelCatalog, type ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import type { ChatModelSelection } from '~/stores/chatDraftStore'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { runtimeShortLabel as toRuntimeShortLabel } from '~/utils/chat/chatDefaults'

const props = defineProps<{
  runtimeKind: string
  llmModelIdentifier: string
  modelLabel: string
}>()
const emit = defineEmits<{
  (event: 'select', value: ChatModelSelection): void
}>()

const SUBMENU_HOVER_INTENT_MS = 90
const FLYOUT_LIST_MAX_PX = 320
/** The side submenu is bottom-aligned with its runtime row and hangs this far below it. */
const FLYOUT_ROW_OVERHANG_PX = 5
const FLYOUT_VIEWPORT_MARGIN_PX = 12
/** The submenu's own vertical padding and border around its list. */
const FLYOUT_CHROME_PX = 10
const catalog = useChatModelCatalog()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const popover = useAnchoredPopover(rootRef, triggerRef, 360, { placement: 'above' })
const query = ref('')
const submenuRuntime = ref<string | null>(null)
const flyoutSide = ref<'left' | 'right'>('right')
const flyoutListMaxHeight = ref(FLYOUT_LIST_MAX_PX)
const drilledRuntime = computed(() => (popover.narrow.value ? submenuRuntime.value : null))

const runtimeLabelFor = (runtimeKind: string) => runtimeKindToLabel(runtimeKind)
const runtimeShortLabelFor = (runtimeKind: string) => toRuntimeShortLabel(runtimeKind)
const runtimeLabel = computed(() => runtimeLabelFor(props.runtimeKind))
const runtimeShortLabel = computed(() => runtimeShortLabelFor(props.runtimeKind))
const isCurrent = (model: ChatModelOption) =>
  model.runtimeKind === props.runtimeKind && model.llmModelIdentifier === props.llmModelIdentifier

const onToggle = async () => {
  if (!popover.open.value) {
    query.value = ''
    submenuRuntime.value = null
    void catalog.ensureAvailability()
    if (props.runtimeKind) catalog.ensureCatalog(props.runtimeKind)
  }
  await popover.toggle()
  if (popover.open.value) {
    await nextTick()
    searchRef.value?.focus()
  }
}

let hoverTimer: ReturnType<typeof setTimeout> | null = null
const clearHoverTimer = () => {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
}
const openSubmenu = (runtimeKind: string, immediate: boolean) => {
  clearHoverTimer()
  const apply = async () => {
    const menu = menuRef.value
    if (menu) {
      const rect = menu.getBoundingClientRect()
      flyoutSide.value = rect.right + 290 > window.innerWidth ? 'left' : 'right'
      const row = menu.querySelector<HTMLElement>(`[data-runtime="${runtimeKind}"]`)
      // The submenu grows upward from its row, so its list is limited by the space above that row.
      const rowBottom = row?.getBoundingClientRect().bottom ?? rect.bottom
      const spaceAbove = rowBottom + FLYOUT_ROW_OVERHANG_PX - FLYOUT_VIEWPORT_MARGIN_PX - FLYOUT_CHROME_PX
      flyoutListMaxHeight.value = Math.max(0, Math.min(FLYOUT_LIST_MAX_PX, Math.floor(spaceAbove)))
    }
    submenuRuntime.value = runtimeKind
    catalog.ensureCatalog(runtimeKind)
    if (immediate) {
      await nextTick()
      focusFirstInSubmenu()
    }
  }
  if (immediate || submenuRuntime.value === null) void apply()
  else hoverTimer = setTimeout(apply, SUBMENU_HOVER_INTENT_MS)
}
const closeSubmenu = (refocus: boolean) => {
  clearHoverTimer()
  const previous = submenuRuntime.value
  submenuRuntime.value = null
  if (refocus && previous) {
    void nextTick(() => menuRef.value?.querySelector<HTMLElement>(`[data-runtime="${previous}"]`)?.focus())
  }
}

const choose = (model: ChatModelOption) => {
  emit('select', { runtimeKind: model.runtimeKind, llmModelIdentifier: model.llmModelIdentifier })
  popover.close(true)
}

// Search across enabled runtimes.
const searchRuntimeKinds = computed(() => catalog.enabledRuntimeKinds.value)
watch(query, (value) => {
  if (value.trim()) searchRuntimeKinds.value.forEach((runtimeKind) => catalog.ensureCatalog(runtimeKind))
})
const searchLoading = computed(() => catalog.isSearching(searchRuntimeKinds.value))
const searchResults = computed<ChatModelOption[]>(() => catalog.search(query.value, searchRuntimeKinds.value))

// Keyboard: arrows move within the current level; Right opens a runtime; Left returns.
const SUBMENU_SELECTOR = '[data-test="chat-model-submenu"]'
const rows = () => Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[data-row]:not([aria-disabled="true"])') ?? [])
  .filter((element) => !element.closest(SUBMENU_SELECTOR))
const focusRow = (index: number) => rows()[index]?.focus()
const focusFirstInSubmenu = () => {
  const scope = menuRef.value?.querySelector<HTMLElement>(SUBMENU_SELECTOR) ?? menuRef.value
  scope?.querySelector<HTMLElement>('[role="menuitemradio"], [data-row]')?.focus()
}
const onMenuKeydown = (event: KeyboardEvent) => {
  const active = document.activeElement as HTMLElement | null
  if (event.key === 'ArrowRight' && active?.dataset.runtime && active.getAttribute('aria-disabled') !== 'true') {
    event.preventDefault()
    openSubmenu(active.dataset.runtime, true)
    return
  }
  if (event.key === 'ArrowLeft' && drilledRuntime.value) {
    event.preventDefault()
    closeSubmenu(true)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const submenu = active?.closest<HTMLElement>(SUBMENU_SELECTOR)
  const scope = submenu ? Array.from(submenu.querySelectorAll<HTMLElement>('[data-row]')) : rows()
  const index = scope.indexOf(active as HTMLElement)
  if (index === -1) return
  event.preventDefault()
  const next = event.key === 'ArrowDown' ? Math.min(scope.length - 1, index + 1) : index - 1
  if (next < 0 && !submenu) searchRef.value?.focus()
  else scope[Math.max(0, next)]?.focus()
}

onBeforeUnmount(clearHoverTimer)
</script>
