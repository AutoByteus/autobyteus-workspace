<template>
  <div class="skills-page">
    <div class="skills-header">
      <div class="header-left">
        <h2>Skills</h2>
        <p class="subtitle">Manage and create file-based capabilities for your agents.</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <Icon icon="heroicons:magnifying-glass" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search skills..." 
            class="search-input"
          />
        </div>
        <button class="btn-secondary" @click="showSourcesDialog = true" title="Manage Skill Sources">
          <Icon icon="heroicons:cog-6-tooth" />
          <span>Sources</span>
        </button>
        <button class="btn-primary" @click="showCreateDialog = true">
          <Icon icon="heroicons:plus" />
          <span>Create Skill</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading skills...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <Icon icon="heroicons:exclamation-triangle" class="error-icon" />
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="skillStore.fetchAllSkills()">Try Again</button>
    </div>

    <div v-else-if="filteredSkills.length === 0" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon-wrapper">
          <Icon icon="heroicons:command-line" class="empty-icon" />
        </div>
        <template v-if="searchQuery">
          <h3>No skills found</h3>
          <p>No skills match your search query "{{ searchQuery }}".</p>
          <button class="btn-text" @click="searchQuery = ''">Clear Search</button>
        </template>
        <template v-else>
          <h3>No skills created yet</h3>
          <p>Create your first skill to extend capabilities.</p>

        </template>
      </div>
    </div>

    <div v-else class="skills-grid">
      <SkillCard
        v-for="skill in filteredSkills"
        :key="skill.name"
        :skill="skill"
        @view="handleViewSkill"
        @delete="handleDeleteSkill"
        @toggle-disable="handleToggleDisable"
      />
    </div>

    <!-- Create Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>Create New Skill</h3>
          <button class="btn-close" @click="showCreateDialog = false">
            <Icon icon="heroicons:x-mark" />
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="form-group">
            <label>Name</label>
            <input 
              v-model="newSkill.name" 
              type="text" 
              placeholder="e.g., data-analysis" 
              autofocus
            />
            <p class="help-text">Use lowercase with hyphens or underscores.</p>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newSkill.description" 
              placeholder="Describe what this skill does..."
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Initial Content (SKILL.md)</label>
            <textarea 
              v-model="newSkill.content" 
              rows="8" 
              class="code-input"
              placeholder="# Skill Name\n\nDescription..."
            ></textarea>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="showCreateDialog = false">Cancel</button>
          <button 
            class="btn-primary" 
            @click="handleCreateSkill"
            :disabled="!newSkill.name"
          >
            Create Skill
          </button>
        </div>
      </div>
    </div>

    <!-- Skill Sources Management Dialog -->
    <SkillSourcesModal
      v-if="showSourcesDialog"
      @close="showSourcesDialog = false"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      :show="showDeleteConfirm"
      title="Delete Skill"
      :message="`Are you sure you want to delete the skill <b>${skillToDelete?.name}</b>? This action cannot be undone.`"
      confirm-button-text="Delete"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillStore } from '~/stores/skillStore'
import { Icon } from '@iconify/vue'
import SkillCard from './SkillCard.vue'
import SkillSourcesModal from './SkillSourcesModal.vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import type { Skill } from '~/types/skill'

const emit = defineEmits<{
  viewDetail: [skillName: string]
}>()

const skillStore = useSkillStore()
const { skills, loading, error } = storeToRefs(skillStore)

const showCreateDialog = ref(false)
const showSourcesDialog = ref(false)
const searchQuery = ref('')
const showDeleteConfirm = ref(false)
const skillToDelete = ref<Skill | null>(null)

const newSkill = ref({
  name: '',
  description: '',
  content: '',
})

// Filter skills based on search query
const filteredSkills = computed(() => {
  if (!searchQuery.value) return skills.value
  
  const query = searchQuery.value.toLowerCase()
  return skills.value.filter(skill => 
    skill.name.toLowerCase().includes(query) || 
    skill.description.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  await skillStore.fetchAllSkills()
})

async function handleCreateSkill() {
  if (!newSkill.value.name) return
  
  try {
    await skillStore.createSkill({
      name: newSkill.value.name,
      description: newSkill.value.description,
      content: newSkill.value.content,
    })
    showCreateDialog.value = false
    newSkill.value = { name: '', description: '', content: '' }
  } catch (e) {
    console.error('Failed to create skill:', e)
  }
}

function handleViewSkill(skill: Skill) {
  skillStore.setCurrentSkill(skill)
  emit('viewDetail', skill.name)
}

async function handleDeleteSkill(skill: Skill) {
  skillToDelete.value = skill
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!skillToDelete.value) return
  
  try {
    await skillStore.deleteSkill(skillToDelete.value.name)
  } catch (e) {
    console.error('Failed to delete skill:', e)
  } finally {
    showDeleteConfirm.value = false
    skillToDelete.value = null
  }
}

async function handleToggleDisable(skill: Skill) {
  try {
    if (skill.isDisabled) {
      await skillStore.enableSkill(skill.name)
    } else {
      await skillStore.disableSkill(skill.name)
    }
  } catch (e) {
    console.error(`Failed to ${skill.isDisabled ? 'enable' : 'disable'} skill:`, e)
  }
}
</script>

<style scoped>
.skills-page {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.skills-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.header-left h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Search Box */
.search-box {
  position: relative;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 1.25rem;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Buttons */
button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.625rem 1.25rem;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  padding: 0.625rem 1rem;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-text {
  background: transparent;
  color: #3b82f6;
  padding: 0.5rem;
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-close {
  background: transparent;
  color: #9ca3af;
  padding: 0.25rem;
  font-size: 1.25rem;
}

.btn-close:hover {
  color: #1f2937;
}

/* Grid */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
  flex: 1;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error-icon {
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 1rem;
}

.empty-icon-wrapper {
  background: #eff6ff;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.empty-icon {
  font-size: 2rem;
  color: #3b82f6;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
  max-width: 400px;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
  font-weight: 600;
  color: #111827;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.dialog-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

/* Forms */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.code-input {
  font-family: 'Courier New', Courier, monospace;
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
