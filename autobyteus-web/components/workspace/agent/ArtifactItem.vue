<template>
  <div 
    class="flex items-center space-x-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors duration-150 group"
    :class="{ 'bg-blue-50 text-blue-700': isSelected }"
    @click="$emit('select', artifact)"
  >
    <div class="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
        <!-- Status: Streaming -->
        <Icon v-if="artifact.status === 'streaming'" icon="svg-spinners:ring-resize" class="w-5 h-5 text-blue-500" />
        
        <!-- Status: Failed -->
        <Icon v-else-if="artifact.status === 'failed'" icon="heroicons:exclamation-circle-solid" class="w-5 h-5 text-red-500" />
        
        <!-- Status: Pending Approval -->
        <Icon v-else-if="artifact.status === 'pending_approval'" icon="heroicons:hand-raised-solid" class="w-5 h-5 text-amber-500" />
        
        <!-- Status: Persisted (Success) - Show File Type Icon -->
        <template v-else>
            <Icon v-if="isJs" icon="vscode-icons:file-type-js" class="w-5 h-5" />
            <Icon v-else-if="isTs" icon="vscode-icons:file-type-typescript" class="w-5 h-5" />
            <Icon v-else-if="isVue" icon="vscode-icons:file-type-vue" class="w-5 h-5" />
            <Icon v-else-if="isHtml" icon="vscode-icons:file-type-html" class="w-5 h-5" />
            <Icon v-else-if="isCss" icon="vscode-icons:file-type-css" class="w-5 h-5" />
            <Icon v-else-if="isMd" icon="vscode-icons:file-type-markdown" class="w-5 h-5" />
            <Icon v-else-if="isJson" icon="vscode-icons:file-type-json" class="w-5 h-5" />
            <Icon v-else-if="isPython" icon="vscode-icons:file-type-python" class="w-5 h-5" />
            <Icon v-else-if="isYaml" icon="vscode-icons:file-type-yaml" class="w-5 h-5" />
            <Icon v-else-if="isShell" icon="vscode-icons:file-type-shell" class="w-5 h-5" />
            <Icon v-else-if="isXml" icon="vscode-icons:file-type-xml" class="w-5 h-5" />
            <Icon v-else-if="isPdf" icon="vscode-icons:file-type-pdf" class="w-5 h-5" />
            <Icon v-else-if="isExcel" icon="vscode-icons:file-type-excel" class="w-5 h-5" />
            <Icon v-else-if="isText" icon="vscode-icons:file-type-text" class="w-5 h-5" />
            <Icon v-else-if="isImage" icon="vscode-icons:file-type-image" class="w-5 h-5" />
            <Icon v-else-if="isAudio" icon="vscode-icons:file-type-audio" class="w-5 h-5" />
            <Icon v-else-if="isVideo" icon="vscode-icons:file-type-video" class="w-5 h-5" />
            <Icon v-else icon="vscode-icons:default-file" class="w-5 h-5" />
        </template>
    </div>

    <!-- Name Area -->
    <div class="flex flex-col min-w-0 flex-1">
        <span class="text-[13px] font-medium truncate select-none leading-none" :class="isSelected ? 'text-blue-700' : 'text-gray-700'">
            {{ fileName }}
        </span>
    </div>

    <!-- Success Checkmark (only if persisted) -->
     <div v-if="artifact.status === 'persisted'" class="flex-shrink-0">
        <Icon icon="heroicons:check-circle-solid" class="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" :class="{ 'opacity-100': isSelected }" />
     </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { AgentArtifact } from '~/stores/agentArtifactsStore';

const props = defineProps<{
  artifact: AgentArtifact;
  isSelected?: boolean;
}>();

defineEmits(['select']);

const fileName = computed(() => props.artifact.path.split('/').pop() || props.artifact.path);

// File type helpers
const ext = computed(() => {
    const name = fileName.value.toLowerCase();
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
});

const isJs = computed(() => ['.js', '.jsx', '.cjs', '.mjs'].includes(ext.value));
const isTs = computed(() => ['.ts', '.tsx'].includes(ext.value));
const isVue = computed(() => ext.value === '.vue');
const isHtml = computed(() => ['.html', '.htm'].includes(ext.value));
const isCss = computed(() => ['.css', '.scss', '.less'].includes(ext.value));
const isMd = computed(() => ['.md', '.markdown'].includes(ext.value));
const isJson = computed(() => ext.value === '.json');
const isPython = computed(() => ext.value === '.py');
const isYaml = computed(() => ['.yaml', '.yml'].includes(ext.value));
const isShell = computed(() => ['.sh', '.bash', '.zsh'].includes(ext.value));
const isXml = computed(() => ['.xml'].includes(ext.value));
const isPdf = computed(() => ['.pdf'].includes(ext.value));
const isExcel = computed(() => ['.xlsx', '.xls', '.csv'].includes(ext.value));
const isText = computed(() => ['.txt', '.log'].includes(ext.value));
const isImage = computed(() => ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext.value));
const isAudio = computed(() => ['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext.value));
const isVideo = computed(() => ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext.value));

</script>
