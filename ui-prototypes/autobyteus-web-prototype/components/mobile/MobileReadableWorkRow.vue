<template>
  <button
    type="button"
    class="w-full rounded-2xl border p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
    :class="selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'"
    data-testid="mobile-readable-work-row"
    @click="$emit('select')"
  >
    <span class="block min-w-0">
      <span class="block break-words text-base font-semibold leading-6 text-slate-950" data-testid="mobile-work-row-title">
        {{ label }}
      </span>
      <span class="mt-1 block break-words text-sm leading-5 text-slate-600" data-testid="mobile-work-row-detail">
        {{ detail }}
      </span>
      <span class="mt-3 inline-flex max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold leading-4 text-slate-600" data-testid="mobile-work-row-meta">
        <span class="truncate">{{ meta }}</span>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  detail: string;
  meta: string;
  selected?: boolean;
}>();

defineEmits<{
  select: [];
}>();
</script>
