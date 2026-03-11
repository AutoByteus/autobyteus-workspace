<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">Channel Binding Setup</h3>
    <p class="mt-1 text-xs text-gray-500">
      Bind the selected provider scope either to an agent definition with a saved launch preset or
      to an agent team definition with a saved launch preset.
    </p>

    <div
      v-if="bindingStore.capabilityBlocked"
      class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
      data-testid="binding-capability-blocked"
    >
      {{ bindingStore.capabilities.reason || 'Binding API is unavailable on the current server.' }}
    </div>

    <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <p class="text-xs text-gray-500">Provider</p>
        <p class="font-medium text-gray-800" data-testid="binding-provider">{{ draft.provider }}</p>
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <p class="text-xs text-gray-500">Transport</p>
        <p class="font-medium text-gray-800" data-testid="binding-transport">{{ draft.transport }}</p>
      </div>

      <input
        v-model="accountIdModel"
        type="text"
        placeholder="accountId"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm"
        data-testid="binding-account-id"
      />
    </div>

    <div class="mt-3 rounded-md border border-gray-200 p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-gray-800">Peer Selection</p>
        <button
          v-if="supportsPeerDiscovery"
          class="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700"
          type="button"
          @click="onTogglePeerInputMode"
          data-testid="toggle-manual-peer-input"
        >
          {{ useManualPeerInput ? 'Use Peer Dropdown' : 'Use Manual Peer ID' }}
        </button>
      </div>

      <div v-if="!effectiveManualPeerInput" class="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <select
          v-model="selectedPeerKey"
          class="rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="binding-peer-select"
        >
          <option value="">Select peer</option>
          <option
            v-for="candidate in optionsStore.peerCandidates"
            :key="buildPeerCandidateKey(candidate)"
            :value="buildPeerCandidateKey(candidate)"
          >
            {{ formatPeerCandidateLabel(candidate) }}
          </option>
        </select>
        <button
          class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
          type="button"
          :disabled="optionsStore.isPeerCandidatesLoading || !canDiscoverPeers"
          @click="onRefreshPeerCandidates"
          data-testid="refresh-peer-candidates-button"
        >
          {{ optionsStore.isPeerCandidatesLoading ? 'Refreshing...' : 'Refresh Peers' }}
        </button>
      </div>

      <div v-else class="mt-2">
        <input
          v-model="draft.peerId"
          type="text"
          placeholder="peerId"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="binding-peer-id"
        />
      </div>

      <div class="mt-2">
        <input
          v-model="draft.threadId"
          type="text"
          placeholder="threadId (optional)"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="binding-thread-id"
        />
      </div>

      <p
        v-if="!supportsPeerDiscovery"
        class="mt-2 text-xs text-gray-600"
        data-testid="peer-discovery-unavailable"
      >
        Peer discovery is not available for this provider/transport. Enter peer ID manually.
      </p>

      <p
        v-if="showPeerDiscoveryInstruction"
        class="mt-2 text-xs text-amber-700"
        data-testid="peer-discovery-instruction"
      >
        Send a {{ peerDiscoveryProviderLabel }} message from another account/contact to this linked
        account, then refresh peers.
      </p>
      <div
        v-if="supportsPeerDiscovery && !effectiveManualPeerInput && !canDiscoverPeers"
        class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
        data-testid="peer-discovery-recovery-hint"
      >
        Peer discovery is unavailable because the managed gateway is not ready. Recover the gateway
        above or switch to manual peer ID to continue.
        <button
          type="button"
          class="ml-2 rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800"
          data-testid="peer-discovery-manual-fallback-button"
          @click="onTogglePeerInputMode"
        >
          Switch to Manual Peer ID
        </button>
      </div>
      <p
        v-if="optionsStore.staleSelectionError"
        class="mt-2 text-xs text-red-600"
        data-testid="peer-selection-stale-error"
      >
        {{ optionsStore.staleSelectionError }}
      </p>
      <p
        v-if="optionsStore.peerCandidatesError"
        class="mt-2 text-xs text-red-600"
        data-testid="peer-candidates-error"
      >
        {{ optionsStore.peerCandidatesError }}
      </p>
      <p
        v-if="showDiscordIdentityHint"
        class="mt-2 text-xs text-gray-600"
        data-testid="discord-identity-hint"
      >
        For Discord, use <code>user:&lt;snowflake&gt;</code> for DMs or
        <code>channel:&lt;snowflake&gt;</code> for guild channels. <code>threadId</code> is optional and only
        valid with <code>channel:</code> peers.
        <span v-if="discordAccountHint"> Account ID should be <code>{{ discordAccountHint }}</code>.</span>
      </p>
      <p
        v-if="showTeamResponsePolicyHint"
        class="mt-2 text-xs text-gray-600"
        data-testid="team-response-policy-hint"
      >
        Only the team coordinator or entry node sends replies back to the messaging app.
      </p>
    </div>

    <div class="mt-4 rounded-md border border-gray-200 p-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Target Type</label>
          <select
            v-model="draft.targetType"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="binding-target-type"
          >
            <option
              v-for="targetType in allowedTargetTypes"
              :key="targetType"
              :value="targetType"
            >
              {{ targetType === 'AGENT' ? 'Agent Definition' : 'Agent Team' }}
            </option>
          </select>
        </div>

        <div v-if="draft.targetType === 'TEAM'">
          <div class="flex items-center justify-between gap-2">
            <label class="block text-xs font-medium text-gray-600">Team Definition</label>
            <button
              type="button"
              class="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
              :disabled="bindingStore.isTeamDefinitionOptionsLoading"
              data-testid="reload-team-definitions-button"
              @click="reloadTeamDefinitionOptions"
            >
              {{ bindingStore.isTeamDefinitionOptionsLoading ? 'Refreshing...' : 'Refresh Team Definitions' }}
            </button>
          </div>
          <select
            v-model="draft.targetTeamDefinitionId"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="binding-team-definition-select"
          >
            <option value="">Select team definition</option>
            <option
              v-for="option in teamDefinitionOptions"
              :key="option.teamDefinitionId"
              :value="option.teamDefinitionId"
            >
              {{ formatTeamDefinitionOptionLabel(option) }}
            </option>
          </select>
          <p
            v-if="bindingStore.teamDefinitionOptionsError"
            class="mt-1 text-xs text-red-600"
            data-testid="team-definition-options-error"
          >
            {{ bindingStore.teamDefinitionOptionsError }}
          </p>
          <p
            v-else-if="teamDefinitionOptions.length === 0 && !bindingStore.isTeamDefinitionOptionsLoading"
            class="mt-1 text-xs text-gray-500"
            data-testid="team-definition-options-empty"
          >
            No team definitions are available yet. Create a team definition first, then return here to bind it.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 rounded-md border border-gray-200 p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-gray-800">Launch Preset</p>
        <p class="text-xs text-gray-500">
          Saved with the binding and reused when the bound agent or team is started automatically.
        </p>
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-if="draft.targetType === 'AGENT'">
          <label class="block text-xs font-medium text-gray-600 mb-1">Agent Definition</label>
          <select
            v-model="draft.targetAgentDefinitionId"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="binding-agent-definition-select"
          >
            <option value="">Select agent</option>
            <option
              v-for="definition in agentDefinitionOptions"
              :key="definition.id"
              :value="definition.id"
            >
              {{ definition.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Runtime</label>
          <select
            :value="selectedLaunchPreset.runtimeKind"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="binding-runtime-kind-select"
            @change="updateRuntimeKind(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="option in runtimeOptions"
              :key="option.value"
              :value="option.value"
              :disabled="!option.enabled"
            >
              {{ option.label }}
            </option>
          </select>
          <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
            {{ selectedRuntimeUnavailableReason }}
          </p>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 mb-1">LLM Model</label>
          <SearchableGroupedSelect
            :model-value="selectedLaunchPreset.llmModelIdentifier"
            :options="groupedModelOptions"
            placeholder="Select a model..."
            search-placeholder="Search models..."
            data-testid="binding-model-select"
            @update:modelValue="updateModel"
          />
        </div>

        <div class="md:col-span-2 rounded-md border border-gray-100 bg-gray-50 p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium text-gray-700">Workspace</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md border px-2 py-1 text-xs"
                :class="workspaceSelectionMode === 'existing' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'"
                data-testid="binding-workspace-existing-mode"
                @click="setWorkspaceSelectionMode('existing')"
              >
                Select Existing
              </button>
              <button
                type="button"
                class="rounded-md border px-2 py-1 text-xs"
                :class="workspaceSelectionMode === 'path' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'"
                data-testid="binding-workspace-path-mode"
                @click="setWorkspaceSelectionMode('path')"
              >
                Enter Path
              </button>
            </div>
          </div>

          <div v-if="workspaceSelectionMode === 'existing'" class="mt-2">
            <select
              v-model="selectedWorkspaceId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              data-testid="binding-workspace-select"
            >
              <option value="">Select workspace</option>
              <option
                v-for="workspace in workspaceOptions"
                :key="workspace.workspaceId"
                :value="workspace.workspaceId"
              >
                {{ workspace.label }}
              </option>
            </select>
          </div>

          <div v-else class="mt-2">
            <input
              v-model="selectedLaunchPreset.workspaceRootPath"
              type="text"
              placeholder="/absolute/path/to/workspace"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              data-testid="binding-workspace-path-input"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 py-2">
          <label class="block text-sm text-gray-900 select-none" for="binding-auto-execute">
            Auto approve tools
          </label>
          <button
            id="binding-auto-execute"
            type="button"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="selectedLaunchPreset.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
            data-testid="binding-auto-execute-toggle"
            @click="updateAutoExecute(!selectedLaunchPreset.autoExecuteTools)"
          >
            <span class="sr-only">Auto approve tools</span>
            <span
              aria-hidden="true"
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="selectedLaunchPreset.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div v-if="showSkillAccessControl">
          <label class="block text-xs font-medium text-gray-600 mb-1">Skill Access</label>
          <select
            :value="draft.launchPreset.skillAccessMode || 'PRELOADED_ONLY'"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="binding-skill-access-select"
            @change="updateSkillAccessMode(($event.target as HTMLSelectElement).value)"
          >
            <option value="PRELOADED_ONLY">Configured skills only (Recommended)</option>
            <option value="GLOBAL_DISCOVERY">All installed skills</option>
            <option value="NONE">No skills</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <ModelConfigSection
            :schema="modelConfigSchema"
            :model-config="selectedLaunchPreset.llmConfig"
            :disabled="!selectedLaunchPreset.llmModelIdentifier"
            :apply-defaults="true"
            :clear-on-empty-schema="true"
            @update:config="updateModelConfig"
          />
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <button
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        :disabled="bindingStore.isMutating || bindingStore.capabilityBlocked"
        @click="onSaveBinding"
        data-testid="save-binding-button"
      >
        {{ bindingStore.isMutating ? 'Saving...' : 'Save Binding' }}
      </button>
      <button
        class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm"
        :disabled="bindingStore.isLoading"
        @click="onReloadBindings"
        data-testid="reload-bindings-button"
      >
        Reload
      </button>
    </div>

    <p v-if="bindingStore.fieldErrors.accountId" class="mt-2 text-sm text-red-600">
      {{ bindingStore.fieldErrors.accountId }}
    </p>
    <p v-if="bindingStore.fieldErrors.peerId" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.peerId }}
    </p>
    <p v-if="bindingStore.fieldErrors.threadId" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.threadId }}
    </p>
    <p v-if="bindingStore.fieldErrors.targetAgentDefinitionId" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.targetAgentDefinitionId }}
    </p>
    <p v-if="bindingStore.fieldErrors.targetTeamDefinitionId" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.targetTeamDefinitionId }}
    </p>
    <p v-if="bindingStore.fieldErrors.workspaceRootPath" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.workspaceRootPath }}
    </p>
    <p v-if="bindingStore.fieldErrors.llmModelIdentifier" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.llmModelIdentifier }}
    </p>
    <p v-if="bindingStore.fieldErrors.runtimeKind" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.runtimeKind }}
    </p>
    <p v-if="bindingStore.fieldErrors.targetType" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.targetType }}
    </p>
    <p v-if="bindingStore.fieldErrors.transport" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.transport }}
    </p>
    <p v-if="bindingStore.error" class="mt-2 text-sm text-red-600" data-testid="binding-error">
      {{ bindingStore.error }}
    </p>

    <ul class="mt-3 space-y-2">
      <li
        v-for="binding in scopedBindings"
        :key="binding.id"
        class="flex items-start justify-between gap-2 rounded-md border border-gray-200 p-3"
      >
        <div class="min-w-0">
          <p class="text-sm text-gray-800">
            {{ binding.provider }} / {{ binding.transport }} / {{ binding.accountId }} /
            {{ binding.peerId }}
          </p>
          <p class="text-xs text-gray-600 mt-1">
            target {{ binding.targetType.toLowerCase() }}: {{ formatBindingTargetLabel(binding) }}
          </p>
          <p v-if="binding.targetType === 'AGENT' && binding.launchPreset" class="text-xs text-gray-500 mt-1">
            runtime: {{ binding.launchPreset.runtimeKind }} | model:
            {{ binding.launchPreset.llmModelIdentifier }} | workspace:
            {{ binding.launchPreset.workspaceRootPath }}
            <span v-if="binding.threadId"> | thread: {{ binding.threadId }}</span>
          </p>
          <p v-else-if="binding.targetType === 'TEAM' && binding.teamLaunchPreset" class="text-xs text-gray-500 mt-1">
            runtime: {{ binding.teamLaunchPreset.runtimeKind }} | model:
            {{ binding.teamLaunchPreset.llmModelIdentifier }} | workspace:
            {{ binding.teamLaunchPreset.workspaceRootPath }} | cached team run:
            {{ binding.teamRunId || 'not started yet' }}
            <span v-if="binding.threadId"> | thread: {{ binding.threadId }}</span>
          </p>
        </div>
        <button
          class="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-xs disabled:opacity-50"
          :disabled="bindingStore.isMutating || bindingStore.capabilityBlocked"
          @click="onDeleteBinding(binding.id)"
          :data-testid="`delete-binding-${binding.id}`"
        >
          Delete
        </button>
      </li>
    </ul>
    <p
      v-if="scopedBindings.length === 0"
      class="mt-2 text-xs text-gray-500"
      data-testid="binding-scope-empty"
    >
      No bindings found for the selected provider scope.
    </p>
  </section>
</template>

<script setup lang="ts">
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue';
import ModelConfigSection from '~/components/workspace/config/ModelConfigSection.vue';
import { useMessagingChannelBindingSetupFlow } from '~/composables/useMessagingChannelBindingSetupFlow';

const {
  accountIdModel,
  allowedTargetTypes,
  agentDefinitionOptions,
  bindingStore,
  buildPeerCandidateKey,
  canDiscoverPeers,
  discordAccountHint,
  draft,
  effectiveManualPeerInput,
  formatBindingTargetLabel,
  formatPeerCandidateLabel,
  formatTeamDefinitionOptionLabel,
  groupedModelOptions,
  modelConfigSchema,
  onDeleteBinding,
  onRefreshPeerCandidates,
  onReloadBindings,
  onSaveBinding,
  onTogglePeerInputMode,
  optionsStore,
  peerDiscoveryProviderLabel,
  reloadTeamDefinitionOptions,
  scopedBindings,
  selectedLaunchPreset,
  selectedPeerKey,
  selectedRuntimeUnavailableReason,
  selectedWorkspaceId,
  setWorkspaceSelectionMode,
  showSkillAccessControl,
  showDiscordIdentityHint,
  showPeerDiscoveryInstruction,
  showTeamResponsePolicyHint,
  supportsPeerDiscovery,
  teamDefinitionOptions,
  updateAutoExecute,
  updateModel,
  updateModelConfig,
  updateRuntimeKind,
  updateSkillAccessMode,
  useManualPeerInput,
  workspaceOptions,
  workspaceSelectionMode,
  runtimeOptions,
} = useMessagingChannelBindingSetupFlow();
</script>
