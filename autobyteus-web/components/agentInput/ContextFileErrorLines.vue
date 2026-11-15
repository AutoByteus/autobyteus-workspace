<template>
  <div
    v-if="messages.length > 0"
    role="alert"
    data-testid="context-file-error"
    class="mb-2 px-1 text-xs text-red-600 break-words space-y-0.5"
  >
    <p v-for="(message, index) in messages" :key="index" data-testid="context-file-error-line">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ContextAttachmentComposerErrorLine } from '~/composables/useContextAttachmentComposer';
import { useLocalization } from '~/composables/useLocalization';
import { contextFileFailureMessage } from '~/utils/contextFiles/contextFileFailureMessage';

const props = defineProps<{ lines: ContextAttachmentComposerErrorLine[] }>();

const { t, resolvedLocale } = useLocalization();
const KEYS = 'agentInput.components.agentInput.ContextFilePathInputArea';

/** One localized sentence per line; the composer already grouped the failures. Never any server text. */
const messages = computed((): string[] =>
  props.lines.map((line) => {
    switch (line.kind) {
      case 'uploads_unavailable':
        return t(`${KEYS}.uploads_unavailable`);
      case 'remove_failed':
        return t(`${KEYS}.remove_failed`, { name: line.fileNames.join(', ') });
      default:
        return contextFileFailureMessage(line.group, t, resolvedLocale.value);
    }
  }),
);
</script>
