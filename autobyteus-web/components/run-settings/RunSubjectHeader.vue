<template>
  <!-- One line: icon, name and a status badge; run actions (the stop icon) follow the badge. -->
  <div class="mb-5 flex items-center gap-3" data-test="run-subject-header">
    <span
      class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600"
      aria-hidden="true"
    >
      <Icon v-if="kind === 'org'" icon="heroicons:building-office-2" class="h-[1.125rem] w-[1.125rem]" />
      <Icon v-else-if="kind === 'team'" icon="heroicons:user-group" class="h-[1.125rem] w-[1.125rem]" />
      <template v-else>{{ initialsFor(name) }}</template>
    </span>
    <div class="flex min-w-0 items-center gap-2">
      <h2 class="truncate text-[0.9375rem] font-semibold leading-5 text-gray-900" data-test="run-subject-name">{{ name }}</h2>
      <span
        class="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[0.6875rem] font-medium"
        :class="status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'"
        data-test="run-subject-status"
        :data-status="status"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'" aria-hidden="true"></span>
        {{ status === 'active' ? $t('runSettings.status.active') : $t('runSettings.status.stopped') }}
      </span>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { initialsFor } from '~/components/chat/chatComposerMenus'

defineProps<{
  kind: 'agent' | 'team' | 'org'
  name: string
  status: 'active' | 'stopped'
}>()
</script>
