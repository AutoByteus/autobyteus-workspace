<template>
  <div class="w-full" data-test="run-members-line" :data-open="open ? 'true' : 'false'">
    <!-- One quiet line under the message box or the Org card (REQ-002). -->
    <p class="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-xs text-gray-400 [&>*]:whitespace-nowrap" data-test="run-members-line-text">
      <template v-if="customizedCount">
        <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" aria-hidden="true"></span>
        <span class="text-gray-600">{{ $t('runSettings.chat.customizedMembers', { count: customizedCount, total: memberCount }) }}</span>
        <span aria-hidden="true">·</span>
        <button ref="triggerRef" type="button" class="font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40" aria-haspopup="dialog" :aria-expanded="open ? 'true' : 'false'" data-test="run-members-open" @click="toggle">
          {{ $t('runSettings.chat.edit') }}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" class="font-medium text-gray-500 hover:text-gray-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40" data-test="run-members-reset" @click="emit('reset-all')">
          {{ $t('runSettings.chat.reset') }}
        </button>
      </template>
      <template v-else>
        <Icon icon="heroicons:user-group" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span>{{ $t('runSettings.chat.allMembers', { count: memberCount }) }}</span>
        <span aria-hidden="true">·</span>
        <button ref="triggerRef" type="button" class="font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40" aria-haspopup="dialog" :aria-expanded="open ? 'true' : 'false'" data-test="run-members-open" @click="toggle">
          {{ $t('runSettings.chat.customize') }}
        </button>
      </template>
    </p>

    <RunMemberSettingsDrawer
      :open="open"
      :subject-kind="subjectKind"
      :subject-name="subjectName"
      :nodes="nodes"
      @close="close"
      @change="(key, change) => emit('change', key, change)"
      @reset="(key, reset) => emit('reset', key, reset)"
      @reset-all="emit('reset-all')"
      @layout="onDrawerLayout"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { RunMemberSettingChange, RunMemberSettingReset } from '~/types/runSettings/RunSettings'
import { countAgentMembers, countCustomizedMembers, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import RunMemberSettingsDrawer from './RunMemberSettingsDrawer.vue'

/**
 * Member customization for a Team New chat and the Org launch page: one line that opens the Member
 * settings drawer. The page pads by the drawer's width on wide screens (`layout`).
 */
const props = defineProps<{
  subjectKind: 'team' | 'org'
  subjectName: string
  nodes: readonly RunMemberNode[]
}>()

const emit = defineEmits<{
  (event: 'change', key: string, change: RunMemberSettingChange): void
  (event: 'reset', key: string, reset: RunMemberSettingReset): void
  (event: 'reset-all'): void
  (event: 'layout', value: { open: boolean; width: number; resizing: boolean }): void
}>()

const open = ref(false)
const width = ref(0)
const resizing = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const memberCount = computed(() => countAgentMembers(props.nodes))
const customizedCount = computed(() => countCustomizedMembers(props.nodes))

const publish = () => emit('layout', { open: open.value, width: width.value, resizing: resizing.value })
const onDrawerLayout = (value: { width: number; resizing: boolean }) => {
  width.value = value.width
  resizing.value = value.resizing
  publish()
}
const toggle = () => {
  if (open.value) { close(); return }
  open.value = true
  publish()
}
const close = () => {
  open.value = false
  publish()
  void nextTick(() => triggerRef.value?.focus())
}
onBeforeUnmount(() => {
  open.value = false
  publish()
})
</script>
