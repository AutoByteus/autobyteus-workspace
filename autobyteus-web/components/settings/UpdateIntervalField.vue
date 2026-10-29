<template>
  <!-- One check interval: a whole number and its unit (minutes or hours), from 15 minutes to 24 hours. It is saved when the
       field loses focus or Enter is pressed; an out-of-range value is refused with the reason and the old value stays. -->
  <div class="flex flex-col gap-1" :data-testid="`update-interval-${testKey}`">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span :id="labelId" class="min-w-0 flex-1 basis-44 text-sm font-medium text-gray-900">{{ label }}</span>
      <div class="flex flex-shrink-0 items-center gap-2" :class="muted ? 'opacity-60' : ''">
        <span class="text-sm text-gray-500" aria-hidden="true">{{ $t('settings.notifications.interval.every') }}</span>
        <input
          v-model="text"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          class="h-10 w-20 rounded-lg border bg-white px-3 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :class="invalid ? 'border-red-400' : 'border-gray-300'"
          :aria-labelledby="labelId"
          :aria-describedby="invalid ? hintId : undefined"
          :aria-invalid="invalid ? 'true' : undefined"
          :disabled="current === null"
          :data-testid="`update-interval-${testKey}-value`"
          @blur="commit"
          @keydown.enter.prevent="commit"
          @keydown.esc="reset"
        >
        <select
          v-model="unit"
          class="h-10 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="$t('settings.notifications.interval.unit', { name: label })"
          :disabled="current === null"
          :data-testid="`update-interval-${testKey}-unit`"
          @change="commit"
        >
          <option value="minutes">{{ $t('settings.notifications.interval.unit.minutes') }}</option>
          <option value="hours">{{ $t('settings.notifications.interval.unit.hours') }}</option>
        </select>
        <span class="inline-flex h-10 w-16 items-center gap-1 text-xs font-medium text-emerald-700" role="status" :data-testid="`update-interval-${testKey}-saved`">
          <template v-if="saved"><Icon icon="heroicons:check-20-solid" class="h-4 w-4" aria-hidden="true" />{{ $t('settings.notifications.interval.saved') }}</template>
        </span>
      </div>
    </div>
    <p v-if="invalid" :id="hintId" class="text-xs leading-5 text-red-700" role="alert" :data-testid="`update-interval-${testKey}-hint`">{{ $t('settings.notifications.interval.invalid') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { isValidIntervalMinutes, splitInterval, toMinutes, type IntervalUnit } from '~/utils/updateInterval'

/** `minutes`: the saved interval (null while it is unknown); `save` stores a new one and rejects when it is refused. */
const props = defineProps<{ label: string; testKey: string; minutes: number | null; save: (minutes: number) => Promise<void>; muted?: boolean }>()
const labelId = `update-interval-label-${useId()}`
const hintId = `update-interval-hint-${useId()}`
const text = ref('')
const unit = ref<IntervalUnit>('minutes')
const invalid = ref(false)
const saved = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | null = null

const current = computed(() => props.minutes)
const reset = () => {
  if (current.value === null) return
  const parts = splitInterval(current.value)
  text.value = String(parts.value)
  unit.value = parts.unit
  invalid.value = false
}
watch(current, reset, { immediate: true })

const commit = async () => {
  if (current.value === null) return
  const minutes = toMinutes(Number(text.value), unit.value)
  if (!String(text.value ?? '').trim() || !isValidIntervalMinutes(minutes)) { invalid.value = true; return }
  invalid.value = false
  if (minutes === current.value) { reset(); return }
  try {
    await props.save(minutes)
    saved.value = true
    if (savedTimer) clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { saved.value = false }, 2200)
  } catch {
    invalid.value = true
  }
}
</script>
