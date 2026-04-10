<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ $t('skills.components.skills.SkillSourcesModal.manage_skill_sources') }}</h3>
        <button class="close-btn" @click="$emit('close')">{{ $t('skills.components.skills.SkillSourcesModal.and_times') }}</button>
      </div>

      <div class="content">
        <div v-if="loading && sources.length === 0" class="loading">{{ $t('skills.components.skills.SkillSourcesModal.loading_sources') }}</div>
        
        <div v-if="error" class="error-alert">
          {{ error }}
        </div>

        <div v-if="successMessage" class="success-alert">
          {{ successMessage }}
        </div>

        <div class="sources-list">
          <div v-for="source in sources" :key="source.path" class="source-item">
            <div class="source-info">
              <span class="folder-icon">📁</span>
              <span class="path" :title="source.path">{{ source.path }}</span>
              <span class="badge" :class="{ default: source.isDefault }">
                {{ source.isDefault ? $t('skills.components.skills.SkillSourcesModal.default') : $t('skills.components.skills.SkillSourcesModal.custom') }}
              </span>
              <span class="count-badge" :title="$t('skills.components.skills.SkillSourcesModal.skills_found')">
                {{ $t('skills.components.skills.SkillSourcesModal.skills_count', { count: source.skillCount }) }}
              </span>
            </div>
            
            <button 
              v-if="!source.isDefault" 
              class="btn-delete"
              @click="handleRemove(source.path)"
              :disabled="loading || isScanning"
              :title="$t('skills.components.skills.SkillSourcesModal.remove_source')"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="add-source-section">
          <h4>{{ $t('skills.components.skills.SkillSourcesModal.add_new_source_folder') }}</h4>
          <div class="input-group">
            <input 
              v-model="newPath" 
              type="text" 
              :placeholder="$t('skills.components.skills.SkillSourcesModal.absolute_path_to_skills_folder')"
              @keyup.enter="handleAdd"
              :disabled="isScanning"
            />
            <button 
              class="btn-add" 
              @click="handleAdd" 
              :disabled="!newPath || loading || isScanning"
            >
              <span v-if="isScanning">{{ $t('skills.components.skills.SkillSourcesModal.scanning') }}</span>
              <span v-else>{{ $t('skills.components.skills.SkillSourcesModal.add_folder') }}</span>
            </button>
          </div>
          <p v-if="isScanning" class="scanning-hint">{{ $t('skills.components.skills.SkillSourcesModal.scanning_directory_for_skills_please_wait') }}</p>
          <p v-else class="hint">{{ $t('skills.components.skills.SkillSourcesModal.enter_the_absolute_path_to_a') }}</p>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn-done" @click="$emit('close')">{{ $t('skills.components.skills.SkillSourcesModal.done') }}</button>
      </div>
    </div>


    <!-- Confirm Remove Source Modal -->
    <ConfirmationModal
      :show="showRemoveConfirm"
      :title="$t('skills.components.skills.SkillSourcesModal.remove_skill_source')"
      :message="t('skills.components.skills.SkillSourcesModal.remove_message', { path: sourceToRemove })"
      :confirm-button-text="$t('skills.components.skills.SkillSourcesModal.remove_confirm')"
      variant="danger"
      @confirm="confirmRemove"
      @cancel="showRemoveConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSkillSourcesStore } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { storeToRefs } from 'pinia'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'

const { t } = useLocalization()

const emit = defineEmits(['close'])

const store = useSkillSourcesStore()
const skillStore = useSkillStore()
const { skillSources, loading, error } = storeToRefs(store)

const newPath = ref('')
const successMessage = ref('')
const isScanning = ref(false)
const showRemoveConfirm = ref(false)
const sourceToRemove = ref('')

// Sort sources: Default first, then alphabetical
const sources = computed(() => {
  return [...skillSources.value].sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1
    return a.path.localeCompare(b.path)
  })
})

onMounted(() => {
  store.fetchSkillSources()
})

async function handleAdd() {
  if (!newPath.value) return
  
  isScanning.value = true
  successMessage.value = ''
  store.clearError()
  
  try {
    await store.addSkillSource(newPath.value)
    
    // Find the newly added source to show count
    const addedSource = skillSources.value.find(s => s.path === newPath.value || s.path.endsWith(newPath.value))
    const count = addedSource ? addedSource.skillCount : 'some'
    
    successMessage.value = t('skills.components.skills.SkillSourcesModal.add_success', { count })
    newPath.value = ''
    
    // Trigger background refresh of main skill list
    skillStore.fetchAllSkills()
    
  } catch (e) {
    // Error is handled in store
  } finally {
    isScanning.value = false
  }
}

async function handleRemove(path: string) {
  sourceToRemove.value = path
  showRemoveConfirm.value = true
}

async function confirmRemove() {
  if (!sourceToRemove.value) return
  
  try {
    await store.removeSkillSource(sourceToRemove.value)
    await skillStore.fetchAllSkills()
    successMessage.value = t('skills.components.skills.SkillSourcesModal.remove_success')
  } catch (e) {
    // Error handled in store
  } finally {
    showRemoveConfirm.value = false
    sourceToRemove.value = ''
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 650px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.dialog-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.loading {
  text-align: center;
  color: #6b7280;
  margin: 1rem 0;
}

.error-alert {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.success-alert {
  background: #d1fae5;
  color: #065f46;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
}

.folder-icon {
  font-size: 1.25rem;
}

.path {
  font-family: monospace;
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #4b5563;
  font-weight: 500;
}

.badge.default {
  background: #dbeafe;
  color: #1e40af;
}

.count-badge {
  font-size: 0.75rem;
  color: #6b7280;
  background: white;
  padding: 0.125rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.btn-delete {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #ef4444;
}

.btn-delete:hover {
  background: #fee2e2;
  border-color: #fecaca;
}

.add-source-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.add-source-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #374151;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: monospace;
}

.btn-add {
  background: #10b981;
  color: white;
  border: none;
  padding: 0 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}

.btn-add:hover:not(:disabled) {
  background: #059669;
}

.btn-add:disabled {
  background: #a7f3d0;
  cursor: not-allowed;
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.scanning-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.dialog-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

.btn-done {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-done:hover {
  background: #2563eb;
}
</style>
