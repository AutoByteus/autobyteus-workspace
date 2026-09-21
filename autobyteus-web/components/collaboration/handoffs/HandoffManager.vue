<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" :data-test="`handoff-manager-${scope}`">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-xl font-semibold text-slate-900">{{ t('handoffs.manager.title') }}</h2>
      <button
        v-if="mode === 'edit' && editingIndex === null"
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-test="add-handoff"
        @click="startAdd"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" /> {{ t('handoffs.manager.actions.add') }}
      </button>
    </div>

    <div v-if="draft" class="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4" data-test="handoff-editor">
      <h3 class="font-semibold text-slate-900">{{ editingIndex === -1 ? t('handoffs.manager.editor.addTitle') : t('handoffs.manager.editor.editTitle') }}</h3>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <label class="block">
          <span class="text-sm font-semibold text-slate-700">{{ t('handoffs.manager.fields.from') }}</span>
          <select v-model="draft.fromAddress" class="mt-1.5 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2" :class="draftErrors.fromAddress ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'" data-test="handoff-from">
            <option value="">{{ t('handoffs.manager.fields.selectSource') }}</option>
            <optgroup v-for="group in groupedFromOptions" :key="group.label" :label="group.label">
              <option v-for="option in group.options" :key="option.address" :value="option.address">{{ option.label }} · {{ option.address }}</option>
            </optgroup>
          </select>
          <span v-if="draftErrors.fromAddress" class="mt-1 block text-xs font-medium text-red-600" role="alert">{{ draftErrors.fromAddress }}</span>
          <EndpointIdentity v-else-if="selectedDraftFrom" class="mt-2" :endpoint="selectedDraftFrom" compact />
        </label>

        <label class="block">
          <span class="text-sm font-semibold text-slate-700">{{ t('handoffs.manager.fields.to') }}</span>
          <select v-model="draft.toAddress" class="mt-1.5 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2" :class="draftErrors.toAddress || draftErrors.pair ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'" data-test="handoff-to">
            <option value="">{{ t('handoffs.manager.fields.selectDestination') }}</option>
            <optgroup v-for="group in groupedToOptions" :key="group.label" :label="group.label">
              <option v-for="option in group.options" :key="option.address" :value="option.address">{{ option.label }} · {{ option.address }}</option>
            </optgroup>
          </select>
          <span v-if="draftErrors.toAddress" class="mt-1 block text-xs font-medium text-red-600" role="alert">{{ draftErrors.toAddress }}</span>
          <span v-else-if="draftErrors.pair" class="mt-1 block text-xs font-medium text-red-600" role="alert">{{ draftErrors.pair }}</span>
          <EndpointIdentity v-else-if="selectedDraftTo" class="mt-2" :endpoint="selectedDraftTo" compact />
        </label>
      </div>

      <div class="mt-5 border-t border-blue-100 pt-4">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-slate-900">{{ t('handoffs.manager.fields.when') }}</h4>
          <button type="button" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-test="add-when-condition" @click="addWhenCondition"><Icon icon="heroicons:plus-20-solid" class="h-4 w-4" /> {{ t('handoffs.manager.actions.addCondition') }}</button>
        </div>
        <div class="mt-3 space-y-3">
          <div v-for="(condition, index) in draft.when" :key="index" class="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <label class="block">
              <span class="sr-only">{{ t('handoffs.manager.fields.conditionLabel', { position: index + 1 }) }}</span>
              <textarea v-model="draft.when[index]" rows="2" class="w-full rounded-md border px-3 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2" :class="draftErrors[whenKey(index)] ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'" :data-test="`when-condition-${index}`" :placeholder="t('handoffs.manager.fields.conditionPlaceholder')" />
              <span v-if="draftErrors[whenKey(index)]" class="mt-1 block text-xs font-medium text-red-600" role="alert">{{ draftErrors[whenKey(index)] }}</span>
            </label>
            <div class="flex items-center justify-end gap-1">
              <button type="button" class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" :disabled="index === 0" :aria-label="t('handoffs.manager.aria.moveConditionUp', { position: index + 1 })" @click="moveWhen(index, -1)"><Icon icon="heroicons:arrow-up-20-solid" class="h-4 w-4" /></button>
              <button type="button" class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" :disabled="index === draft.when.length - 1" :aria-label="t('handoffs.manager.aria.moveConditionDown', { position: index + 1 })" @click="moveWhen(index, 1)"><Icon icon="heroicons:arrow-down-20-solid" class="h-4 w-4" /></button>
              <button type="button" class="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" :disabled="draft.when.length === 1" :aria-label="t('handoffs.manager.aria.deleteCondition', { position: index + 1 })" @click="deleteWhen(index)"><Icon icon="heroicons:trash-20-solid" class="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2 border-t border-blue-100 pt-4">
        <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-test="cancel-handoff-draft" @click="cancelDraft">{{ t('handoffs.manager.actions.cancel') }}</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-test="apply-handoff-draft" @click="applyDraft">{{ t('handoffs.manager.actions.apply') }}</button>
      </div>
    </div>

    <div v-if="collectionMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert" data-test="handoff-validation-summary">{{ collectionMessage }}</div>
    <div v-if="statusMessage" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">{{ statusMessage }}</div>

    <div v-if="modelValue.length === 0" class="mt-4 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center" data-test="handoff-empty-state">
      <Icon icon="heroicons:arrows-right-left-20-solid" class="mx-auto h-7 w-7 text-slate-400" />
      <p class="mt-3 text-sm font-semibold text-slate-700">{{ t('handoffs.manager.empty.title') }}</p>
      <button v-if="mode === 'edit' && editingIndex === null" type="button" class="mt-3 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="startAdd">{{ t('handoffs.manager.empty.addFirst') }}</button>
    </div>

    <ol v-else class="mt-4 space-y-3">
      <li v-for="(handoff, index) in modelValue" :key="handoff.id" class="rounded-xl border p-4" :class="errorsByHandoff[handoff.id] ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'" :data-test="`handoff-card-${handoff.id}`">
        <div v-if="mode === 'edit'" class="flex flex-wrap items-center justify-end gap-1">
          <button type="button" class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" :disabled="index === 0" :aria-label="t('handoffs.manager.aria.moveHandoffUp', { position: index + 1 })" @click="moveHandoff(index, -1)"><Icon icon="heroicons:arrow-up-20-solid" class="h-4 w-4" /></button>
          <button type="button" class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" :disabled="index === modelValue.length - 1" :aria-label="t('handoffs.manager.aria.moveHandoffDown', { position: index + 1 })" @click="moveHandoff(index, 1)"><Icon icon="heroicons:arrow-down-20-solid" class="h-4 w-4" /></button>
          <button type="button" class="rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :data-test="`edit-handoff-${handoff.id}`" @click="startEdit(index)">{{ t('handoffs.manager.actions.edit') }}</button>
          <button type="button" class="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" :data-test="`delete-handoff-${handoff.id}`" @click="deleteHandoff(index)">{{ t('handoffs.manager.actions.delete') }}</button>
        </div>

        <div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] lg:items-start">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('handoffs.manager.fields.from') }}</p>
            <EndpointIdentity v-if="endpointFor(handoff.fromAddress, fromOptions)" class="mt-1.5" :endpoint="endpointFor(handoff.fromAddress, fromOptions)!" />
            <p v-else class="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{{ t('handoffs.manager.endpoint.unavailable', { address: handoff.fromAddress }) }}</p>
          </div>
          <Icon icon="heroicons:arrow-right-20-solid" class="hidden h-5 w-5 text-slate-400 lg:mt-8 lg:block" />
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('handoffs.manager.fields.to') }}</p>
            <EndpointIdentity v-if="endpointFor(handoff.toAddress, toOptions)" class="mt-1.5" :endpoint="endpointFor(handoff.toAddress, toOptions)!" />
            <p v-else class="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{{ t('handoffs.manager.endpoint.unavailable', { address: handoff.toAddress }) }}</p>
          </div>
        </div>

        <div class="mt-4 border-t border-slate-200 pt-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('handoffs.manager.fields.when') }}</p>
          <ol class="mt-2 space-y-2 list-none">
            <li v-for="(condition, whenIndex) in handoff.when" :key="whenIndex" class="text-sm leading-5 text-slate-700">
              {{ condition }}
            </li>
          </ol>
        </div>

        <p v-if="errorsByHandoff[handoff.id]" class="mt-3 border-t border-red-200 pt-3 text-sm font-medium text-red-700" role="alert">{{ errorsByHandoff[handoff.id] }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type { HandoffEndpointOption, EditableHandoff } from '~/types/collaboration/handoffs';

type ManagerMode = 'view' | 'edit';
type ManagerScope = 'org' | 'team';

const EndpointIdentity = defineComponent({
  name: 'EndpointIdentity',
  props: {
    endpoint: { type: Object as PropType<HandoffEndpointOption>, required: true },
    compact: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h('div', { class: ['rounded-lg border border-slate-200 bg-slate-50', props.compact ? 'p-2.5' : 'p-3'] }, [
      h('div', { class: 'flex min-w-0 items-center gap-2' }, [
        h(Icon, { icon: props.endpoint.kind === 'team' ? 'heroicons:user-group-20-solid' : 'heroicons:user-20-solid', class: props.endpoint.kind === 'team' ? 'h-4 w-4 flex-none text-blue-600' : 'h-4 w-4 flex-none text-slate-500' }),
        h('span', { class: 'min-w-0 flex-1 truncate text-sm font-semibold text-slate-900' }, props.endpoint.label),
      ]),
      h('p', { class: 'mt-1 break-all font-mono text-xs text-slate-500' }, props.endpoint.address),
    ]);
  },
});

const props = defineProps<{
  modelValue: EditableHandoff[];
  fromOptions: HandoffEndpointOption[];
  toOptions: HandoffEndpointOption[];
  mode: ManagerMode;
  scope: ManagerScope;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: EditableHandoff[]];
}>();

const { t } = useLocalization();

const editingIndex = ref<number | null>(null);
const draft = ref<EditableHandoff | null>(null);
const draftErrors = ref<Record<string, string>>({});
const errorsByHandoff = ref<Record<string, string>>({});
const collectionMessage = ref('');
const statusMessage = ref('');

const endpointFor = (address: string, options: HandoffEndpointOption[]): HandoffEndpointOption | undefined => options.find((option) => option.address === address);
const whenKey = (index: number): string => `when-${index}`;
const selectedDraftFrom = computed(() => draft.value ? endpointFor(draft.value.fromAddress, props.fromOptions) : undefined);
const selectedDraftTo = computed(() => draft.value ? endpointFor(draft.value.toAddress, props.toOptions) : undefined);

const groupOptions = (options: HandoffEndpointOption[]): Array<{ label: string; options: HandoffEndpointOption[] }> => {
  const groups = new Map<string, HandoffEndpointOption[]>();
  options.forEach((option) => groups.set(option.group, [...(groups.get(option.group) ?? []), option]));
  return [...groups.entries()].map(([label, groupedOptions]) => ({ label, options: groupedOptions }));
};
const groupedFromOptions = computed(() => groupOptions(props.fromOptions));
const groupedToOptions = computed(() => groupOptions(props.toOptions));

const clearMessages = (): void => {
  draftErrors.value = {};
  collectionMessage.value = '';
  statusMessage.value = '';
};

const startAdd = (): void => {
  clearMessages();
  editingIndex.value = -1;
  draft.value = { id: `handoff-${Date.now()}`, fromAddress: '', toAddress: '', when: [''] };
};

const startEdit = (index: number): void => {
  clearMessages();
  editingIndex.value = index;
  const handoff = props.modelValue[index];
  draft.value = { ...handoff, when: [...handoff.when] };
};

const cancelDraft = (): void => {
  draft.value = null;
  editingIndex.value = null;
  draftErrors.value = {};
  statusMessage.value = t('handoffs.manager.status.canceled');
};

const validateCandidate = (candidate: EditableHandoff, candidateIndex: number): Record<string, string> => {
  const errors: Record<string, string> = {};
  const source = endpointFor(candidate.fromAddress, props.fromOptions);
  const destination = endpointFor(candidate.toAddress, props.toOptions);
  if (!candidate.fromAddress) errors.fromAddress = t('handoffs.manager.validation.chooseSource');
  else if (!source) errors.fromAddress = t('handoffs.manager.validation.sourceUnavailable');
  else if (source.kind !== 'agent') errors.fromAddress = t('handoffs.manager.validation.sourceMustBeAgent');
  if (!candidate.toAddress) errors.toAddress = t('handoffs.manager.validation.chooseDestination');
  else if (!destination) errors.toAddress = t('handoffs.manager.validation.destinationUnavailable');
  candidate.when.forEach((condition, index) => {
    if (!condition.trim()) errors[`when-${index}`] = t('handoffs.manager.validation.conditionRequired');
  });
  if (candidate.when.length === 0) errors.when = t('handoffs.manager.validation.whenRequired');
  if (source && destination) {
    const resolvedDestination = destination.kind === 'team' ? destination.coordinatorAddress : destination.address;
    if (resolvedDestination === source.address) errors.pair = t('handoffs.manager.validation.selfDelivery');
    const duplicate = props.modelValue.some((handoff, index) => index !== candidateIndex && handoff.fromAddress === candidate.fromAddress && handoff.toAddress === candidate.toAddress);
    if (duplicate) errors.pair = t('handoffs.manager.validation.duplicatePair');
  }
  return errors;
};

const applyDraft = (): void => {
  if (!draft.value || editingIndex.value === null) return;
  const errors = validateCandidate(draft.value, editingIndex.value);
  draftErrors.value = errors;
  if (Object.keys(errors).length > 0) return;
  const normalized = { ...draft.value, when: draft.value.when.map((condition) => condition.trim()) };
  const next = props.modelValue.map((handoff) => ({ ...handoff, when: [...handoff.when] }));
  if (editingIndex.value === -1) next.push(normalized);
  else next.splice(editingIndex.value, 1, normalized);
  emit('update:modelValue', next);
  statusMessage.value = editingIndex.value === -1
    ? t('handoffs.manager.status.added')
    : t('handoffs.manager.status.updated');
  draft.value = null;
  editingIndex.value = null;
  errorsByHandoff.value = {};
  collectionMessage.value = '';
};

const deleteHandoff = (index: number): void => {
  const next = props.modelValue.filter((_, candidateIndex) => candidateIndex !== index).map((handoff) => ({ ...handoff, when: [...handoff.when] }));
  emit('update:modelValue', next);
  if (editingIndex.value === index) cancelDraft();
  statusMessage.value = t('handoffs.manager.status.removed');
  errorsByHandoff.value = {};
  collectionMessage.value = '';
};

const moveHandoff = (index: number, direction: -1 | 1): void => {
  const target = index + direction;
  if (target < 0 || target >= props.modelValue.length) return;
  const next = props.modelValue.map((handoff) => ({ ...handoff, when: [...handoff.when] }));
  [next[index], next[target]] = [next[target], next[index]];
  emit('update:modelValue', next);
  statusMessage.value = t('handoffs.manager.status.moved', { position: target + 1 });
};

const addWhenCondition = (): void => {
  if (!draft.value) return;
  draft.value.when.push('');
};

const deleteWhen = (index: number): void => {
  if (!draft.value || draft.value.when.length === 1) return;
  draft.value.when.splice(index, 1);
};

const moveWhen = (index: number, direction: -1 | 1): void => {
  if (!draft.value) return;
  const target = index + direction;
  if (target < 0 || target >= draft.value.when.length) return;
  [draft.value.when[index], draft.value.when[target]] = [draft.value.when[target], draft.value.when[index]];
};

const validateAll = (): boolean => {
  if (draft.value) {
    collectionMessage.value = t('handoffs.manager.validation.openDraft');
    return false;
  }
  const nextErrors: Record<string, string> = {};
  props.modelValue.forEach((handoff, index) => {
    const errors = validateCandidate(handoff, index);
    if (Object.keys(errors).length > 0) nextErrors[handoff.id] = Object.values(errors)[0];
  });
  errorsByHandoff.value = nextErrors;
  const affectedCount = Object.keys(nextErrors).length;
  collectionMessage.value = affectedCount > 0
    ? t(affectedCount === 1
      ? 'handoffs.manager.validation.resolveAffectedOne'
      : 'handoffs.manager.validation.resolveAffectedMany', { count: affectedCount })
    : '';
  return Object.keys(nextErrors).length === 0;
};

const clearStatus = (): void => {
  statusMessage.value = '';
};

defineExpose({ validateAll, clearStatus });
</script>
