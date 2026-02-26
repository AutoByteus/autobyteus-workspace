<template>
  <div class="compare-modal">
    <div class="modal-shell">
      <div class="modal-header">
        <div class="header-left">
          <button class="btn-back" @click="$emit('close')">
            <Icon icon="heroicons:arrow-left" class="back-icon" />
            Back to Skill
          </button>
          <div>
            <h2 class="modal-title">Compare Versions</h2>
            <p class="modal-subtitle">Review changes between skill versions.</p>
          </div>
        </div>

        <div class="header-controls">
          <div class="version-control">
            <label>From</label>
            <select v-model="fromVersion" :disabled="versions.length === 0">
              <option v-for="version in versions" :key="`from-${version.tag}`" :value="version.tag">
                {{ version.tag }}
              </option>
            </select>
          </div>
          <button class="btn-swap" @click="swapVersions" :disabled="versions.length < 2">
            Swap
          </button>
          <div class="version-control">
            <label>To</label>
            <select v-model="toVersion" :disabled="versions.length === 0">
              <option v-for="version in versions" :key="`to-${version.tag}`" :value="version.tag">
                {{ version.tag }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="versions.length < 2" class="modal-empty">
        <p>At least two versions are required to compare.</p>
      </div>

      <div v-else class="modal-body">
        <div class="file-list">
          <h4>Files</h4>
          <div v-if="diffLoading" class="list-status">Loading diff…</div>
          <div v-else-if="diffError" class="list-status error-text">{{ diffError }}</div>
          <div v-else-if="diffFiles.length === 0" class="list-status">No changes found.</div>
          <button
            v-for="file in diffFiles"
            :key="file.filePath"
            class="file-item"
            :class="{ active: file.filePath === selectedFilePath }"
            @click="selectFile(file.filePath)"
          >
            {{ file.filePath }}
          </button>
        </div>

        <div class="diff-pane">
          <div class="diff-header">
            <span>Diff</span>
            <span class="diff-meta">{{ selectedFilePath || 'Select a file' }}</span>
          </div>
          <div v-if="diffLoading" class="diff-status">Loading diff…</div>
          <div v-else-if="diffError" class="diff-status error-text">{{ diffError }}</div>
          <div v-else-if="!selectedDiff" class="diff-status">Select a file to view changes.</div>
          <div v-else class="diff-content">
            <div
              v-for="(line, index) in formattedLines"
              :key="`${selectedFilePath}-${index}`"
              class="diff-line"
              :class="line.type"
            >
              <span class="line-text">{{ line.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useSkillStore } from '~/stores/skillStore'
import type { SkillVersion } from '~/types/skill'
import { parseUnifiedDiffByFile } from '~/utils/skillDiffParser'

const props = defineProps<{
  skillName: string
  versions: SkillVersion[]
}>()

const emit = defineEmits<{
  close: []
}>()

const skillStore = useSkillStore()
const fromVersion = ref('')
const toVersion = ref('')
const diffLoading = ref(false)
const diffError = ref('')
const diffContent = ref('')
const selectedFilePath = ref('')
let activeRequest = 0

const diffFiles = computed(() => parseUnifiedDiffByFile(diffContent.value))

const selectedDiff = computed(() => {
  if (!selectedFilePath.value) return null
  return diffFiles.value.find((file) => file.filePath === selectedFilePath.value) || null
})

const formattedLines = computed(() => {
  if (!selectedDiff.value) return []
  return selectedDiff.value.diff.split('\n').map((line) => {
    let type: 'add' | 'remove' | 'hunk' | 'meta' | 'context' = 'context'
    if (line.startsWith('@@')) type = 'hunk'
    else if (line.startsWith('+') && !line.startsWith('+++')) type = 'add'
    else if (line.startsWith('-') && !line.startsWith('---')) type = 'remove'
    else if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('rename ') ||
      line.startsWith('similarity index') ||
      line.startsWith('dissimilarity index') ||
      line.startsWith('Binary files ')
    ) {
      type = 'meta'
    }

    return { text: line || ' ', type }
  })
})

function selectFile(path: string) {
  selectedFilePath.value = path
}

function setDefaultVersions() {
  if (props.versions.length === 0) return

  const active = props.versions.find((version) => version.isActive)?.tag
  if (active) {
    toVersion.value = active
    const fallback = props.versions.find((version) => version.tag !== active)?.tag || active
    fromVersion.value = fromVersion.value || fallback
    return
  }

  fromVersion.value = props.versions[0]?.tag || ''
  toVersion.value = props.versions[1]?.tag || props.versions[0]?.tag || ''
}

function swapVersions() {
  const temp = fromVersion.value
  fromVersion.value = toVersion.value
  toVersion.value = temp
}

async function loadDiff() {
  diffError.value = ''
  if (!fromVersion.value || !toVersion.value || fromVersion.value === toVersion.value) {
    diffContent.value = ''
    selectedFilePath.value = ''
    return
  }

  diffLoading.value = true
  const requestId = ++activeRequest
  try {
    const diff = await skillStore.fetchSkillVersionDiff(
      props.skillName,
      fromVersion.value,
      toVersion.value
    )
    if (requestId !== activeRequest) return
    diffContent.value = diff?.diffContent || ''
    selectedFilePath.value = diffFiles.value[0]?.filePath || ''
  } catch (error: any) {
    if (requestId !== activeRequest) return
    diffError.value = error?.message || 'Failed to load diff.'
  } finally {
    if (requestId === activeRequest) {
      diffLoading.value = false
    }
  }
}

watch(
  () => props.versions,
  () => {
    setDefaultVersions()
    loadDiff()
  },
  { immediate: true }
)

watch([fromVersion, toVersion], () => {
  loadDiff()
})
</script>

<style scoped>
.compare-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: stretch;
  padding: 1.5rem;
  margin-left: 50px;
}

.modal-shell {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  background: #f9fafb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: none;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
}

.back-icon {
  width: 1rem;
  height: 1rem;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.modal-subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.header-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}

.version-control {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.version-control select {
  min-width: 140px;
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
}

.btn-swap {
  border: 1px solid #d1d5db;
  background: white;
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  color: #111827;
  margin-bottom: 0.1rem;
}

.btn-swap:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 0;
  flex: 1;
}

.file-list {
  border-right: 1px solid #e5e7eb;
  padding: 1.25rem;
  overflow-y: auto;
  background: #f9fafb;
}

.file-list h4 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.file-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.4rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  cursor: pointer;
}

.file-item:hover,
.file-item.active {
  background: #e0e7ff;
  color: #1e3a8a;
}

.list-status {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.diff-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  background: white;
  color: #374151;
}

.diff-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.diff-status {
  padding: 1.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.diff-content {
  flex: 1;
  overflow: auto;
  padding: 1.25rem;
  background: #0f172a;
}

.diff-line {
  white-space: pre;
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #e2e8f0;
}

.diff-line.add {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.diff-line.remove {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.diff-line.hunk {
  color: #93c5fd;
}

.diff-line.meta {
  color: #cbd5f5;
}

.line-text {
  display: block;
}

.error-text {
  color: #dc2626;
}

.modal-empty {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

@media (max-width: 1024px) {
  .modal-body {
    grid-template-columns: 1fr;
  }

  .file-list {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}

@media (max-width: 768px) {
  .compare-modal {
    margin-left: 0;
    padding: 0.75rem;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-controls {
    flex-wrap: wrap;
    align-items: flex-start;
  }
}
</style>
