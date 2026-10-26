<template>
  <div v-if="candidates.length > 0 || reviewOpen" class="mb-4">
    <div v-if="candidates.length > 0" class="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="mcp-secret-move-banner">
      <span class="flex items-center">
        {{ $t('tools.components.tools.McpSecretMoveBanner.values_look_like_secrets', { count: candidates.length }) }}
      </span>
      <span class="ml-4 flex items-center gap-4 whitespace-nowrap">
        <button type="button" class="font-medium text-gray-600 hover:text-gray-800" data-testid="mcp-secret-move-keep" @click="keepAsTheyAre">
          {{ $t('tools.components.tools.McpSecretMoveBanner.keep_as_they_are') }}
        </button>
        <button type="button" class="font-semibold text-indigo-700 hover:text-indigo-900 underline" data-testid="mcp-secret-move-review" @click="openReview">
          {{ $t('tools.components.tools.McpSecretMoveBanner.review_and_move') }}
        </button>
      </span>
    </div>

    <div v-if="reviewOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" :aria-label="$t('tools.components.tools.McpSecretMoveBanner.dialog_title')">
      <div class="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div class="border-b px-6 py-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ $t('tools.components.tools.McpSecretMoveBanner.dialog_title') }}</h3>
          <p class="mt-1 text-sm text-gray-500">{{ $t('tools.components.tools.McpSecretMoveBanner.dialog_description') }}</p>
        </div>

        <div v-if="!result" class="max-h-96 overflow-auto px-6 py-4">
          <ul class="space-y-2">
            <li v-for="candidate in reviewed" :key="keyOf(candidate)" class="flex items-center">
              <input :id="`move-${keyOf(candidate)}`" v-model="selected" :value="keyOf(candidate)" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded" data-testid="mcp-secret-move-candidate">
              <label :for="`move-${keyOf(candidate)}`" class="ml-3 text-sm text-gray-800">
                <span class="font-mono font-semibold">{{ candidate.serverId }}</span>
                <span class="font-mono"> · {{ candidate.field }}</span>
                <span class="ml-2 text-gray-500">({{ $t(`tools.components.tools.McpSecretMoveBanner.matched_by_${candidate.matchedBy.toLowerCase()}`) }})</span>
              </label>
            </li>
          </ul>
          <p class="mt-4 text-sm text-gray-500">{{ $t('tools.components.tools.McpSecretMoveBanner.backup_note') }}</p>
        </div>

        <div v-else class="px-6 py-4 text-sm text-gray-800 space-y-2" data-testid="mcp-secret-move-result">
          <p class="font-semibold">{{ $t('tools.components.tools.McpSecretMoveBanner.moved_count', { count: result.moved.length }) }}</p>
          <p v-if="result.backupPath">
            {{ $t('tools.components.tools.McpSecretMoveBanner.backup_written') }}
            <code class="block mt-1 break-all rounded bg-gray-100 px-2 py-1 font-mono text-xs">{{ result.backupPath }}</code>
          </p>
          <p v-if="result.backupPath" class="text-amber-800">{{ $t('tools.components.tools.McpSecretMoveBanner.backup_holds_plain_values') }}</p>
          <p v-if="result.skipped.length > 0" class="text-gray-600">
            {{ $t('tools.components.tools.McpSecretMoveBanner.skipped', { fields: result.skipped.map(item => `${item.serverId} ${item.field}`).join(', ') }) }}
          </p>
          <div v-if="result.serversFailingAfterMove.length > 0" class="text-red-700">
            <p>{{ $t('tools.components.tools.McpSecretMoveBanner.servers_failing') }}</p>
            <ul class="mt-1 list-disc pl-5">
              <li v-for="failure in result.serversFailingAfterMove" :key="failure.serverId"><span class="font-mono">{{ failure.serverId }}</span>: {{ failure.reason }}</li>
            </ul>
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button type="button" class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium" @click="closeReview">
            {{ result ? $t('tools.components.tools.McpSecretMoveBanner.close') : $t('tools.components.tools.McpSecretMoveBanner.cancel') }}
          </button>
          <button v-if="!result" type="button" :disabled="store.getLoading" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-sm font-semibold" data-testid="mcp-secret-move-confirm" @click="move">
            {{ selected.length === 0
              ? $t('tools.components.tools.McpSecretMoveBanner.keep_as_they_are')
              : $t('tools.components.tools.McpSecretMoveBanner.move_selected', { count: selected.length }) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { mcpSecretReviewState, reviewKeyOf } from '~/utils/mcp/mcpSecretReviewState';
import type { McpSecretMoveCandidate, McpSecretMoveResult } from '~/types/mcpServer';
import type { ToastType } from '~/composables/useToasts';

/**
 * "N values look like secrets but are stored as plain text → Review and move to vault" (a user-triggered
 * maintenance action, never automatic). It shows only candidates the user has not reviewed (MDEC-006): unticking one in
 * the dialog and confirming, or "Keep as they are", marks it reviewed (`mcpSecretReviewState`). The dialog lists the
 * candidates (no values), and the result names the backup the server wrote first, which holds the plain values.
 */
const emit = defineEmits<{ (event: 'show-toast', toast: { message: string; type: ToastType }): void }>();
const store = useToolManagementStore();

const nodeContext = useWindowNodeContextStore();
/** The review state is kept per node, by its entry ID (stable across URL or port changes). */
const nodeKey = computed(() => nodeContext.entryId);
const candidates = computed(() => {
  const reviewed = mcpSecretReviewState.read(nodeKey.value);
  return store.getSecretMoveCandidates.filter(candidate => !reviewed.has(reviewKeyOf(candidate)));
});
const markReviewed = (fields: Array<{ serverId: string; field: string }>) =>
  mcpSecretReviewState.markReviewed(nodeKey.value, fields, store.getMcpServers.map(server => server.serverId));
const reviewOpen = ref(false);
const reviewed = ref<McpSecretMoveCandidate[]>([]);
const selected = ref<string[]>([]);
const result = ref<McpSecretMoveResult | null>(null);

const keyOf = reviewKeyOf;

const keepAsTheyAre = () => markReviewed(candidates.value);

const openReview = () => {
  reviewed.value = [...candidates.value];
  selected.value = reviewed.value.map(keyOf);
  result.value = null;
  reviewOpen.value = true;
};

const closeReview = () => {
  reviewOpen.value = false;
  result.value = null;
};

const move = async () => {
  const selection = reviewed.value
    .filter(candidate => selected.value.includes(keyOf(candidate)))
    .map(({ serverId, field }) => ({ serverId, field }));
  // The rows the user unticked stay plain on purpose: the banner does not offer them again.
  markReviewed(reviewed.value.filter(candidate => !selected.value.includes(keyOf(candidate))));
  if (selection.length === 0) {
    closeReview();
    return;
  }
  try {
    result.value = await store.moveMcpSecretsToVault(selection);
  } catch (e: any) {
    emit('show-toast', { message: e.message, type: 'error' as ToastType });
  }
};
</script>
