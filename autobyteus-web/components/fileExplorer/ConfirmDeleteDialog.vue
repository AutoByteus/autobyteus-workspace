<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 flex items-center justify-center z-[9999]">
      <!-- Backdrop with blur -->
      <div class="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" @click="onCancel"></div>
      
      <!-- Dialog -->
      <div 
        class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 relative z-10 transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <!-- Title -->
        <h2 class="text-lg font-semibold text-gray-700 mb-2">
          Confirm Deletion
        </h2>
        
        <!-- Message -->
        <div class="mb-6">
          <p class="text-gray-700">
            Are you sure you want to delete <span class="font-medium">{{ targetName }}</span>?
          </p>
          <p class="text-sm text-gray-500 mt-2">
            This action cannot be undone.
          </p>
        </div>
        
        <!-- Buttons - Centered with proper spacing -->
        <div class="flex justify-center items-center space-x-4">
          <!-- Cancel button -->
          <button 
            type="button"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            @click="onCancel"
          >
            Cancel
          </button>
          
          <!-- Delete button -->
          <button 
            type="button"
            class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            @click="onConfirm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{  show: boolean
  targetName: string
}>()

const emit = defineEmits<{  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const onConfirm = () => {
  emit('confirm')
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
/* Fade in animation for the backdrop */
.bg-black {
  animation: fadeIn 0.2s ease-out;
}

/* Scale and fade in animation for the dialog */
.transform {
  animation: scaleIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
