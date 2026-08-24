<template>
  <div v-if="shouldRender" class="mb-2 flex justify-end" data-test="skill-improvement-composer-cta-container">
    <button
      type="button"
      data-test="skill-improvement-composer-cta"
      class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
      :title="buttonTitle"
      :aria-label="buttonAriaLabel"
      :disabled="buttonDisabled"
      @click="startSkillImprovement"
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
import { useSkillImprovementCapabilityStore } from '~/stores/skillImprovementCapabilityStore';
import { useSkillImprovementStore } from '~/stores/skillImprovementStore';
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget';

const props = defineProps<{
  target: SkillImprovementComposerCtaTarget | null;
}>();

const { t } = useLocalization();
const { addToast } = useToasts();
const skillImprovementCapabilityStore = useSkillImprovementCapabilityStore();
const skillImprovementStore = useSkillImprovementStore();
const starting = ref(false);

const targetKey = computed(() => {
  const target = props.target;
  if (!target) {
    return null;
  }
  return target.kind === 'agent'
    ? skillImprovementStore.agentKey(target.runId)
    : skillImprovementStore.teamMemberKey(target.teamRunId, target.agentRunId);
});

const actionLabel = computed(() => (
  t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.improve_skills')
));

const targetScope = computed(() => (
  props.target?.kind === 'team-member'
    ? t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.team_member_scope')
    : t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.standalone_scope')
));

const buttonAriaLabel = computed(() => (
  t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.aria_label', {
    scope: targetScope.value,
  })
));

const isTemporaryTarget = computed(() => {
  const target = props.target;
  return !target || (target.kind === 'agent' && target.runId.startsWith('temp-'));
});

const canResolveEligibility = computed(() => Boolean(
  props.target &&
  skillImprovementCapabilityStore.isEnabled &&
  !props.target.isHelperRun &&
  !isTemporaryTarget.value,
));

const eligibility = computed(() => {
  const key = targetKey.value;
  return key ? skillImprovementStore.eligibilityByKey[key] ?? null : null;
});

const isLoading = computed(() => {
  const key = targetKey.value;
  return Boolean(key && skillImprovementStore.loadingKeys[key]);
});

const shouldRender = computed(() => Boolean(canResolveEligibility.value && eligibility.value?.eligible));

const buttonDisabled = computed(() => (
  starting.value ||
  isLoading.value
));

const buttonTitle = computed(() => (
  t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.tooltip', {
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
    await skillImprovementStore.fetchAgentRunEligibility(target.runId);
    return;
  }
  await skillImprovementStore.fetchTeamMemberEligibility(target.teamRunId, target.agentRunId);
};

const startSkillImprovement = async (): Promise<void> => {
  const target = props.target;
  if (!canResolveEligibility.value || !target || starting.value) {
    return;
  }
  starting.value = true;
  try {
    const latestEligibility = target.kind === 'agent'
      ? await skillImprovementStore.fetchAgentRunEligibility(target.runId)
      : await skillImprovementStore.fetchTeamMemberEligibility(target.teamRunId, target.agentRunId);
    if (!latestEligibility.eligible) {
      addToast(
        t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.run_not_eligible'),
        'error',
      );
      return;
    }
    if (target.kind === 'agent') {
      await skillImprovementStore.startAgentRunSkillImprovement(target.runId);
    } else {
      await skillImprovementStore.startTeamMemberSkillImprovement(target.teamRunId, target.agentRunId);
    }
    addToast(
      t('workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.started_toast'),
      'success',
    );
  } catch (error) {
    addToast(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    starting.value = false;
  }
};

onMounted(() => {
  void skillImprovementCapabilityStore.ensureResolved().catch(() => undefined);
});

watch(
  () => [targetKey.value, skillImprovementCapabilityStore.isEnabled] as const,
  () => {
    void ensureEligibility().catch(() => undefined);
  },
  { immediate: true },
);
</script>
