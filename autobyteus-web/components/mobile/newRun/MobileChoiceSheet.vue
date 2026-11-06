<template>
  <!-- One New run row (VIS-015) and its choice sheet (UIS-009, VIS-016…018): the label, the value (blue "Choose" when
       empty) and a chevron; the sheet lists the choices (search when more than six) and one tap picks and closes. -->
  <section class="border-b border-slate-100 bg-white" :data-testid="testId" :aria-label="label">
    <button
      type="button"
      class="flex h-14 w-full items-center gap-3 text-left active:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      :disabled="disabled"
      :data-testid="`${testId}-toggle`"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="open"
    >
      <span class="w-24 flex-shrink-0 text-[0.9375rem] text-slate-500">{{ label }}</span>
      <span class="min-w-0 flex-1 truncate text-right text-base" :class="valueLabel ? 'font-medium text-slate-900' : 'text-blue-700'" :data-testid="`${testId}-value`">{{ valueLabel || placeholder }}</span>
      <Icon icon="heroicons:chevron-right-20-solid" class="h-5 w-5 flex-shrink-0 text-slate-300" aria-hidden="true" />
    </button>

    <MobileBottomSheet v-if="isOpen" :title="label" :test-id="`${testId}-sheet`" @close="close">
      <template v-if="items.length > 6" #top>
        <div class="flex-shrink-0 px-4 pb-2">
          <input v-model="query" type="search" class="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base" :placeholder="`Search ${itemNoun}`" :aria-label="`Search ${itemNoun}`" :data-testid="`${testId}-search`" data-autofocus>
        </div>
      </template>
      <template v-if="groups.length">
        <section v-for="group in groups" :key="group.label">
          <p v-if="groups.length > 1" class="sticky top-0 bg-white px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ group.label }}</p>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="flex min-h-[3.75rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-slate-100"
            :class="item.id === modelValue ? 'bg-blue-50' : ''"
            :aria-current="item.id === modelValue ? 'true' : undefined"
            :data-testid="`${testId}-option`"
            @click="pick(item.id)"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-base font-medium text-slate-900">{{ item.label }}</span>
              <span v-if="item.detail" class="block truncate text-[0.8125rem] text-slate-500">{{ item.detail }}</span>
            </span>
            <Icon v-if="item.id === modelValue" icon="heroicons:check-circle-20-solid" class="h-6 w-6 flex-shrink-0 text-blue-600" aria-hidden="true" />
          </button>
        </section>
      </template>
      <p v-else class="px-4 py-6 text-sm text-slate-500">Nothing matches.</p>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </MobileBottomSheet>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileBottomSheet from '~/components/mobile/MobileBottomSheet.vue';
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch';

const props = withDefaults(defineProps<{
  label: string;
  items: MobileLaunchPickerItem[];
  modelValue: string;
  testId: string;
  placeholder?: string;
  itemNoun?: string;
  disabled?: boolean;
  /** The value shown when it is not one of the items (an agent's own default model). */
  selectedLabel?: string;
}>(), { placeholder: 'Choose', itemNoun: '', disabled: false, selectedLabel: '' });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const isOpen = ref(false);
const query = ref('');
const valueLabel = computed(() => props.items.find((item) => item.id === props.modelValue)?.label || props.selectedLabel);
const groups = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const items = normalized
    ? props.items.filter((item) => `${item.label} ${item.detail ?? ''} ${item.group ?? ''}`.toLowerCase().includes(normalized))
    : props.items;
  const byGroup = new Map<string, MobileLaunchPickerItem[]>();
  for (const item of items) byGroup.set(item.group || '', [...(byGroup.get(item.group || '') ?? []), item]);
  return [...byGroup.entries()].map(([label, groupItems]) => ({ label, items: groupItems }));
});

// A choice made in the footer (a folder opened by path) closes the sheet too.
watch(() => props.modelValue, () => { if (isOpen.value) close(); });

function open(): void {
  isOpen.value = true;
  void nextTick(() => document.querySelector(`[data-testid="${props.testId}-sheet"] [aria-current=true]`)?.scrollIntoView?.({ block: 'center' }));
}
function close(): void {
  isOpen.value = false;
  query.value = '';
}
function pick(value: string): void {
  emit('update:modelValue', value);
  close();
}
</script>
