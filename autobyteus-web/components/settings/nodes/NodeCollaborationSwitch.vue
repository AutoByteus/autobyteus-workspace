<template>
  <span
    class="inline-flex flex-shrink-0 items-center gap-2.5 rounded-full border pl-3 pr-2 transition-colors"
    :class="[tall ? 'h-10' : 'h-9', modelValue ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white', dimmed ? 'opacity-60' : '']"
    :title="title"
  >
    <span
      :class="modelValue ? 'text-emerald-600' : 'text-slate-400'"
      role="img"
      :aria-label="hint"
      :data-testid="iconTestId"
    ><RemoteCollaborationIcon size-class="h-5 w-5" /></span>
    <button
      type="button"
      role="switch"
      class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
      :class="[modelValue ? 'bg-emerald-500' : 'bg-slate-300', disabled ? 'opacity-50' : '']"
      :aria-checked="modelValue"
      :aria-label="label"
      :disabled="disabled"
      :data-testid="testId"
      @click="emit('toggle')"
    >
      <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'" />
    </button>
  </span>
</template>

<script setup lang="ts">
import RemoteCollaborationIcon from '~/components/settings/nodes/RemoteCollaborationIcon.vue'

/** The remote-collaboration control: the one icon and its switch as one capsule (green when on, grey when off). */

defineProps<{
  modelValue: boolean
  label: string
  hint: string
  testId: string
  iconTestId?: string
  title?: string
  disabled?: boolean
  dimmed?: boolean
  tall?: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()
</script>
