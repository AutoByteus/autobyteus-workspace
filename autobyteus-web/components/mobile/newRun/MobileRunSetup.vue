<template>
  <!-- New run's rows (UIS-008, VIS-015, 028): Agent, Folder (with "Open a folder by path"), Runtime, Model and
       Auto approve tools, then Create run, disabled with the reason while something is missing. -->
  <form class="flex min-h-full flex-col" data-testid="mobile-run-setup" :inert="creating" :aria-busy="creating" @submit.prevent="createRun">
    <div class="flex-1">
      <MobileChoiceSheet v-model="selectedAgentId" label="Agent" :items="agentChoices" test-id="mobile-run-target-select" item-noun="agents" />
      <MobileChoiceSheet :model-value="selectedWorkspaceId" label="Folder" :items="workspaceChoices" test-id="mobile-run-workspace-select" item-noun="folders" @update:model-value="selectWorkspace">
        <template #footer>
          <div class="flex gap-2" data-testid="mobile-run-workspace-path-card">
            <input
              v-model="pathDraft"
              class="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-base"
              data-testid="mobile-run-workspace-path-input"
              placeholder="Open a folder by path"
              aria-label="Open a folder by path"
              autocomplete="off"
              :disabled="workspacePathLoading"
              @keydown.enter.prevent="openPath"
            >
            <button type="button" class="h-12 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white disabled:opacity-50" data-testid="mobile-run-workspace-load" :disabled="!pathDraft.trim() || workspacePathLoading" @click="openPath">
              {{ workspacePathLoading ? 'Loading…' : 'Open' }}
            </button>
          </div>
          <p v-if="workspaceError" class="mt-2 text-sm text-red-700" data-testid="mobile-run-workspace-error">{{ workspaceError }}</p>
        </template>
      </MobileChoiceSheet>
      <template v-if="agentConfig">
        <MobileRuntimeModelRows
          :runtime-kind="agentConfig.runtimeKind"
          :llm-model-identifier="agentConfig.llmModelIdentifier"
          :seed-model-identifier="agentSeedModelIdentifier"
          :llm-config="agentConfig.llmConfig"
          @update:runtime-kind="updateRuntimeKind"
          @update:llm-model-identifier="updateLlmModelIdentifier"
          @update:llm-config="updateLlmConfig"
        />
        <div class="flex h-14 items-center gap-3 border-b border-slate-100" data-testid="mobile-launch-run-options-card">
          <span id="mobile-run-auto-approve-label" class="flex-1 text-[0.9375rem] text-slate-500">Auto approve tools</span>
          <!-- The 56×32 track inside a 44px-tall hit area (QR-001). -->
          <button
            type="button"
            class="group flex h-11 w-14 shrink-0 items-center focus:outline-none disabled:opacity-60"
            role="switch"
            :aria-checked="autoApprove ? 'true' : 'false'"
            aria-labelledby="mobile-run-auto-approve-label"
            data-testid="mobile-run-auto-approve-tools-switch"
            :disabled="autoApproveLocked"
            @click="setAutoExecuteTools(!agentConfig.autoExecuteTools)"
          >
            <span class="relative inline-flex h-8 w-14 items-center rounded-full transition group-focus-visible:ring-2 group-focus-visible:ring-blue-300 group-focus-visible:ring-offset-2" :class="autoApprove ? 'bg-blue-600' : 'bg-slate-300'" aria-hidden="true">
              <span class="inline-block h-6 w-6 rounded-full bg-white shadow transition" :class="autoApprove ? 'translate-x-7' : 'translate-x-1'" />
            </span>
          </button>
        </div>
      </template>

      <p v-if="!canLaunch" class="mt-3 text-sm font-semibold text-amber-700" data-testid="mobile-run-setup-readiness">{{ blockingIssue }}</p>
      <p v-if="error" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="mobile-run-setup-error">{{ error }}</p>
    </div>

    <div class="sticky bottom-0 -mx-4 bg-white px-4 pb-1 pt-2">
      <button type="submit" class="h-14 w-full rounded-2xl bg-blue-600 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canLaunch || creating" data-testid="mobile-run-launch">
        {{ creating ? 'Creating…' : 'Create run' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MobileChoiceSheet from '~/components/mobile/newRun/MobileChoiceSheet.vue';
import MobileRuntimeModelRows from '~/components/mobile/newRun/MobileRuntimeModelRows.vue';
import { useMobileRunSetupController } from '~/composables/mobile/useMobileRunSetupController';
import { effectiveAutoExecuteTools, isAutoApproveLockedForRuntime } from '~/utils/agentRunRuntimeDraftPolicy';

const emit = defineEmits<{ launched: [runId: string] }>();

const {
  selectedAgentId, selectedWorkspaceId, creating, error, agentChoices, workspaceChoices, workspaceError, workspacePathLoading,
  agentConfig, agentSeedModelIdentifier, canLaunch, blockingIssue, selectWorkspace, setAutoExecuteTools,
  updateRuntimeKind, updateLlmModelIdentifier, updateLlmConfig, loadWorkspacePath, createRun,
} = useMobileRunSetupController({ onLaunched: (runId) => emit('launched', runId) });

const autoApproveLocked = computed(() => isAutoApproveLockedForRuntime(agentConfig.value?.runtimeKind ?? 'autobyteus'));
const autoApprove = computed(() => effectiveAutoExecuteTools(agentConfig.value?.runtimeKind ?? 'autobyteus', agentConfig.value?.autoExecuteTools ?? false));

const pathDraft = ref('');
const openPath = (): void => {
  const path = pathDraft.value.trim();
  if (!path) return;
  pathDraft.value = '';
  void loadWorkspacePath(path);
};
</script>
