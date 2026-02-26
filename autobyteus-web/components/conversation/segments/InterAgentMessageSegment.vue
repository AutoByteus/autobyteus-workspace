<template>
  <div class="inter-agent-message my-2 px-1 text-slate-800 dark:text-slate-100">
    <div class="flex items-start gap-2">
      <div
        class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center text-slate-500 dark:text-slate-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          class="h-4 w-4"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path
            d="M3.5 6.25a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8.75L6 16v-2.75H5.5a2 2 0 0 1-2-2v-5Z"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8 9.75h.01M10 9.75h.01M12 9.75h.01"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <p
        data-testid="inter-agent-inline"
        class="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-800 dark:text-slate-100"
        :title="metadataTitle"
      >
        <span class="font-medium text-slate-600 dark:text-slate-300">From {{ displaySender }}:</span>
        <span class="ml-1">
          {{ segment.content }}
        </span>
      </p>
      <button
        type="button"
        data-testid="inter-agent-toggle"
        class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        :aria-expanded="showDetails ? 'true' : 'false'"
        :title="showDetails ? 'Hide details' : 'Show details'"
        @click="toggleDetails"
      >
        <svg
          class="h-3.5 w-3.5 transition-transform"
          :class="showDetails ? 'rotate-90' : ''"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.145 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.486 4.25a.75.75 0 0 1 0 1.08L8.27 14.79a.75.75 0 0 1-1.06-.02Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <div
      v-if="showDetails"
      data-testid="inter-agent-details"
      class="ml-7 mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400"
    >
      {{ segment.messageType }} · Intended role: {{ segment.recipientRoleName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { InterAgentMessageSegment } from '~/types/segments';

const props = defineProps<{
  segment: InterAgentMessageSegment;
  senderDisplayName?: string;
}>();
const showDetails = ref(false);

const toTitleCase = (value: string): string =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const toReadableSenderName = (value: string): string => {
  const raw = value.trim();
  if (!raw) {
    return 'Teammate';
  }
  const leaf = raw
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .pop() || raw;
  if (/^member[_-][a-f0-9]+$/i.test(leaf)) {
    return 'Teammate';
  }
  const parts = leaf.split('_').filter(Boolean);
  const maybeNumericSuffix = parts.length >= 3 ? parts[parts.length - 1] : '';
  if (maybeNumericSuffix && /^\d+$/.test(maybeNumericSuffix)) {
    return toTitleCase(parts[0] || leaf);
  }
  if (/^[a-z][a-z0-9]*$/.test(leaf)) {
    return `${leaf.charAt(0).toUpperCase()}${leaf.slice(1)}`;
  }
  if (leaf.includes('_') || leaf.includes('-') || /\s/.test(leaf)) {
    return toTitleCase(leaf);
  }
  return leaf;
};

const displaySender = computed(() => {
  const explicitName = props.senderDisplayName?.trim();
  if (explicitName) {
    return toReadableSenderName(explicitName);
  }
  return toReadableSenderName(props.segment.senderAgentId || '');
});

const metadataTitle = computed(() => {
  const sender = props.segment.senderAgentId || 'unknown';
  const messageType = props.segment.messageType || 'unknown';
  const recipient = props.segment.recipientRoleName || 'unknown';
  if (displaySender.value && displaySender.value !== sender) {
    return `From ${displaySender.value} (${sender}) · ${messageType} · Intended role: ${recipient}`;
  }
  return `From ${sender} · ${messageType} · Intended role: ${recipient}`;
});

const toggleDetails = (): void => {
  showDetails.value = !showDetails.value;
};
</script>
