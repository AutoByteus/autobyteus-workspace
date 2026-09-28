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
      data-test="chat-workspace-menu"
      class="z-50 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-lg"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2 max-h-[80vh]'
        : ['absolute left-0 w-96 max-w-[calc(100vw-1.5rem)]', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : { maxHeight: `${popover.maxHeight.value}px` }"
    >
      <div ref="listRef" role="listbox" :aria-label="$t('chat.workspace.menuAria')" class="min-h-0 flex-1 overflow-y-auto pb-1 pt-1.5" @keydown="onKeydown">
        <button
          v-if="tempWorkspace"
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

        <template v-if="userWorkspaces.length">
          <h4 class="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">{{ $t('chat.workspace.yourWorkspaces') }}</h4>
          <button
            v-for="item in userWorkspaces"
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
          v-if="pendingFolder"
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
import { useChatPopover } from '~/composables/chat/useChatPopover'
import { useWorkspaceStore } from '~/stores/workspace'
import type { ChatDraftWorkspace } from '~/stores/chatDraftStore'
import { isAbsoluteFolderPath } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{ workspace: ChatDraftWorkspace }>()
const emit = defineEmits<{ (event: 'select', value: ChatDraftWorkspace): void }>()

const { t } = useLocalization()
const workspaceStore = useWorkspaceStore()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const pathRef = ref<HTMLInputElement | null>(null)
const popover = useChatPopover(rootRef, triggerRef, 420)
const adding = ref(false)
const path = ref('')
const error = ref('')

const tempWorkspace = computed(() => workspaceStore.tempWorkspace)
const userWorkspaces = computed(() => workspaceStore.allWorkspaces
  .filter((workspace) => !workspace.isTemp && workspace.workspaceId !== tempWorkspace.value?.workspaceId)
  .slice()
  .sort((left, right) => left.name.localeCompare(right.name)))

const folderName = (rootPath: string) => rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || rootPath
const pendingFolder = computed(() => (props.workspace.kind === 'folder' ? props.workspace.rootPath : null))
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
  await popover.toggle()
  if (popover.open.value) {
    await nextTick()
    listRef.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
      ?? listRef.value?.querySelector<HTMLElement>('[data-option]')?.focus()
  }
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
  const options = Array.from(listRef.value?.querySelectorAll<HTMLElement>('[data-option]') ?? [])
  const index = options.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  const next = event.key === 'ArrowDown' ? Math.min(options.length - 1, index + 1) : Math.max(0, index - 1)
  options[next]?.focus()
}
</script>
