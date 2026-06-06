<template>
  <div v-if="shouldRender" class="mb-2 flex justify-end" data-test="self-evolution-composer-cta-container">
    <button
      type="button"
      data-test="self-evolution-composer-cta"
      class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
      :title="buttonTitle"
      :aria-label="buttonAriaLabel"
      :disabled="buttonDisabled"
      @click="startSelfEvolution"
    >
      <Icon icon="heroicons:sparkles-20-solid" class="h-4 w-4" />
      <span>{{ actionLabel }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useToasts } from '~/composables/useToasts';
import { useSelfEvolutionCapabilityStore } from '~/stores/selfEvolutionCapabilityStore';
import { useSelfEvolutionStore } from '~/stores/selfEvolutionStore';
import type { SelfEvolutionComposerCtaTarget } from '~/components/workspace/self-evolution/selfEvolutionComposerCtaTarget';

const props = defineProps<{
  target: SelfEvolutionComposerCtaTarget | null;
}>();

const { t } = useLocalization();
const { addToast } = useToasts();
const selfEvolutionCapabilityStore = useSelfEvolutionCapabilityStore();
const selfEvolutionStore = useSelfEvolutionStore();
const starting = ref(false);

const targetKey = computed(() => {
  const target = props.target;
  if (!target) {
    return null;
  }
  return target.kind === 'agent'
    ? selfEvolutionStore.agentKey(target.runId)
    : selfEvolutionStore.teamMemberKey(target.teamRunId, target.memberRunId);
});

const actionLabel = computed(() => (
  t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.self_improve')
));

const targetScope = computed(() => (
  props.target?.kind === 'team-member'
    ? t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.team_member_scope')
    : t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.standalone_scope')
));

const buttonAriaLabel = computed(() => (
  t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.aria_label', {
    scope: targetScope.value,
  })
));

const isTemporaryTarget = computed(() => {
  const target = props.target;
  if (!target) {
    return true;
  }
  const ids = target.kind === 'agent'
    ? [target.runId]
    : [target.teamRunId, target.memberRunId];
  return ids.some((id) => id.startsWith('temp-') || id.startsWith('temp-team-'));
});

const canResolveEligibility = computed(() => Boolean(
  props.target &&
  selfEvolutionCapabilityStore.isEnabled &&
  !props.target.isHelperRun &&
  !isTemporaryTarget.value,
));

const eligibility = computed(() => {
  const key = targetKey.value;
  return key ? selfEvolutionStore.eligibilityByKey[key] ?? null : null;
});

const isLoading = computed(() => {
  const key = targetKey.value;
  return Boolean(key && selfEvolutionStore.loadingKeys[key]);
});

const shouldRender = computed(() => Boolean(canResolveEligibility.value && eligibility.value?.eligible));

const buttonDisabled = computed(() => (
  starting.value ||
  isLoading.value
));

const buttonTitle = computed(() => (
  t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.tooltip', {
    scope: targetScope.value,
  })
));

const ensureEligibility = async (): Promise<void> => {
  const target = props.target;
  if (!canResolveEligibility.value || !targetKey.value || !target) {
    return;
  }
  if (eligibility.value || isLoading.value) {
    return;
  }
  if (target.kind === 'agent') {
    await selfEvolutionStore.fetchAgentRunEligibility(target.runId);
    return;
  }
  await selfEvolutionStore.fetchTeamMemberEligibility(target.teamRunId, target.memberRunId);
};

const startSelfEvolution = async (): Promise<void> => {
  const target = props.target;
  if (!canResolveEligibility.value || !target || starting.value) {
    return;
  }
  starting.value = true;
  try {
    const latestEligibility = target.kind === 'agent'
      ? await selfEvolutionStore.fetchAgentRunEligibility(target.runId)
      : await selfEvolutionStore.fetchTeamMemberEligibility(target.teamRunId, target.memberRunId);
    if (!latestEligibility.eligible) {
      addToast(
        t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.run_not_eligible'),
        'error',
      );
      return;
    }
    if (target.kind === 'agent') {
      await selfEvolutionStore.startAgentRunSelfEvolution(target.runId);
    } else {
      await selfEvolutionStore.startTeamMemberSelfEvolution(target.teamRunId, target.memberRunId);
    }
    addToast(
      t('workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.started_toast'),
      'success',
    );
  } catch (error) {
    addToast(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    starting.value = false;
  }
};

onMounted(() => {
  void selfEvolutionCapabilityStore.ensureResolved().catch(() => undefined);
});

watch(
  () => [targetKey.value, selfEvolutionCapabilityStore.isEnabled] as const,
  () => {
    void ensureEligibility().catch(() => undefined);
  },
  { immediate: true },
);
</script>
