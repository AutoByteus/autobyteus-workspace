<template>
  <div class="excel-viewer-container">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading spreadsheet...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <p class="error-text">{{ error }}</p>
      <button @click="loadExcel" class="retry-button">Retry</button>
    </div>

    <!-- Excel content -->
    <div v-else-if="workbook" class="excel-content">
      <!-- Sheet tabs -->
      <div v-if="sheetNames.length > 1" class="sheet-tabs">
        <button
          v-for="name in sheetNames"
          :key="name"
          @click="activeSheet = name"
          :class="['sheet-tab', { active: activeSheet === name }]"
        >
          {{ name }}
        </button>
      </div>

      <!-- Table container -->
      <div class="table-container" ref="tableContainer">
        <div v-html="sheetHtml" class="sheet-table"></div>
      </div>
    </div>

    <!-- No URL state -->
    <div v-else class="error-state">
      <p>No file URL provided.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import * as XLSX from 'xlsx';

const props = defineProps<{
  url: string | null;
  content?: string | null;
}>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const workbook = ref<XLSX.WorkBook | null>(null);
const activeSheet = ref<string>('');

const sheetNames = computed(() => workbook.value?.SheetNames || []);

const sheetHtml = computed(() => {
  if (!workbook.value || !activeSheet.value) return '';
  
  const sheet = workbook.value.Sheets[activeSheet.value];
  if (!sheet) return '';
  
  return XLSX.utils.sheet_to_html(sheet, { 
    id: 'excel-table',
    editable: false
  });
});

const loadExcel = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // 1. Try URL first
    if (props.url) {
      const response = await fetch(props.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      workbook.value = XLSX.read(data, { type: 'array' });
    } 
    // 2. Fallback to raw content (for streaming CSVs/files)
    else if (props.content) {
      // XLSX.read can handle string content for CSVs/Text based formats
      workbook.value = XLSX.read(props.content, { type: 'string' });
    }
    // 3. No source available
    else {
      // Just clear state, don't error immediately if it's just initializing
      workbook.value = null;
      return;
    }
    
    // Set active sheet if workbook loaded successfully
    if (workbook.value && workbook.value.SheetNames.length > 0) {
      // Preserve active sheet if it still exists, otherwise pick first
      if (!activeSheet.value || !workbook.value.SheetNames.includes(activeSheet.value)) {
        activeSheet.value = workbook.value.SheetNames[0];
      }
    }
  } catch (e) {
    console.error('[ExcelViewer] Error loading Excel file:', e);
    error.value = e instanceof Error ? e.message : 'Failed to load Excel file.';
    workbook.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Watch for changes in either URL or Content
watch([() => props.url, () => props.content], () => {
  loadExcel();
}, { immediate: true });

onMounted(() => {
  if (!workbook.value && !isLoading.value) {
    loadExcel();
  }
});
</script>

<style scoped>
.excel-viewer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #f9fafb;
  overflow: hidden;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-text {
  color: #dc2626;
  font-weight: 500;
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.retry-button:hover {
  background-color: #2563eb;
}

.excel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sheet-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: #e5e7eb;
  border-bottom: 1px solid #d1d5db;
  overflow-x: auto;
  flex-shrink: 0;
}

.sheet-tab {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4b5563;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.sheet-tab:hover {
  background-color: #e5e7eb;
}

.sheet-tab.active {
  background-color: white;
  color: #1f2937;
  border-bottom: 1px solid white;
  margin-bottom: -1px;
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  background-color: white;
}

.sheet-table :deep(table) {
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 100%;
}

.sheet-table :deep(th),
.sheet-table :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  text-align: left;
  white-space: nowrap;
}

.sheet-table :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.sheet-table :deep(tr:nth-child(even)) {
  background-color: #f9fafb;
}

.sheet-table :deep(tr:hover) {
  background-color: #f3f4f6;
}

.sheet-table :deep(td:first-child) {
  background-color: #f9fafb;
  font-weight: 500;
  color: #6b7280;
}
</style>
