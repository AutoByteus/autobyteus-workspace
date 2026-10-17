<template>
  <!-- A Task key as one piece of text (it copies cleanly). Only when it does not fit is the Project part
       shortened in the middle, so the number always stays visible (e.g. "customer-onboarding…-12"). -->
  <span ref="root" class="inline-flex min-w-0 max-w-full items-baseline whitespace-nowrap" :title="taskKey" data-testid="task-key" :data-key="taskKey">
    <span v-if="!overflowing" ref="whole" class="min-w-0 overflow-hidden">{{ taskKey }}</span>
    <template v-else><span class="min-w-0 truncate">{{ prefix }}</span><span class="flex-shrink-0">{{ suffix }}</span></template>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ taskKey: string }>()
const split = computed(() => props.taskKey.lastIndexOf('-'))
const prefix = computed(() => split.value > 0 ? props.taskKey.slice(0, split.value) : props.taskKey)
const suffix = computed(() => split.value > 0 ? props.taskKey.slice(split.value) : '')

const root = ref<HTMLElement | null>(null)
const whole = ref<HTMLElement | null>(null)
const overflowing = ref(false)
let observer: ResizeObserver | null = null
/** Measures the whole key against the space it has; the split form is used only when it is cut off. */
const measure = async () => {
  overflowing.value = false
  await nextTick()
  const el = whole.value
  if (el) overflowing.value = el.scrollWidth > el.clientWidth + 1
}
onMounted(() => {
  void measure()
  if (typeof ResizeObserver !== 'undefined' && root.value?.parentElement) {
    observer = new ResizeObserver(() => { void measure() })
    observer.observe(root.value.parentElement)
  }
})
watch(() => props.taskKey, () => { void measure() })
onBeforeUnmount(() => observer?.disconnect())
</script>
