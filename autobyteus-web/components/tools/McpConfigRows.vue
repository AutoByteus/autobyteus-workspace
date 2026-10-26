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
          <button
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
            <span :class="row.locked ? 'i-heroicons-lock-closed-20-solid' : 'i-heroicons-lock-open-20-solid'" class="w-5 h-5"></span>
          </button>
          <button
            type="button"
            :aria-label="$t('tools.components.tools.McpConfigRows.remove_row')"
            class="p-2 text-gray-500 hover:text-red-600 rounded-full"
            @click="removeRow(row.id)"
          >
            <span class="i-heroicons-trash-20-solid w-5 h-5"></span>
          </button>
        </div>
        <p v-if="rowNote(row)" class="text-sm pl-1" :class="rowNote(row)!.tone" data-testid="mcp-row-note">
          {{ rowNote(row)!.text }}
          <button
            v-if="serverId && moveMatch(row, kind, rule)"
            type="button"
            class="ml-1 font-medium text-indigo-600 hover:text-indigo-800 underline"
            data-testid="mcp-row-move"
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
      <span class="i-heroicons-plus-20-solid w-5 h-5 mr-1 text-gray-500"></span>{{ addLabel }}</button>
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
