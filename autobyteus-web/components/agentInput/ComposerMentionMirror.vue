<template>
  <!-- Background only: the native textarea owns the text, selection, undo and accessibility. Each
       chosen `@Name` still in the text is highlighted under the glyphs. -->
  <div
    v-if="parts.length && mentionNames.length"
    class="mention-mirror-viewport"
    aria-hidden="true"
    :style="{ width: `${metrics.width}px`, height: `${metrics.height}px` }"
    data-test="composer-mention-mirror"
  >
    <div
      class="mention-mirror"
      :style="{ padding, transform: `translate(${-metrics.scrollLeft}px, ${-metrics.scrollTop}px)` }"
    ><template v-for="(part, index) in parts" :key="index"><span
      :class="{ 'mention-highlight': part.kind === 'mention' }"
    >{{ part.kind === 'mention' ? '@' + part.value : part.value }}</span></template></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  mentionsPresentInText,
  splitMentionText,
  type RequestedCollaboratorMention,
} from '~/utils/collaborators/collaboratorMentionText'

export type ComposerMirrorMetrics = Readonly<{ width: number; height: number; scrollTop: number; scrollLeft: number }>

const props = defineProps<{
  text: string
  mentions: readonly RequestedCollaboratorMention[] | undefined
  /** The textarea's client box and scroll offsets. */
  metrics: ComposerMirrorMetrics
  /** The textarea's padding, so the highlight sits under the glyphs. */
  padding: string
}>()

const mentionNames = computed(() => mentionsPresentInText(props.text, props.mentions).map((mention) => mention.name))
const parts = computed(() => (mentionNames.value.length ? splitMentionText(props.text, mentionNames.value) : []))
</script>

<style scoped>
.mention-mirror-viewport {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
}
/* The same metrics as both composer textareas (0.9375rem / 24px, pre-wrap). */
.mention-mirror {
  box-sizing: border-box;
  width: 100%;
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 24px;
  letter-spacing: normal;
  tab-size: 8;
  text-align: start;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: normal;
  color: transparent;
}
.mention-highlight {
  background: #f0f9ff;
  box-shadow: inset 0 0 0 1px #bae6fd;
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
@media (forced-colors: active) {
  /* Native controls may paint an opaque Canvas even with a transparent CSS background. */
  .mention-mirror-viewport { z-index: 1; }
  .mention-mirror { forced-color-adjust: none; }
  .mention-highlight { background: transparent; box-shadow: inset 0 0 0 1px Highlight; }
}
</style>
