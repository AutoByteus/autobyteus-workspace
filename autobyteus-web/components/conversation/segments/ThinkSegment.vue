<template>
  <div class="think-segment">
    <button @click="toggle" class="think-toggle-button" :class="{ 'is-active': showContent }">
      <Icon icon="mdi:lightbulb-on-outline" class="think-icon" />
      <span class="button-text">Thinking</span>
      <Icon 
        icon="mdi:chevron-right" 
        class="chevron-icon" 
        :class="{ 'is-expanded': showContent }" 
      />
    </button>
    <transition name="fade-slide">
      <div v-if="showContent" class="think-content">
        <MarkdownRenderer :content="content" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';

const props = defineProps<{ content: string }>();
const showContent = ref(false);

const toggle = () => {
  showContent.value = !showContent.value;
};
</script>

<style scoped>
.think-segment {
  margin: 0.5em 0;
}

.think-toggle-button {
  background-color: #eff6ff; /* blue-50 */
  color: #3b82f6; /* blue-500 */
  border: 1px solid #dbeafe; /* blue-100 */
  padding: 0.35em 0.85em;
  cursor: pointer;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  user-select: none;
}

.think-toggle-button:hover {
  background-color: #dbeafe; /* blue-100 */
  border-color: #bfdbfe; /* blue-200 */
}

.think-toggle-button.is-active {
  background-color: #dbeafe; /* blue-100 */
  border-color: #bfdbfe; /* blue-200 */
}

.think-icon {
  font-size: 1.1em;
  color: inherit;
}

.chevron-icon {
  font-size: 1.1em;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: inherit;
  opacity: 0.7;
}

.chevron-icon.is-expanded {
  transform: rotate(90deg);
}

.button-text {
  letter-spacing: 0.01em;
}

.think-content {
  margin-top: 0.75em;
  padding: 1em;
  background: #eff6ff; /* blue-50 */
  border: 1px solid #dbeafe; /* blue-100 */
  border-radius: 6px;
  line-height: 1.6;
  font-size: 0.95rem;
  color: #1e3a5f;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

