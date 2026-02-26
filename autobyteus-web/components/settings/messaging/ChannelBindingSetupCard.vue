<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">Channel Binding Setup</h3>
    <p class="mt-1 text-xs text-gray-500">
      Map incoming external identities to agent/team targets.
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

      <div class="md:col-span-3 rounded-md border border-gray-200 p-3">
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
      </div>

      <select
        v-model="draft.targetType"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm"
        data-testid="binding-target-type"
      >
        <option
          v-for="targetType in allowedTargetTypes"
          :key="targetType"
          :value="targetType"
        >
          {{ targetType }}
        </option>
      </select>

      <div class="md:col-span-2 flex items-center justify-end">
        <button
          class="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700"
          type="button"
          @click="onToggleTargetInputMode"
          data-testid="toggle-manual-target-input"
        >
          {{ useManualTargetInput ? 'Use Target Dropdown' : 'Use Manual Target ID' }}
        </button>
      </div>

      <select
        v-if="!useManualTargetInput"
        v-model="selectedTargetId"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-3"
        data-testid="binding-target-select"
      >
        <option value="">Select target</option>
        <option
          v-for="option in filteredTargetOptions"
          :key="`${option.targetType}:${option.targetId}`"
          :value="option.targetId"
        >
          {{ option.displayName }} ({{ option.targetId }})
        </option>
      </select>

      <input
        v-else
        v-model="draft.targetId"
        type="text"
        placeholder="targetId"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-3"
        data-testid="binding-target-id"
      />

    </div>

    <p
      v-if="showTargetOptionsInstruction"
      class="mt-2 text-xs text-amber-700"
      data-testid="target-options-instruction"
    >
      No active AGENT/TEAM runtime found. Start one first.
    </p>
    <p
      v-if="optionsStore.targetOptionsError"
      class="mt-2 text-xs text-red-600"
      data-testid="target-options-error"
    >
      {{ optionsStore.targetOptionsError }}
    </p>
    <p
      v-if="optionsStore.staleSelectionError"
      class="mt-2 text-sm text-red-600"
      data-testid="binding-stale-selection-error"
    >
      {{ optionsStore.staleSelectionError }}
    </p>

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
      <button
        class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm disabled:opacity-50"
        :disabled="optionsStore.isTargetOptionsLoading"
        @click="onRefreshTargetOptions"
        data-testid="refresh-target-options-button"
      >
        {{ optionsStore.isTargetOptionsLoading ? 'Refreshing...' : 'Refresh Targets' }}
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
    <p v-if="bindingStore.fieldErrors.targetId" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.targetId }}
    </p>
    <p v-if="bindingStore.fieldErrors.targetType" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.targetType }}
    </p>
    <p v-if="bindingStore.fieldErrors.transport" class="mt-1 text-sm text-red-600">
      {{ bindingStore.fieldErrors.transport }}
    </p>
    <p
      v-if="showTelegramAgentOnlyHint"
      class="mt-1 text-xs text-gray-600"
      data-testid="telegram-target-policy-hint"
    >
      Telegram setup currently supports AGENT targets only.
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
          <p class="text-xs text-gray-500 mt-1">
            target: {{ binding.targetType }} {{ binding.targetId }}
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
import { useMessagingChannelBindingSetupFlow } from '~/composables/useMessagingChannelBindingSetupFlow';

const {
  accountIdModel,
  bindingStore,
  buildPeerCandidateKey,
  canDiscoverPeers,
  discordAccountHint,
  draft,
  effectiveManualPeerInput,
  filteredTargetOptions,
  allowedTargetTypes,
  formatPeerCandidateLabel,
  onDeleteBinding,
  onRefreshPeerCandidates,
  onRefreshTargetOptions,
  onReloadBindings,
  onSaveBinding,
  onTogglePeerInputMode,
  onToggleTargetInputMode,
  optionsStore,
  peerDiscoveryProviderLabel,
  scopedBindings,
  selectedPeerKey,
  selectedTargetId,
  showDiscordIdentityHint,
  showTelegramAgentOnlyHint,
  showPeerDiscoveryInstruction,
  showTargetOptionsInstruction,
  supportsPeerDiscovery,
  useManualPeerInput,
  useManualTargetInput,
} = useMessagingChannelBindingSetupFlow();
</script>
