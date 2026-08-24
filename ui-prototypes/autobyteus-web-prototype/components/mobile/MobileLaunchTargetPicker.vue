<template>
  <section
    class="rounded-2xl border border-blue-200 bg-white"
    :class="toggleVariant === 'chevron' ? 'p-2.5' : 'p-3'"
    :data-testid="testId"
    :aria-label="label"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p v-if="showLabel" class="text-sm font-bold text-blue-950">{{ label }}</p>
        <p class="truncate text-sm" :class="[showLabel ? 'mt-1' : '', selectedItem ? 'text-slate-700' : 'text-slate-500']">
          {{ selectedItem ? selectedItem.label : placeholder }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 border font-semibold transition"
        :class="toggleVariant === 'chevron'
          ? 'flex h-9 w-9 items-center justify-center rounded-full border-blue-100 bg-blue-50 text-lg leading-none text-blue-700'
          : 'rounded-xl border-blue-200 px-3 py-2 text-sm text-blue-700'"
        :data-testid="`${testId}-toggle`"
        :aria-label="toggleAccessibleLabel"
        :title="toggleAccessibleLabel"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        @click="isOpen = !isOpen"
      >
        <span v-if="toggleVariant === 'chevron'" aria-hidden="true">⌄</span>
        <span v-else>{{ selectedItem ? 'Change' : 'Choose' }}</span>
      </button>
    </div>

    <div v-if="isOpen" class="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3" :data-testid="`${testId}-sheet`">
      <input
        v-model="query"
        class="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
        :placeholder="`Search ${searchNoun}`"
        :data-testid="`${testId}-search`"
      />
      <div v-if="groupedItems.length" class="mt-3 max-h-64 space-y-3 overflow-y-auto">
        <section v-for="group in groupedItems" :key="group.label">
          <p class="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{{ group.label }}</p>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="mb-1 w-full rounded-xl border bg-white p-3 text-left text-sm transition hover:border-blue-300"
            :class="item.id === modelValue ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-100'"
            :data-testid="`${testId}-option`"
            @click="selectItem(item.id)"
          >
            <span class="block font-semibold text-slate-950">{{ item.label }}</span>
            <span v-if="item.detail" class="mt-0.5 block break-words text-xs text-slate-500">{{ item.detail }}</span>
          </button>
        </section>
      </div>
      <p v-else class="mt-3 rounded-xl border border-dashed border-blue-200 bg-white p-3 text-sm text-slate-500">
        No matching {{ searchNoun }}.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch';

const props = withDefaults(defineProps<{
  label: string;
  placeholder: string;
  items: MobileLaunchPickerItem[];
  modelValue: string;
  testId: string;
  showLabel?: boolean;
  itemNoun?: string;
  toggleVariant?: 'button' | 'chevron';
}>(), {
  showLabel: true,
  itemNoun: '',
  toggleVariant: 'button',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const query = ref('');

const searchNoun = computed(() => props.itemNoun || props.label.toLowerCase());
const selectedItem = computed(() => props.items.find((item) => item.id === props.modelValue) ?? null);
const toggleAccessibleLabel = computed(() => {
  const label = props.label.toLowerCase();
  return `${selectedItem.value ? 'Change' : 'Choose'} ${label}`;
});
const filteredItems = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) return props.items;
  return props.items.filter((item) => `${item.label} ${item.detail ?? ''} ${item.group ?? ''}`.toLowerCase().includes(normalizedQuery));
});
const groupedItems = computed(() => {
  const groups = new Map<string, MobileLaunchPickerItem[]>();
  for (const item of filteredItems.value) {
    const group = item.group || 'All';
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
});

function selectItem(value: string): void {
  emit('update:modelValue', value);
  isOpen.value = false;
  query.value = '';
}
</script>
