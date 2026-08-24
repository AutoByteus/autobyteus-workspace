<template>
  <section
    v-if="attachments.length"
    class="border-b border-blue-100 bg-blue-50 px-4 py-3"
    data-testid="mobile-composer-context-tray"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
        Context · {{ attachments.length }} file{{ attachments.length === 1 ? '' : 's' }}
      </p>
      <button type="button" class="text-xs font-semibold text-blue-700" @click="clearAll">
        Clear
      </button>
    </div>
    <div class="flex gap-2 overflow-x-auto pb-1">
      <span
        v-for="attachment in attachments"
        :key="attachment.id"
        class="inline-flex max-w-[16rem] shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-900 shadow-sm"
        data-testid="mobile-composer-context-item"
      >
        <span class="truncate font-semibold">{{ attachment.displayName }}</span>
        <button
          type="button"
          class="rounded-full bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700"
          :aria-label="`Remove ${attachment.displayName}`"
          @click="removeAttachment(attachment.id)"
        >
          ×
        </button>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import type { ContextAttachment } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const {
  getVisibleContextAttachments,
  removeVisibleContextAttachment,
  clearVisibleContextAttachments,
} = useMobileFileContextCoordinator();

const attachments = computed<ContextAttachment[]>(() => getVisibleContextAttachments(props.context));

function removeAttachment(attachmentId: string): void {
  removeVisibleContextAttachment(props.context, attachmentId);
}

function clearAll(): void {
  clearVisibleContextAttachments(props.context);
}
</script>
