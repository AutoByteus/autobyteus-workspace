<template>
  <div
    data-test="chat-skill-menu"
    class="flex min-h-0 w-[23rem] max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-gray-200 bg-white text-left shadow-lg"
  >
    <p class="border-b border-gray-100 px-3 py-1.5 text-[0.6875rem] text-gray-400">
      {{ $t('chat.skills.headerPrefix') }} <span class="font-medium text-gray-600">/{{ query }}</span> · {{ $t('chat.skills.headerHint') }}
    </p>
    <ul :id="listId" role="listbox" :aria-label="$t('chat.skills.listAria')" class="max-h-64 min-h-0 overflow-y-auto p-1">
      <li v-if="!skills.length" class="px-2 py-3 text-center text-[0.8125rem] text-gray-500" data-test="chat-skill-menu-empty">
        {{ hasAnySkills ? $t('chat.skills.noMatch') : $t('chat.skills.noSkills') }}
      </li>
      <li
        v-for="(skill, index) in skills"
        :id="`${listId}-option-${index}`"
        :key="skill.name"
        role="option"
        :aria-selected="index === highlight ? 'true' : 'false'"
      >
        <button
          type="button"
          tabindex="-1"
          :data-test="`chat-skill-option-${skill.name}`"
          class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left focus:outline-none"
          :class="index === highlight ? 'bg-gray-100' : 'hover:bg-gray-50'"
          @mouseenter="emit('highlight', index)"
          @mousedown.prevent
          @click="emit('choose', skill.name)"
        >
          <Icon icon="heroicons:sparkles" class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[0.8125rem] font-medium text-gray-900">{{ skill.name }}</span>
            <span class="block truncate text-xs text-gray-500">{{ skill.description }}</span>
          </span>
          <Icon v-if="selected.includes(skill.name)" icon="heroicons:check" class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <footer class="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400">
      <span>{{ allInstalled ? $t('chat.skills.allAvailable') : $t('chat.skills.agentSkills') }}</span>
      <NuxtLink to="/skills" class="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700 hover:underline" @mousedown.prevent>
        {{ $t('chat.skills.manage') }} <Icon icon="heroicons:arrow-right" class="h-3 w-3" aria-hidden="true" />
      </NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { SkillTagOption } from '~/utils/skills/skillTagMenu'

defineProps<{
  listId: string
  query: string
  skills: SkillTagOption[]
  hasAnySkills: boolean
  selected: readonly string[]
  highlight: number
  /** The addressed agent uses all installed skills. */
  allInstalled: boolean
}>()
const emit = defineEmits<{
  (event: 'choose', name: string): void
  (event: 'highlight', index: number): void
}>()
</script>
