<template>
  <!-- The phone's clipboard sheet for the node desktop in Control (autobyteus-426 REQ-005, DEC-007): Paste sends the text
       the user pastes here to the desktop's clipboard; Copy puts the desktop's last copied text on this phone, or shows it
       selectable when the phone does not allow that. Nothing reads or writes the phone's clipboard without a tap. -->
  <MobileBottomSheet :title="t('mobile.nodeDesktop.clipboard')" test-id="mobile-node-desktop-clipboard" @close="$emit('close')">
    <div class="space-y-6 px-4">
      <section class="space-y-2" data-testid="mobile-node-desktop-clipboard-paste">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('mobile.nodeDesktop.clipboard_paste_heading') }}</h3>
        <!-- A short viewport (landscape with the keyboard open, ≈ 150 px): Send sits beside a one-line field, so both stay
             visible while typing (autobyteus-435 REQ-006); taller viewports (portrait, with or without the keyboard) keep
             the field above Send. -->
        <div
          ref="pasteRow"
          class="flex flex-col gap-2 [@media(max-height:320px)]:flex-row [@media(max-height:320px)]:items-center"
          data-testid="mobile-node-desktop-clipboard-paste-row"
        >
          <textarea
            v-model="pasteText"
            rows="3"
            class="block w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 [@media(max-height:320px)]:h-11 [@media(max-height:320px)]:min-w-0 [@media(max-height:320px)]:flex-1"
            :aria-label="t('mobile.nodeDesktop.clipboard_paste_label')"
            :placeholder="t('mobile.nodeDesktop.clipboard_paste_label')"
            data-testid="mobile-node-desktop-clipboard-paste-input"
            @focus="onPasteFocus"
            @blur="onPasteBlur"
          />
          <button
            type="button"
            class="h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white active:bg-blue-700 disabled:opacity-40 [@media(max-height:320px)]:w-auto [@media(max-height:320px)]:flex-shrink-0"
            :disabled="!pasteText"
            data-testid="mobile-node-desktop-clipboard-send"
            @click="send"
          >
            {{ t('mobile.nodeDesktop.clipboard_send') }}
          </button>
        </div>
      </section>

      <section class="space-y-2" data-testid="mobile-node-desktop-clipboard-copy">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('mobile.nodeDesktop.clipboard_copy_heading') }}</h3>
        <p
          v-if="remoteText !== null"
          class="max-h-40 select-text overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          data-testid="mobile-node-desktop-clipboard-remote-text"
        >{{ remoteText }}</p>
        <p v-else class="text-sm text-slate-500" data-testid="mobile-node-desktop-clipboard-empty">{{ t('mobile.nodeDesktop.clipboard_copy_empty') }}</p>
        <button
          type="button"
          class="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-40"
          :disabled="remoteText === null"
          data-testid="mobile-node-desktop-clipboard-copy-button"
          @click="copy"
        >
          {{ copyState === 'copied' ? t('mobile.nodeDesktop.clipboard_copied') : t('mobile.nodeDesktop.clipboard_copy') }}
        </button>
        <p v-if="copyState === 'failed'" class="text-sm text-amber-800" role="status" data-testid="mobile-node-desktop-clipboard-fallback">
          {{ t('mobile.nodeDesktop.clipboard_copy_fallback') }}
        </p>
      </section>
    </div>
  </MobileBottomSheet>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import MobileBottomSheet from '~/components/mobile/MobileBottomSheet.vue';
import { useLocalization } from '~/composables/useLocalization';

const props = defineProps<{ remoteText: string | null }>();
const emit = defineEmits<{ (event: 'send', text: string): void; (event: 'close'): void }>();

const { t } = useLocalization();
const pasteText = ref('');
const copyState = ref<'idle' | 'copied' | 'failed'>('idle');
watch(() => props.remoteText, () => { copyState.value = 'idle'; });

const send = () => {
  if (!pasteText.value) return;
  emit('send', pasteText.value);
};

/**
 * The field's row (with Send) stays in view while the field has focus: the keyboard opens after the focus and shrinks
 * the page, so the row is brought into view on focus and again on each resize until the field loses focus.
 */
const pasteRow = ref<HTMLElement | null>(null);
const keepPasteRowInView = (): void => { pasteRow.value?.scrollIntoView({ block: 'nearest' }); };
const onPasteBlur = (): void => {
  window.removeEventListener('resize', keepPasteRowInView);
  window.visualViewport?.removeEventListener('resize', keepPasteRowInView);
};
const onPasteFocus = (): void => {
  keepPasteRowInView();
  window.addEventListener('resize', keepPasteRowInView);
  window.visualViewport?.addEventListener('resize', keepPasteRowInView);
};
onBeforeUnmount(onPasteBlur);

/**
 * Puts text on this phone's clipboard from the tap: the async clipboard where the page may use it (secure origins),
 * else a selected temporary textarea and `execCommand('copy')` (the Android WebView on an `http://` node).
 */
const copyTextToPhone = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Not allowed here; try the selection copy.
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
};

const copy = async () => {
  if (props.remoteText === null) return;
  copyState.value = await copyTextToPhone(props.remoteText) ? 'copied' : 'failed';
};
</script>
