<template>
    <Teleport to="body">
      <div v-if="show" class="fixed inset-0 flex items-center justify-center z-[9999]">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" 
          @click="onCancel"
        ></div>
        
        <!-- Dialog -->
        <div 
          class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 relative z-10 transform transition-all"
          role="dialog"
          aria-modal="true"
        >
          <h2 class="text-lg font-semibold text-gray-700 mb-2">
            {{ isFile ? 'Add New File' : 'Add New Folder' }}
          </h2>
  
          <p class="text-gray-600 mb-4">
            {{ isFile 
              ? 'Enter a name for the new file:' 
              : 'Enter a name for the new folder:' 
            }}
          </p>
  
          <input 
            v-model="nameInput"
            @keyup.enter="handleConfirm"
            type="text"
            class="border border-gray-300 rounded w-full px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. myNewFile.ts or myNewFolder"
          />
  
          <div class="flex justify-end gap-3">
            <button 
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              @click="onCancel"
            >
              Cancel
            </button>
            <button 
              class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @click="handleConfirm"
            >
              Create
            </button>
          </div>
  
        </div>
      </div>
    </Teleport>
</template>
  
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  show: boolean
  isFile: boolean
  parentPath: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'confirm', name: string): void; (e: 'cancel'): void }>()

const nameInput = ref('')

watch(() => props.show, (newVal) => {
  if (newVal) {
    nameInput.value = ''
    nextTick(() => {
      // focus if needed
    })
  }
})

function handleConfirm() {
  const trimmed = nameInput.value.trim()
  if (!trimmed) return
  emit('confirm', trimmed)
}

function onCancel() {
  emit('cancel')
}
</script>
  
<style scoped>
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
