<template>
  <form class="space-y-4 rounded-3xl border border-blue-200 bg-blue-50 p-4" data-testid="mobile-run-setup" :inert="creating" :aria-busy="creating" @submit.prevent="createRun">
    <div class="flex justify-end">
      <button type="button" class="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700" @click="$emit('cancel')">
        Hide
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="rounded-2xl px-3 py-2 text-sm font-semibold"
        :class="mode === 'agent' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800'"
        data-testid="mobile-run-setup-agent-mode"
        @click="setMode('agent')"
      >
        Agent
      </button>
      <button
        type="button"
        class="rounded-2xl px-3 py-2 text-sm font-semibold"
        :class="mode === 'team' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800'"
        data-testid="mobile-run-setup-team-mode"
        @click="setMode('team')"
      >
        Team
      </button>
    </div>

    <MobileLaunchTargetPicker
      v-if="mode === 'agent'"
      v-model="selectedAgentId"
      label="Agent"
      placeholder="Choose an agent intentionally"
      :items="agentChoices"
      test-id="mobile-run-agent-select"
    />
    <MobileLaunchTargetPicker
      v-else
      v-model="selectedTeamId"
      label="Team"
      placeholder="Choose a team intentionally"
      :items="teamChoices"
      test-id="mobile-run-team-select"
    />

    <MobileLaunchWorkspacePicker
      :model-value="selectedWorkspaceId"
      :items="workspaceChoices"
      :is-refreshing="workspaceRefreshing"
      :is-loading-path="workspacePathLoading"
      :error-message="workspaceError"
      @update:model-value="selectWorkspace"
      @load-path="loadWorkspacePath"
    />

    <MobileLaunchRuntimeModelCard
      v-if="mode === 'agent' && agentConfigForSelectedTarget"
      variant="agent"
      :runtime-kind="agentConfigForSelectedTarget.runtimeKind"
      :llm-model-identifier="agentConfigForSelectedTarget.llmModelIdentifier"
      :llm-config="agentConfigForSelectedTarget.llmConfig"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
    />
    <MobileLaunchRuntimeModelCard
      v-else-if="mode === 'team' && teamConfigForSelectedTarget"
      variant="team"
      :runtime-kind="teamConfigForSelectedTarget.runtimeKind"
      :llm-model-identifier="teamConfigForSelectedTarget.llmModelIdentifier"
      :llm-config="teamConfigForSelectedTarget.llmConfig"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
    />

    <MobileLaunchRunOptionsCard
      v-if="activeConfig"
      :auto-execute-tools="autoExecuteTools"
      @update:auto-execute-tools="setAutoExecuteTools"
    />

    <section class="rounded-2xl border border-blue-200 bg-white p-3 text-sm" data-testid="mobile-run-setup-readiness">
      <p class="font-semibold" :class="canLaunch ? 'text-emerald-700' : 'text-amber-700'">
        {{ canLaunch ? 'Ready to create the run. Chat opens next.' : blockingIssue }}
      </p>
      <div v-if="draftAttachments.length" class="mt-3 rounded-xl bg-blue-50 px-3 py-2" data-testid="mobile-run-setup-context-count">
        <div class="flex justify-between gap-3 text-blue-950">
          <span class="text-slate-500">Context for Chat</span>
          <span class="font-semibold">{{ draftAttachments.length }} file{{ draftAttachments.length === 1 ? '' : 's' }}</span>
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="attachment in draftAttachments"
            :key="attachment.id"
            class="max-w-full truncate rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800"
            data-testid="mobile-run-setup-context-item"
          >
            {{ attachment.displayName }}
          </span>
        </div>
      </div>
    </section>

    <p v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="mobile-run-setup-error">
      {{ error }}
    </p>

    <button
      type="submit"
      class="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="!canLaunch || creating"
      data-testid="mobile-run-launch"
    >
      {{ creating ? 'Creating…' : 'Create run' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import MobileLaunchRunOptionsCard from '~/components/mobile/MobileLaunchRunOptionsCard.vue'
import MobileLaunchRuntimeModelCard from '~/components/mobile/MobileLaunchRuntimeModelCard.vue'
import MobileLaunchTargetPicker from '~/components/mobile/MobileLaunchTargetPicker.vue'
import MobileLaunchWorkspacePicker from '~/components/mobile/MobileLaunchWorkspacePicker.vue'
import { useMobileRunSetupController } from '~/composables/mobile/useMobileRunSetupController'
import type { MobileRunSetupIntent, MobileWorkContext } from '~/types/mobileWork'

const props = defineProps<{
  context: MobileWorkContext | null
  setupIntent?: MobileRunSetupIntent | null
}>()

const emit = defineEmits<{
  cancel: []
  launched: [context: MobileWorkContext]
  setupIntentConsumed: [revision: number]
}>()

const {
  mode,
  selectedAgentId,
  selectedTeamId,
  selectedWorkspaceId,
  creating,
  error,
  draftAttachments,
  agentChoices,
  teamChoices,
  workspaceChoices,
  workspaceError,
  workspaceRefreshing,
  workspacePathLoading,
  agentConfigForSelectedTarget,
  teamConfigForSelectedTarget,
  activeConfig,
  canLaunch,
  blockingIssue,
  autoExecuteTools,
  setMode,
  selectWorkspace,
  setAutoExecuteTools,
  updateRuntimeKind,
  updateLlmModelIdentifier,
  updateLlmConfig,
  loadWorkspacePath,
  createRun,
} = useMobileRunSetupController({
  context: toRef(props, 'context'),
  setupIntent: toRef(props, 'setupIntent'),
  onLaunched: (context) => emit('launched', context),
  onSetupIntentConsumed: (revision) => emit('setupIntentConsumed', revision),
})
</script>
