<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="visible" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 transition-opacity p-4"
        @click.self="$emit('close')"
        @keydown.esc="$emit('close')"
        tabindex="-1"
        ref="modalBackdrop"
      >
        <div 
          class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-gray-700 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 id="modal-title" class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">{{ title }}</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
                  <div class="mt-4">
                    <textarea
                      v-model="reason"
                      rows="3"
                      class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      :placeholder="textareaPlaceholder"
                      ref="textareaRef"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
              @click="handleConfirm"
            >
              Reject
            </button>
            <button
              type="button"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto"
              @click="$emit('close')"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Reject Tool Call',
  },
  message: {
    type: String,
    default: 'Please provide a reason for rejecting this tool call. This helps the agent understand your intent.',
  },
  textareaPlaceholder: {
    type: String,
    default: 'Provide a reason (optional)...'
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', reason?: string): void;
}>();

const reason = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const modalBackdrop = ref<HTMLElement | null>(null);

watch(() => props.visible, (newValue) => {
  if (newValue) {
    reason.value = '';
    // Use nextTick to ensure elements are in the DOM before focusing
    nextTick(() => {
      textareaRef.value?.focus();
      modalBackdrop.value?.focus(); // Focus backdrop for esc key
    });
  }
});

const handleConfirm = () => {
  emit('confirm', reason.value);
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
