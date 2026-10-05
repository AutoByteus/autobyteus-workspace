<template>
  <!-- REQ-019: the heading of New chat and of the Org launch page is one "what to run" switcher.
       Agents and Agent Teams start in New chat; an Agent Org (no recipient) on the Org launch page. -->
  <div ref="rootRef" class="relative flex max-w-full justify-center" data-test="run-target-switcher">
    <button
      ref="triggerRef"
      type="button"
      class="group inline-flex max-w-full items-center gap-3 rounded-xl px-3 py-1 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-default disabled:hover:bg-transparent"
      :class="open ? 'bg-gray-50' : ''"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="$t('chat.switch.aria', { name })"
      :disabled="disabled"
      data-test="run-target-switcher-trigger"
      @click="toggle"
    >
      <img v-if="avatarUrl" :src="avatarUrl" :alt="''" class="h-10 w-10 flex-shrink-0 rounded-full object-cover" data-test="run-target-avatar">
      <h1 class="min-w-0 break-words text-center text-[1.5rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[1.75rem]" data-test="run-target-name">{{ name }}</h1>
      <Icon
        v-if="!disabled"
        icon="heroicons:chevron-down"
        class="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-150 group-hover:text-gray-600 motion-reduce:transition-none"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="open"
      ref="menuRef"
      class="absolute left-1/2 top-full z-50 mt-2 flex w-[23rem] max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-gray-200 bg-white text-left shadow-lg"
      :style="{ transform: `translateX(calc(-50% + ${menuShift}px))` }"
      data-test="run-target-switcher-menu"
      @keydown="onKeydown"
    >
      <div class="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <Icon icon="heroicons:magnifying-glass" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
        <input
          ref="searchRef"
          v-model="query"
          type="text"
          class="w-full border-0 bg-transparent p-0 text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          :placeholder="$t('chat.switch.search')"
          :aria-label="$t('chat.switch.search')"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="open ? 'true' : 'false'"
          :aria-controls="listId"
          :aria-activedescendant="filtered.length ? `${listId}-option-${highlight}` : undefined"
          data-test="run-target-switcher-search"
        >
      </div>
      <ul :id="listId" role="listbox" :aria-label="$t('chat.switch.aria', { name })" class="max-h-72 min-h-0 overflow-y-auto p-1">
        <li v-if="!filtered.length" class="px-2 py-3 text-center text-[0.8125rem] text-gray-500" data-test="run-target-switcher-empty">
          {{ $t('chat.switch.noMatch') }}
        </li>
        <template v-for="(option, index) in filtered" :key="option.key">
          <li v-if="index === 0 || filtered[index - 1]!.kind !== option.kind" role="presentation" class="px-2 pb-0.5 pt-1.5 text-[0.6875rem] font-medium text-gray-400">
            {{ option.kind === 'org' ? $t('chat.switch.orgs') : option.kind === 'team' ? $t('chat.targets.teams') : $t('chat.targets.agents') }}
          </li>
          <li :id="`${listId}-option-${index}`" role="option" :aria-selected="option.key === currentKey ? 'true' : 'false'">
            <button
              type="button"
              tabindex="-1"
              :data-test="`run-target-switcher-option-${option.id}`"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left focus:outline-none"
              :class="index === highlight ? 'bg-gray-100' : 'hover:bg-gray-50'"
              @mouseenter="highlight = index"
              @mousedown.prevent
              @click="choose(option)"
            >
              <span
                class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center text-[0.5625rem] font-semibold text-slate-600"
                :class="option.kind === 'agent' ? 'rounded-full border border-emerald-200 bg-emerald-50' : 'rounded-md border border-gray-200 bg-gray-50'"
                aria-hidden="true"
              >
                <Icon v-if="option.kind === 'org'" icon="heroicons:building-office-2" class="h-3.5 w-3.5" />
                <span v-else>{{ option.initials }}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[0.8125rem] font-medium text-gray-900">{{ option.name }}</span>
                <span v-if="option.description" class="block truncate text-xs text-gray-500">{{ option.description }}</span>
              </span>
              <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <Icon v-if="option.key === currentKey" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
              </span>
            </button>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { initialsFor } from '~/components/chat/chatComposerMenus'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'

/** One entry in the switcher: an Agent, an Agent Team or an Agent Org. */
export type RunTargetChoice = Readonly<{ kind: 'agent' | 'team' | 'org'; definitionId: string }>
type RunTargetOption = { key: string; kind: RunTargetChoice['kind']; id: string; name: string; initials: string; description: string }

const props = withDefaults(defineProps<{
  name: string
  avatarUrl?: string | null
  /** `agent:<id>` / `team:<id>` / `org:<id>` of the current target. */
  currentKey: string
  /** While a run is starting. */
  disabled?: boolean
}>(), { avatarUrl: null, disabled: false })
const emit = defineEmits<{ (event: 'choose', choice: RunTargetChoice): void }>()

const { t } = useLocalization()
const agentStore = useAgentDefinitionStore()
const teamStore = useAgentTeamDefinitionStore()
const orgStore = useAgentOrgDefinitionStore()

const listId = `run-target-switcher-${useId()}`
const open = ref(false)
const query = ref('')
const highlight = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
/** Centered under the heading, nudged back inside the window on narrow screens. */
const menuShift = ref(0)

/** Agents (Daily Assistant first), Agent teams, Agent orgs. */
const options = computed<RunTargetOption[]>(() => {
  const dailyAssistant = agentStore.getAgentDefinitionById(DEFAULT_CHAT_AGENT_DEFINITION_ID)
  const agents = [
    ...(dailyAssistant ? [dailyAssistant] : []),
    ...agentStore.sharedAgentDefinitions.filter((definition) => definition.id !== DEFAULT_CHAT_AGENT_DEFINITION_ID),
  ]
  return [
    ...agents.map((definition) => ({
      key: `agent:${definition.id}`, kind: 'agent' as const, id: definition.id, name: definition.name,
      initials: initialsFor(definition.name), description: definition.description ?? '',
    })),
    ...teamStore.sharedAgentTeamDefinitions.map((team) => ({
      key: `team:${team.id}`, kind: 'team' as const, id: team.id, name: team.name, initials: initialsFor(team.name),
      description: t('chat.targets.teamDescription', { count: team.nodes.length, coordinator: team.coordinatorMemberName }),
    })),
    ...orgStore.definitions.map((org) => ({
      key: `org:${org.id}`, kind: 'org' as const, id: org.id, name: org.name, initials: initialsFor(org.name),
      description: org.description ?? '',
    })),
  ]
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? options.value.filter((option) => option.name.toLowerCase().includes(q) || option.id.toLowerCase().includes(q)) : options.value
})
watch(query, () => { highlight.value = 0 })

const placeMenu = () => {
  const rect = menuRef.value?.getBoundingClientRect()
  if (!rect) return
  const margin = 8
  let shift = 0
  if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right
  if (rect.left + shift < margin) shift = margin - rect.left
  menuShift.value = shift
}

const onDocumentPointer = (event: PointerEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close(false)
}
const toggle = async () => {
  if (open.value) { close(true); return }
  query.value = ''
  menuShift.value = 0
  open.value = true
  document.addEventListener('pointerdown', onDocumentPointer)
  await nextTick()
  // Start on the current target.
  highlight.value = Math.max(0, filtered.value.findIndex((option) => option.key === props.currentKey))
  placeMenu()
  searchRef.value?.focus()
}
const close = (returnFocus: boolean) => {
  open.value = false
  document.removeEventListener('pointerdown', onDocumentPointer)
  if (returnFocus) void nextTick(() => triggerRef.value?.focus())
}
const choose = (option: RunTargetOption) => {
  close(false)
  if (option.key !== props.currentKey) emit('choose', { kind: option.kind, definitionId: option.id })
}
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
  if (!filtered.value.length) return
  if (event.key === 'ArrowDown') { event.preventDefault(); highlight.value = (highlight.value + 1) % filtered.value.length }
  else if (event.key === 'ArrowUp') { event.preventDefault(); highlight.value = (highlight.value - 1 + filtered.value.length) % filtered.value.length }
  else if (event.key === 'Enter') {
    event.preventDefault()
    const option = filtered.value[highlight.value]
    if (option) choose(option)
  }
}

onMounted(() => {
  if (!agentStore.agentDefinitions.length) void agentStore.fetchAllAgentDefinitions().catch(() => undefined)
  if (!teamStore.agentTeamDefinitions.length) void teamStore.fetchAllAgentTeamDefinitions().catch(() => undefined)
  void orgStore.fetchAll().catch(() => undefined)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>
