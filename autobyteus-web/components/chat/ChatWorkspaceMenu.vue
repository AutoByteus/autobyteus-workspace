<template>
  <div ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      data-test="chat-workspace-trigger"
      class="inline-flex max-w-[15rem] items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] leading-5 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :class="popover.open.value ? 'bg-gray-100' : ''"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-label="$t('chat.workspace.triggerAria', { name: selectedName })"
      :title="selectedPath"
      @click="toggle"
    >
      <Icon icon="heroicons:folder" class="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
      <span class="truncate">{{ selectedName }}</span>
      <Icon icon="heroicons:chevron-down" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
    </button>

    <div v-if="popover.open.value && popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
    <div
      v-if="popover.open.value"
      ref="menuRef"
      data-test="chat-workspace-menu"
      class="z-50 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-lg"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2 max-h-[80vh]'
        : ['absolute left-0 w-96 max-w-[calc(100vw-1.5rem)]', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : { maxHeight: `${popover.maxHeight.value}px`, ...inBoundary.style.value }"
    >
      <div class="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2">
        <Icon icon="heroicons:magnifying-glass" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
        <input
          ref="searchRef"
          v-model="query"
          data-test="chat-workspace-search"
          type="text"
          class="w-full border-0 bg-transparent p-0 text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          :placeholder="$t('chat.workspace.search')"
          :aria-label="$t('chat.workspace.search')"
          @keydown.down.prevent="focusOption(0)"
          @keydown.enter="chooseFirstMatch"
        >
      </div>
      <div ref="listRef" role="listbox" :aria-label="$t('chat.workspace.menuAria')" class="min-h-0 flex-1 overflow-y-auto pb-1 pt-1.5" @keydown="onKeydown">
        <button
          v-if="tempVisible && tempWorkspace"
          type="button"
          role="option"
          data-option
          :aria-selected="isSelected(tempWorkspace.workspaceId) ? 'true' : 'false'"
          data-test="chat-workspace-option-temp"
          class="flex w-full items-start gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          @click="chooseExisting(tempWorkspace.workspaceId)"
        >
          <Icon icon="heroicons:folder" class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5 text-sm font-medium" :class="isSelected(tempWorkspace.workspaceId) ? 'text-blue-700' : 'text-gray-900'">
              <span class="truncate">{{ $t('chat.workspace.temp') }}</span>
              <span class="rounded bg-gray-100 px-1.5 py-px text-[0.625rem] font-medium uppercase tracking-wide text-gray-500">{{ $t('chat.workspace.defaultBadge') }}</span>
            </span>
            <span class="block truncate text-xs text-gray-500">{{ $t('chat.workspace.tempDescription') }}</span>
          </span>
          <Icon v-if="isSelected(tempWorkspace.workspaceId)" icon="heroicons:check" class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
        </button>

        <template v-if="filteredUserWorkspaces.length">
          <h4 class="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">{{ $t('chat.workspace.yourWorkspaces') }}</h4>
          <button
            v-for="item in filteredUserWorkspaces"
            :key="item.workspaceId"
            type="button"
            role="option"
            data-option
            :aria-selected="isSelected(item.workspaceId) ? 'true' : 'false'"
            :data-test="`chat-workspace-option-${item.workspaceId}`"
            class="flex w-full items-start gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            @click="chooseExisting(item.workspaceId)"
          >
            <Icon icon="heroicons:folder" class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium" :class="isSelected(item.workspaceId) ? 'text-blue-700' : 'text-gray-900'">{{ item.name }}</span>
              <span class="block truncate text-xs text-gray-500">{{ item.absolutePath }}</span>
            </span>
            <Icon v-if="isSelected(item.workspaceId)" icon="heroicons:check" class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
          </button>
        </template>

        <button
          v-if="pendingVisible && pendingFolder"
          type="button"
          role="option"
          data-option
          aria-selected="true"
          class="flex w-full items-start gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          @click="popover.close(true)"
        >
          <Icon icon="heroicons:folder-plus" class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-blue-700">{{ folderName(pendingFolder) }}</span>
            <span class="block truncate text-xs text-gray-500">{{ pendingFolder }}</span>
          </span>
          <Icon icon="heroicons:check" class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
        </button>

        <p v-if="noMatches" class="px-3 py-3 text-center text-[0.8125rem] text-gray-500" data-test="chat-workspace-search-empty">
          {{ $t('chat.workspace.noMatch', { query: query.trim() }) }}
        </p>
      </div>

      <form v-if="adding" class="space-y-2 border-t border-gray-100 px-3 py-2.5" data-test="chat-workspace-folder-form" @submit.prevent="confirmFolder">
        <label for="chat-workspace-path" class="text-xs font-medium text-gray-600">{{ $t('chat.workspace.folderPath') }}</label>
        <input
          id="chat-workspace-path"
          ref="pathRef"
          v-model="path"
          type="text"
          class="w-full rounded-md border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          :class="error ? 'border-red-300' : 'border-gray-200'"
          :aria-invalid="error ? 'true' : undefined"
          aria-describedby="chat-workspace-path-error"
          :placeholder="$t('chat.workspace.folderPlaceholder')"
          @keydown.esc.stop.prevent="adding = false"
        >
        <p v-if="error" id="chat-workspace-path-error" class="text-xs text-red-600" data-test="chat-workspace-path-error">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50" @click="adding = false">{{ $t('chat.workspace.cancel') }}</button>
          <button type="submit" class="rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">{{ $t('chat.workspace.useFolder') }}</button>
        </div>
      </form>
      <footer v-else class="border-t border-gray-100 p-1">
        <button type="button" data-test="chat-workspace-open-folder" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none" @click="startFolder">
          <Icon icon="heroicons:plus" class="h-4 w-4 text-gray-500" aria-hidden="true" /> {{ $t('chat.workspace.openAnotherFolder') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useWorkspaceStore } from '~/stores/workspace'
import { useMenuInBoundary } from '~/composables/popover/useMenuInBoundary'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import { isAbsoluteFolderPath } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'
import { filterWorkspaceOptions } from '~/components/chat/chatComposerMenus'

const props = withDefaults(defineProps<{
  workspace: RunWorkspaceChoice
  /** Run-settings rows open the menu where it fits. */
  placement?: 'above' | 'auto'
}>(), { placement: 'above' })
const emit = defineEmits<{ (event: 'select', value: RunWorkspaceChoice): void }>()

const { t } = useLocalization()
const workspaceStore = useWorkspaceStore()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const pathRef = ref<HTMLInputElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const popover = useAnchoredPopover(rootRef, triggerRef, 420, { placement: props.placement })
const menuRef = ref<HTMLElement | null>(null)
const inBoundary = useMenuInBoundary(menuRef, computed(() => popover.open.value), computed(() => !popover.narrow.value))
const adding = ref(false)
const path = ref('')
const error = ref('')
const query = ref('')

const tempWorkspace = computed(() => workspaceStore.tempWorkspace)
const userWorkspaces = computed(() => workspaceStore.allWorkspaces
  .filter((workspace) => !workspace.isTemp && workspace.workspaceId !== tempWorkspace.value?.workspaceId)
  .slice()
  .sort((left, right) => left.name.localeCompare(right.name)))

const folderName = (rootPath: string) => rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || rootPath
const pendingFolder = computed(() => (props.workspace.kind === 'folder' ? props.workspace.rootPath : null))
const matches = (candidates: { name: string; path: string }[]) => filterWorkspaceOptions(candidates, query.value).length > 0
const tempVisible = computed(() => !!tempWorkspace.value && matches([
  { name: t('chat.workspace.temp'), path: tempWorkspace.value.absolutePath ?? '' },
  { name: t('chat.workspace.tempDescription'), path: '' },
]))
const filteredUserWorkspaces = computed(() => filterWorkspaceOptions(
  userWorkspaces.value.map((workspace) => ({ name: workspace.name, path: workspace.absolutePath ?? '', workspace })),
  query.value,
).map((option) => option.workspace))
const pendingVisible = computed(() => !!pendingFolder.value && matches([{ name: folderName(pendingFolder.value), path: pendingFolder.value }]))
const noMatches = computed(() => !tempVisible.value && !filteredUserWorkspaces.value.length && !pendingVisible.value)
const isSelected = (workspaceId: string) => props.workspace.kind === 'existing' && props.workspace.workspaceId === workspaceId
const selectedName = computed(() => {
  if (props.workspace.kind === 'folder') return folderName(props.workspace.rootPath)
  const info = workspaceStore.workspaces[props.workspace.workspaceId]
  if (!info || info.isTemp || info.workspaceId === tempWorkspace.value?.workspaceId) return t('chat.workspace.temp')
  return info.name
})
const selectedPath = computed(() => (props.workspace.kind === 'folder'
  ? props.workspace.rootPath
  : workspaceStore.workspaces[props.workspace.workspaceId]?.absolutePath ?? ''))

const toggle = async () => {
  adding.value = false
  if (!popover.open.value) query.value = ''
  await popover.toggle()
  if (popover.open.value) {
    await nextTick()
    searchRef.value?.focus()
  }
}

const options = () => Array.from(listRef.value?.querySelectorAll<HTMLElement>('[data-option]') ?? [])
const focusOption = (index: number) => options()[index]?.focus()
const chooseFirstMatch = (event: KeyboardEvent) => {
  if (event.isComposing) return // Enter confirms an IME composition, not a pick.
  event.preventDefault()
  options()[0]?.click()
}

const chooseExisting = (workspaceId: string) => {
  emit('select', { kind: 'existing', workspaceId })
  popover.close(true)
}

const startFolder = async () => {
  adding.value = true
  path.value = ''
  error.value = ''
  await nextTick()
  pathRef.value?.focus()
}

const confirmFolder = () => {
  const rootPath = path.value.trim()
  if (!isAbsoluteFolderPath(rootPath)) {
    error.value = t('chat.workspace.absolutePathRequired')
    return
  }
  const existing = workspaceStore.findWorkspaceInfoByRootPath(rootPath)
  emit('select', existing ? { kind: 'existing', workspaceId: existing.workspaceId } : { kind: 'folder', rootPath })
  adding.value = false
  popover.close(true)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = options()
  const index = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  if (event.key === 'ArrowUp' && index <= 0) {
    searchRef.value?.focus()
    return
  }
  items[event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : index - 1]?.focus()
}
</script>
