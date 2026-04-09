<template>
  <button
    type="button"
    :disabled="isDuplicating"
    class="w-full px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
    @click="duplicateAgent"
  >
    <span v-if="isDuplicating" class="block i-heroicons-arrow-path-20-solid w-5 h-5 mr-2 animate-spin"></span>
    <span v-else class="block i-heroicons-squares-plus-20-solid w-5 h-5 mr-2"></span>
    {{ isDuplicating ? $t('agents.components.agents.AgentDuplicateButton.duplicating') : $t('agents.components.agents.AgentDuplicateButton.duplicate') }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';

const props = defineProps<{
  agentId: string;
  defaultName: string;
}>();

const emit = defineEmits<{
  (e: 'duplicated', duplicatedId: string): void;
}>();

const agentDefinitionStore = useAgentDefinitionStore();
const { t: $t } = useLocalization();
const isDuplicating = ref(false);

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'agent';
}

function hasConflict(candidateName: string): boolean {
  const candidateId = slugify(candidateName);
  const normalizedCandidate = candidateName.trim().toLowerCase();
  return agentDefinitionStore.agentDefinitions.some((definition) => {
    if (definition.id === props.agentId) {
      return false;
    }
    return definition.id === candidateId || definition.name.trim().toLowerCase() === normalizedCandidate;
  });
}

function buildDuplicateName(): string {
  const base = props.defaultName.trim() || $t('agents.components.agents.AgentDuplicateButton.defaultBaseName');
  const stem = `${base} ${$t('agents.components.agents.AgentDuplicateButton.copySuffix')}`;
  if (!hasConflict(stem)) {
    return stem;
  }
  let suffix = 2;
  while (suffix < 1000) {
    const candidate = `${stem} ${suffix}`;
    if (!hasConflict(candidate)) {
      return candidate;
    }
    suffix += 1;
  }
  return `${stem} ${Date.now()}`;
}

async function duplicateAgent(): Promise<void> {
  const newName = buildDuplicateName();

  isDuplicating.value = true;
  try {
    const duplicated = await agentDefinitionStore.duplicateAgentDefinition({
      sourceId: props.agentId,
      newName,
    });
    if (duplicated?.id) {
      emit('duplicated', duplicated.id);
    }
  } catch (error) {
    console.error('Failed to duplicate agent definition:', error);
  } finally {
    isDuplicating.value = false;
  }
}
</script>
