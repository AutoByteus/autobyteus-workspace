<template>
  <!-- VNC Viewer on the phone (autobyteus-407): the paired node's node desktop, View only and fitted by default;
       zoom and pan in View only; Control by a deliberate switch, with a keyboard bridge; in-page full screen. -->
  <section
    class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900"
    data-testid="mobile-node-desktop"
    :data-mode="mode"
    :data-full-screen="fullScreen ? 'true' : 'false'"
  >
    <template v-if="!fullScreen">
      <MobileScreenBar :title="t('mobile.nodeDesktop.title')" @back="$emit('back')">
        <template #actions>
          <button
            v-if="mode === 'view' && scale > 1"
            type="button"
            :class="barButtonClass"
            data-testid="mobile-node-desktop-fit"
            @click="resetZoom"
          >
            {{ t('mobile.nodeDesktop.fit') }}
          </button>
          <button
            v-if="mode === 'control' && isConnected"
            type="button"
            :class="barButtonClass"
            data-testid="mobile-node-desktop-keyboard"
            @click="openKeyboard"
          >
            {{ t('mobile.nodeDesktop.keyboard') }}
          </button>
          <button
            type="button"
            :class="[barButtonClass, mode === 'control' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800']"
            :aria-pressed="mode === 'control'"
            :disabled="!isConnected"
            data-testid="mobile-node-desktop-mode"
            @click="toggleMode"
          >
            {{ mode === 'control' ? t('mobile.nodeDesktop.control') : t('mobile.nodeDesktop.view_only') }}
          </button>
          <button
            type="button"
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :aria-label="t('mobile.nodeDesktop.full_screen')"
            data-testid="mobile-node-desktop-full-screen"
            @click="navigation.openDesktopFullScreen()"
          >
            <Icon icon="heroicons:arrows-pointing-out-20-solid" class="h-5 w-5" aria-hidden="true" />
          </button>
        </template>
      </MobileScreenBar>
      <div class="flex min-h-[2.5rem] flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-1" data-testid="mobile-node-desktop-status-bar">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="statusDotClass" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-sm text-slate-600" role="status" data-testid="mobile-node-desktop-status">{{ statusText }}</span>
        <button
          v-if="offer"
          type="button"
          class="h-9 flex-shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white active:bg-blue-700"
          data-testid="mobile-node-desktop-connect"
          @click="openViewOnly"
        >
          {{ t(`workspace.components.workspace.tools.NodeDesktopTile.${offer}`) }}
        </button>
      </div>
    </template>

    <div class="relative min-h-0 flex-1 overflow-hidden bg-[#1e1e1e]" data-testid="mobile-node-desktop-stage">
      <div class="absolute inset-0 origin-top-left" :style="{ transform: mode === 'view' ? transform : 'none' }" data-testid="mobile-node-desktop-picture">
        <div ref="screen" class="node-desktop-display absolute inset-0" />
      </div>
      <!-- View only: gestures transform the picture and never reach the desktop. -->
      <div
        v-if="mode === 'view'"
        ref="gestureLayer"
        class="absolute inset-0 touch-none select-none"
        data-testid="mobile-node-desktop-gestures"
      />
      <!-- Control in full screen: a tap on the desktop is a click, so the controls come back from this handle,
           which is outside noVNC's canvas. -->
      <button
        v-if="fullScreen && mode === 'control'"
        type="button"
        class="absolute left-1/2 top-0 z-10 h-7 -translate-x-1/2 rounded-b-lg bg-slate-900/70 px-4 text-xs font-medium text-white"
        data-testid="mobile-node-desktop-handle"
        @click="leaveFullScreen"
      >
        {{ t('mobile.nodeDesktop.show_controls') }}
      </button>
      <p
        v-if="fullScreen && !isConnected"
        class="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-sm text-slate-200"
        role="status"
        data-testid="mobile-node-desktop-full-screen-status"
      >
        {{ statusText }}
      </p>
    </div>

    <!-- The keyboard bridge (Control): soft keyboards report keys as `Unidentified`, so typing is read from this
         textarea's value. It is reset to a sentinel, not to empty, so a Backspace always deletes something. -->
    <textarea
      v-if="mode === 'control'"
      ref="keyboardInput"
      class="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      inputmode="text"
      :aria-label="t('mobile.nodeDesktop.keyboard_input')"
      data-testid="mobile-node-desktop-keyboard-input"
      @input="onKeyboardInput"
      @compositionstart="composing = true"
      @compositionend="onCompositionEnd"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import { useNodeDesktopZoom } from '~/composables/mobile/useNodeDesktopZoom';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useLocalization } from '~/composables/useLocalization';
import { useNodeDesktopConnection } from '~/composables/useNodeDesktopConnection';
import { useVncSession } from '~/composables/useVncSession';

defineEmits<{ (event: 'back'): void }>();

const { t } = useLocalization();
const navigation = useMobileNavigation();
const session = useVncSession();
const { isConnected, isConnecting, mode, streamEnd, typeText, pressKey } = session;

const screen = ref<HTMLElement | null>(null);
const gestureLayer = ref<HTMLElement | null>(null);
const keyboardInput = ref<HTMLTextAreaElement | null>(null);
const { offer, openViewOnly, switchMode } = useNodeDesktopConnection(session, screen);

const fullScreen = computed(() => navigation.desktopFullScreen.value);
const leaveFullScreen = () => { void navigation.back(); };
const { scale, transform, reset: resetZoom } = useNodeDesktopZoom(gestureLayer, {
  // View only, full screen: one tap anywhere shows the controls again.
  onSingleTap: () => { if (fullScreen.value) leaveFullScreen(); },
});

const barButtonClass = 'h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700 active:bg-slate-100 disabled:opacity-40';

const statusText = computed(() => {
  if (isConnected.value) {
    return mode.value === 'view'
      ? t('workspace.components.workspace.tools.NodeDesktopTile.connected_view_only')
      : t('workspace.components.workspace.tools.NodeDesktopTile.connected_control');
  }
  if (isConnecting.value) return t('workspace.components.workspace.tools.NodeDesktopTile.connecting');
  if (streamEnd.value) return t(streamEnd.value.messageKey);
  return t('workspace.components.workspace.tools.NodeDesktopTile.disconnected');
});
const statusDotClass = computed(() => (isConnected.value ? 'bg-emerald-500' : isConnecting.value ? 'bg-amber-400' : 'bg-red-500'));

const toggleMode = () => {
  resetZoom();
  switchMode(mode.value === 'view' ? 'control' : 'view');
};

// The keyboard bridge (AR-S3-002, AR-S3-009).
const SENTINEL = '_'.repeat(32);
const composing = ref(false);
let lastValue = SENTINEL;

const resetKeyboardInput = () => {
  const input = keyboardInput.value;
  if (!input) return;
  input.value = SENTINEL;
  input.setSelectionRange(SENTINEL.length, SENTINEL.length);
  lastValue = SENTINEL;
};

/** Must run inside the tap: Android opens the soft keyboard only from a user gesture. */
const openKeyboard = () => {
  resetKeyboardInput();
  keyboardInput.value?.focus();
};

/**
 * Sends what changed since the last value: deletions as Backspace, the rest as text (`\n` Enter, `\t` Tab).
 * The node's caret is where the local caret is: text after the local caret that the last value also ended
 * with was not edited. (Gboard puts the caret back inside the sentinel after a Backspace and our reset, so
 * the next letter is inserted before the sentinel's last character.)
 */
const onKeyboardInput = () => {
  const input = keyboardInput.value;
  if (!input) return;
  const value = input.value;
  const caret = input.selectionEnd ?? value.length;
  const untouched = lastValue.endsWith(value.slice(caret)) ? value.length - caret : 0;
  const before = lastValue.slice(0, lastValue.length - untouched);
  const now = value.slice(0, value.length - untouched);
  let common = 0;
  while (common < before.length && common < now.length && before[common] === now[common]) common += 1;
  for (let removed = before.length - common; removed > 0; removed -= 1) pressKey('Backspace');
  const added = now.slice(common);
  if (added) typeText(added);
  lastValue = value;
  if (!composing.value) resetKeyboardInput();
};

const onCompositionEnd = () => {
  composing.value = false;
  onKeyboardInput();
};
</script>

<style scoped>
:deep(.node-desktop-display canvas) {
  max-width: 100%;
  object-fit: contain;
}
</style>
