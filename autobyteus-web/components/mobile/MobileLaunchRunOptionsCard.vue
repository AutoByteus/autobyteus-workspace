<template>
  <section class="rounded-3xl border border-blue-200 bg-white p-4" data-testid="mobile-launch-run-options-card">
    <div class="flex items-start justify-between gap-3" data-testid="mobile-run-auto-approve-tools">
      <div class="min-w-0">
        <p class="text-sm font-bold text-blue-950">Auto approve tools</p>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          Allow tool calls for this run to execute without asking each time. Off by default.
        </p>
      </div>
      <button
        type="button"
        class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
        :class="autoExecuteTools ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-200'"
        role="switch"
        :aria-checked="autoExecuteTools ? 'true' : 'false'"
        aria-label="Auto approve tools"
        data-testid="mobile-run-auto-approve-tools-switch"
        :disabled="disabled"
        @click="$emit('update:autoExecuteTools', !autoExecuteTools)"
      >
        <span
          class="inline-block h-5 w-5 rounded-full bg-white shadow transition"
          :class="autoExecuteTools ? 'translate-x-5' : 'translate-x-1'"
          aria-hidden="true"
        />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  autoExecuteTools: boolean
  disabled?: boolean
}>(), {
  disabled: false,
})

defineEmits<{
  'update:autoExecuteTools': [value: boolean]
}>()
</script>
