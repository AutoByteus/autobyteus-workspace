<template>
  <!-- Settings (autobyteus-458, UIS-003): the open run's runtime and model, changed while the run is stopped; a live run
       shows the desktop's small red stop icon at the right of its name first. The rows are New run's; the selection, Save
       and the node's refusal are the desktop's saved-run settings (`useExistingRunConfigStore`). -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-run-settings">
    <MobileScreenBar :title="t('mobile.settings.title')" @back="$emit('back')" />

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
      <div class="flex min-h-[2.75rem] items-center gap-2 py-2" data-testid="mobile-run-settings-subject">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="subjectLine.dotClass" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-base font-semibold leading-5">{{ displayName }}</span>
          <span class="block truncate text-xs leading-4 text-slate-500" data-testid="mobile-run-settings-status">{{ subjectLine.subtitle }}</span>
        </span>
        <!-- A live run (the node changes a stopped run only): the desktop's small red stop icon; one tap, no confirmation. -->
        <button
          v-if="live"
          type="button"
          class="-mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-red-500 active:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50"
          :aria-label="t('mobile.settings.stopRun')"
          :title="t('mobile.settings.stopRun')"
          :disabled="stopAction.pending.value"
          data-testid="mobile-run-settings-stop"
          @click="stopAction.stop"
        >
          <Icon icon="heroicons:stop-20-solid" class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <MobileRuntimeModelRows
        v-if="selection"
        :runtime-kind="selection.runtimeKind"
        :llm-model-identifier="selection.llmModelIdentifier"
        :seed-model-identifier="saved?.llmModelIdentifier ?? null"
        :llm-config="selection.llmConfig"
        :disabled="!canEdit"
        @update:runtime-kind="change({ runtimeKind: $event })"
        @update:llm-model-identifier="change({ llmModelIdentifier: $event })"
        @update:llm-config="change({ llmConfig: $event })"
      />

      <p v-if="refusal" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="mobile-run-settings-error">{{ refusal }}</p>
    </div>

    <div class="flex-shrink-0 border-t border-slate-100 bg-white px-4 pb-3 pt-2">
      <button
        type="button"
        class="h-14 w-full rounded-2xl bg-blue-600 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canSave"
        data-testid="mobile-run-settings-save"
        @click="save"
      >{{ t('mobile.settings.save') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import MobileRuntimeModelRows from '~/components/mobile/newRun/MobileRuntimeModelRows.vue';
import { useRunStopAction, type RunStopSubject } from '~/composables/runSettings/useRunStopAction';
import { useTargetConversation } from '~/composables/workspace/useTargetConversation';
import { useLocalization } from '~/composables/useLocalization';
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore';
import type { ExistingAgentRunSelection } from '~/types/agent/ExistingRunModelConfigDraft';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import { mobileRunSettingsScope, type MobileRunSettingsScope } from '~/utils/mobile/mobileRunSettingsScope';
import { mobileRunSubjectLine } from '~/utils/mobile/mobileRunSubjectLine';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget; parentName: string | null }>();
const emit = defineEmits<{ (event: 'back'): void }>();

const { t } = useLocalization();
const { displayName, remoteView } = useTargetConversation(() => props.target);
const subjectLine = computed(() => mobileRunSubjectLine({
  status: props.target.context.state.currentStatus, unreachable: remoteView.unreachable.value, parentName: props.parentName,
}));

const store = useExistingRunConfigStore();
const draft = computed(() => store.draft);
/**
 * The open run's scope, the same object while it is the same run and member: a Save or a stop changes the open run's
 * context, which rebuilds an equal scope; a new one would read the run again (discarding the Save's own result) and
 * would count as another stop subject (hiding a failed stop's message).
 */
const scope = computed<MobileRunSettingsScope | null>((previous) => {
  const next = mobileRunSettingsScope(props.target);
  return previous && next && JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
});

// The run's saved settings are read from the node each time the screen opens and when another run is opened.
watch(scope, (current) => {
  if (!current) { store.clear(); return; }
  if (current.kind === 'agent') void store.loadAgentCanonical(current.runId);
  else if (current.kind === 'team') void store.loadTeamCanonical(current.teamRunId);
  else void store.loadAgentOrgCanonical(current.orgRunId);
}, { immediate: true });
onBeforeUnmount(() => store.clear());

/** The open run's own selection in the loaded draft: the run's for an agent run, its scope's in a Team or Org run. */
const scopeOf = () => {
  const current = draft.value, open = scope.value;
  if (!current || !open || current.kind !== open.kind) return null;
  if (current.kind === 'agent') {
    if (open.kind !== 'agent' || current.runId !== open.runId) return null;
    const metadata = current.metadata;
    return {
      saved: { runtimeKind: metadata.runtimeKind ?? 'autobyteus', llmModelIdentifier: metadata.llmModelIdentifier, llmConfig: metadata.llmConfig ?? null },
      draft: current.draftSelection,
    };
  }
  const found = current.planner.scopesByAddress[open.address];
  return found ? { saved: found.originalSelection, draft: found.draftSelection } : null;
};
const selection = computed<ExistingAgentRunSelection | null>(() => scopeOf()?.draft ?? null);
const saved = computed<ExistingAgentRunSelection | null>(() => scopeOf()?.saved ?? null);

/** Live: the node holds the run (idle or working), and changes only a stopped run (DEC-004). */
const live = computed(() => Boolean(draft.value?.isActive));
const canEdit = computed(() => Boolean(draft.value && draft.value.editability.editable && !live.value
  && !store.saving && !store.loadingCanonical && !store.reconciling && !store.reconciliationRequired));

/** One row's change, written into the open run's own scope of the draft. */
const change = (patch: Partial<ExistingAgentRunSelection>): void => {
  const current = selection.value, open = scope.value;
  if (!current || !open || !canEdit.value) return;
  const next: ExistingAgentRunSelection = { ...current, ...patch };
  if (open.kind === 'agent') store.updateAgentModelConfig({ llmModelIdentifier: next.llmModelIdentifier, llmConfig: next.llmConfig }, next.runtimeKind);
  else if (open.kind === 'team') store.updateTeamScopeModelConfig(open.address, next);
  else store.updateAgentOrgScopeModelConfig(open.address, next);
};

/** Save: a changed selection with a model, which the desktop's rules allow (the store decides). */
const canSave = computed(() => Boolean(selection.value?.llmModelIdentifier) && store.canSave);
/** The node's refusal in its own words (the screen stays and nothing changes), or a stop that failed. */
const refusal = computed(() => (store.feedback?.kind === 'error' ? store.feedback.message : stopAction.error.value));

const save = async (): Promise<void> => {
  if (!canSave.value) return;
  if (await store.save()) emit('back');
};

/** The stop stops the run the scope belongs to (a member's Team or Org run, as on the desktop), then reads it again. */
const stopSubject = computed<RunStopSubject | null>(() => {
  const open = scope.value;
  if (!open) return null;
  if (open.kind === 'agent') return { kind: 'agent', runId: open.runId };
  if (open.kind === 'team') return { kind: 'team', teamRunId: open.teamRunId };
  return { kind: 'agent_org', orgRunId: open.orgRunId };
});
const stopAction = useRunStopAction(stopSubject, { onStopped: async () => { await store.reloadCanonical(); } });
</script>
