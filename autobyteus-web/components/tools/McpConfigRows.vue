<template>
  <div>
    <div class="space-y-3 mt-1">
      <div v-for="row in rows" :key="row.id" class="space-y-1" :data-testid="`mcp-row-${kind}`">
        <div class="flex items-center space-x-2">
          <input
            v-model="row.name"
            type="text"
            :readonly="isStoredHidden(row)"
            :placeholder="namePlaceholder"
            :aria-label="namePlaceholder"
            class="block w-full shadow-sm text-base border-gray-300 rounded-md p-2 font-mono read-only:bg-gray-100"
            data-testid="mcp-row-name"
            @input="onEdit(row)"
          >
          <span class="text-gray-500">{{ kind === 'env' ? '=' : ':' }}</span>
          <input
            v-model="row.value"
            :type="row.locked ? 'password' : 'text'"
            autocomplete="off"
            :placeholder="valuePlaceholder(row)"
            :aria-label="$t('tools.components.tools.McpConfigRows.value')"
            class="block w-full shadow-sm text-base border-gray-300 rounded-md p-2"
            data-testid="mcp-row-value"
            @input="onEdit(row)"
          >
          <!-- A saved plain value the user has not changed becomes a secret only through the move (with its backup). -->
          <button
            v-if="serverId && offersMove(row)"
            type="button"
            class="px-2 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
            data-testid="mcp-row-move"
            @click="$emit('move-to-vault', fieldOf(kind, row.name))"
          >{{ $t('tools.components.tools.McpConfigRows.move_to_vault') }}</button>
          <button
            v-else
            type="button"
            :disabled="alwaysSecret(row)"
            :aria-pressed="row.locked"
            :title="lockTitle(row)"
            :aria-label="lockTitle(row)"
            class="p-2 rounded-full disabled:cursor-not-allowed"
            :class="row.locked ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-400 hover:text-gray-600'"
            data-testid="mcp-row-lock"
            @click="toggleLock(row)"
          >
            <!-- Heroicons 20/solid lock-closed / lock-open, inline so they render offline. -->
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path v-if="row.locked" fill-rule="evenodd" clip-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" />
              <path v-else fill-rule="evenodd" clip-rule="evenodd" d="M14.5 1A4.5 4.5 0 0 0 10 5.5V9H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5V5.5a3 3 0 1 1 6 0v2.75a.75.75 0 0 0 1.5 0V5.5A4.5 4.5 0 0 0 14.5 1Z" />
            </svg>
          </button>
          <button
            type="button"
            :aria-label="$t('tools.components.tools.McpConfigRows.remove_row')"
            class="p-2 text-gray-500 hover:text-red-600 rounded-full"
            @click="removeRow(row.id)"
          >
            <!-- Heroicons 20/solid trash. -->
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" />
            </svg>
          </button>
        </div>
        <p v-if="rowNote(row)" class="text-sm pl-1" :class="rowNote(row)!.tone" data-testid="mcp-row-note">
          {{ rowNote(row)!.text }}
          <button
            v-if="serverId && moveMatch(row, kind, rule) && !offersMove(row)"
            type="button"
            class="ml-1 font-medium text-indigo-600 hover:text-indigo-800 underline"
            data-testid="mcp-row-note-move"
            @click="$emit('move-to-vault', fieldOf(kind, row.stored!.name))"
          >{{ $t('tools.components.tools.McpConfigRows.move_to_vault') }}</button>
        </p>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      @click="addRow"
    >
      {{ addLabel }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import {
  applySuggestedLock,
  emptyRow,
  fieldOf,
  isAlwaysSecretField,
  isKeepable,
  isStoredHidden,
  moveMatch,
  offersMove,
  type McpConfigRow,
  type McpRowKind,
  type McpSecretSuggestionRule,
} from '~/utils/mcp/mcpConfigRows';

/**
 * The env rows (stdio) or header rows (HTTP) of the MCP server form, each with its lock toggle. A locked row's value
 * is stored as an MCP secret; a stored secret is never shown, so its row starts empty and keeps the stored value
 * unless a new one is typed.
 */
const props = defineProps<{
  kind: McpRowKind;
  rule: McpSecretSuggestionRule | null;
  /** The saved server's ID (edit mode): enables "Move to vault" on stored plain values. */
  serverId: string | null;
}>();
defineEmits<{ (event: 'move-to-vault', field: string): void }>();

const rows = defineModel<McpConfigRow[]>({ required: true });
const { t } = useLocalization();

const key = 'tools.components.tools.McpConfigRows';
const namePlaceholder = computed(() => t(props.kind === 'env' ? `${key}.env_name` : `${key}.header_name`));
const addLabel = computed(() => t(props.kind === 'env' ? `${key}.add_variable` : `${key}.add_header`));

const alwaysSecret = (row: McpConfigRow) => isAlwaysSecretField(props.rule, fieldOf(props.kind, row.name));

const valuePlaceholder = (row: McpConfigRow) =>
  isKeepable(row) ? t(`${key}.leave_empty_to_keep`) : t(`${key}.value`);

const lockTitle = (row: McpConfigRow) => {
  if (alwaysSecret(row)) return t(`${key}.always_secret`);
  return row.locked ? t(`${key}.unlock_store_as_plain_text`) : t(`${key}.lock_store_as_secret`);
};

type Note = { text: string; tone: string };
const rowNote = (row: McpConfigRow): Note | null => {
  const stored = row.stored;
  if (stored && stored.name === row.name) {
    if (stored.state === 'MISSING') return { text: t(`${key}.needs_secret_missing`), tone: 'text-red-700' };
    if (stored.state === 'VAULT_UNAVAILABLE') return { text: t(`${key}.needs_secret_vault_unavailable`), tone: 'text-amber-700' };
    if (stored.state === 'CONFIGURED') {
      return row.locked ? { text: t(`${key}.stored_in_vault`), tone: 'text-gray-500' } : { text: t(`${key}.unlocking_replaces`), tone: 'text-amber-700' };
    }
    if (stored.plainValue === null) return { text: t(`${key}.stored_as_plain_text`), tone: 'text-amber-700' };
    if (!row.locked && moveMatch(row, props.kind, props.rule)) return { text: t(`${key}.looks_like_a_secret`), tone: 'text-amber-700' };
  }
  return null;
};

const onEdit = (row: McpConfigRow) => applySuggestedLock(row, props.kind, props.rule);

const toggleLock = (row: McpConfigRow) => {
  if (alwaysSecret(row)) return;
  row.lockTouched = true;
  row.locked = !row.locked;
};

const addRow = () => {
  rows.value = [...rows.value, emptyRow()];
};

const removeRow = (id: number) => {
  rows.value = rows.value.filter(row => row.id !== id);
};
</script>
