<template>
  <div
    class="relative bg-gray-50 p-3"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onFileDrop"
    @paste="onPaste"
  >
    <!-- Hidden file input for upload button -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="onFileSelect"
    />

    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <span class="font-medium text-sm text-gray-800">
          Context Files ({{ modelValue.length }})
        </span>
        <span v-if="modelValue.length === 0" class="text-xs text-gray-500 ml-2"> (drag, drop, paste, or click to upload)</span>
      </div>
      <button
        @click.stop="triggerFileInput"
        class="text-blue-500 hover:text-white hover:bg-blue-500 transition-colors duration-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        title="Upload files"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>

    <!-- File List -->
    <ul
      v-if="modelValue.length > 0"
      class="mt-3 space-y-2 max-h-48 overflow-y-auto pr-2 border-t border-gray-200 pt-3"
    >
      <li
        v-for="(file, index) in modelValue"
        :key="file.path"
        class="bg-white p-2 rounded border border-gray-200 flex items-center justify-between group"
      >
        <div class="flex items-center space-x-2 flex-grow min-w-0">
          <span class="text-sm text-gray-700 truncate group-hover:underline cursor-pointer" :title="file.path" @click="emit('open-file', file)">
            {{ file.path }}
          </span>
          <span v-if="uploadingFiles.includes(file.path)" class="text-xs text-blue-500 ml-auto flex-shrink-0">
            <svg class="animate-spin h-3 w-3 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Uploading...
          </span>
        </div>
        <button
          @click="removeFile(index)"
          :disabled="uploadingFiles.includes(file.path)"
          class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full flex-shrink-0 disabled:opacity-50"
          title="Remove file"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </li>
    </ul>

    <!-- Drag Overlay -->
    <div v-if="isDragOver" class="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-600 rounded-md flex items-center justify-center pointer-events-none">
      <span class="text-blue-800 font-semibold">Drop files or paths to add context</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ContextFilePath } from '~/types/conversation';
import { useFileUploadStore } from '~/stores/fileUploadStore';

const props = defineProps<{
  modelValue: ContextFilePath[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ContextFilePath[]): void;
  (e: 'open-file', file: ContextFilePath): void;
}>();

const fileUploadStore = useFileUploadStore();
const isDragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadingFiles = ref<string[]>([]);

function determineFileType(fileOrPath: File | string): ContextFilePath['type'] {
  let typeSource: string;
  if (typeof fileOrPath === 'string') {
    typeSource = fileOrPath.split('.').pop()?.toLowerCase() || '';
  } else {
    typeSource = fileOrPath.type;
  }

  if (typeSource.startsWith('image/')) return 'Image';
  if (typeSource.startsWith('audio/')) return 'Audio';
  if (typeSource.startsWith('video/')) return 'Video';
  // Fallback for extensions if mime type is generic
  const extension = typeof fileOrPath === 'string' ? typeSource : fileOrPath.name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'Image';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'Audio';
  if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) return 'Video';
  return 'Text';
}

function addFilesAsText(paths: string[]) {
    const filesToAdd = paths.map(path => ({ path, type: determineFileType(path) }));
    const newFiles = [...props.modelValue];
    const existingPaths = new Set(newFiles.map(f => f.path));
    for (const file of filesToAdd) {
        if (!existingPaths.has(file.path)) {
            newFiles.push(file);
            existingPaths.add(file.path);
        }
    }
    emit('update:modelValue', newFiles);
}

async function processAndUploadFiles(files: (File | null)[]) {
  const validFiles = files.filter((f): f is File => f !== null);
  if (validFiles.length === 0) return;

  const uploadPromises = validFiles.map(async (file) => {
    const tempPath = URL.createObjectURL(file);
    const fileType = determineFileType(file);
    
    // Add temporary entry to UI
    emit('update:modelValue', [...props.modelValue, { path: tempPath, type: fileType }]);
    uploadingFiles.value.push(tempPath);

    try {
      const uploadedFilePath = await fileUploadStore.uploadFile(file);
      // Replace temporary entry with permanent one
      const currentFiles = [...props.modelValue];
      const tempIndex = currentFiles.findIndex(cf => cf.path === tempPath);
      if (tempIndex !== -1) {
        currentFiles[tempIndex] = { path: uploadedFilePath, type: fileType };
        emit('update:modelValue', currentFiles);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      // Remove temporary entry on failure
      emit('update:modelValue', props.modelValue.filter(cf => cf.path !== tempPath));
    } finally {
      uploadingFiles.value = uploadingFiles.value.filter(path => path !== tempPath);
      URL.revokeObjectURL(tempPath);
    }
  });

  await Promise.all(uploadPromises);
}

function removeFile(index: number) {
  const newFiles = [...props.modelValue];
  newFiles.splice(index, 1);
  emit('update:modelValue', newFiles);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    processAndUploadFiles(Array.from(input.files));
  }
  input.value = ''; // Reset input to allow selecting the same file again
}

async function onFileDrop(event: DragEvent) {
  isDragOver.value = false;
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;

  // Prioritize actual files
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    await processAndUploadFiles(Array.from(dataTransfer.files));
    return;
  }
  
  // Fallback to text paths
  const pastedText = dataTransfer.getData('text/plain');
  if (pastedText) {
    const paths = pastedText.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    if (paths.length > 0) addFilesAsText(paths);
  }
}

async function onPaste(event: ClipboardEvent) {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  
  // Prioritize actual files
  const files = Array.from(clipboardData.files);
  if (files.length > 0) {
    event.preventDefault();
    await processAndUploadFiles(files);
    return;
  }

  // Fallback to text paths
  const pastedText = clipboardData.getData('text/plain');
  if (pastedText && pastedText.trim()) {
    event.preventDefault();
    const paths = pastedText.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    if (paths.length > 0) addFilesAsText(paths);
  }
}
</script>
