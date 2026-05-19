<template>
  <section class="rounded-2xl border border-blue-200 bg-white p-3" :data-testid="testId">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-bold text-blue-950">{{ label }}</p>
        <p class="mt-1 truncate text-sm" :class="selectedItem ? 'text-slate-700' : 'text-slate-500'">
          {{ selectedItem ? selectedItem.label : placeholder }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"
        :data-testid="`${testId}-toggle`"
        @click="isOpen = !isOpen"
      >
        {{ selectedItem ? 'Change' : 'Choose' }}
      </button>
    </div>

    <div v-if="isOpen" class="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3" :data-testid="`${testId}-sheet`">
      <input
        v-model="query"
        class="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
        :placeholder="`Search ${label.toLowerCase()}`"
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
        No matching {{ label.toLowerCase() }}.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type MobileLaunchPickerItem = {
  id: string;
  label: string;
  detail?: string;
  group?: string;
};

const props = defineProps<{
  label: string;
  placeholder: string;
  items: MobileLaunchPickerItem[];
  modelValue: string;
  testId: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const query = ref('');

const selectedItem = computed(() => props.items.find((item) => item.id === props.modelValue) ?? null);
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
