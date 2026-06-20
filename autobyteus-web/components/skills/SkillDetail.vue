<template>
  <div v-if="isLoading" class="loading-state">
    <div class="spinner"></div>
    <p>{{ $t('skills.components.skills.SkillDetail.loading') }}</p>
  </div>
  <div v-else-if="loadError" class="error-state">
    <Icon icon="heroicons:exclamation-triangle" class="error-icon" />
    <p>{{ loadError }}</p>
    <button class="btn-recover" @click="$emit('back')">{{ $t('skills.components.skills.SkillDetail.back_to_skills') }}</button>
  </div>
  <div v-else-if="skill" class="skill-detail">
    <!-- Compact Header -->
    <header class="compact-header">
      <div class="header-title-row">
        <div class="header-identity">
          <button class="btn-back" @click="$emit('back')">
            <Icon icon="heroicons:arrow-left" class="back-icon" />
          </button>
          <div class="title-group">
            <h2 class="skill-title">{{ skill.name }}</h2>
            <span v-if="skill.isDisabled" class="badge-disabled">{{ $t('skills.components.skills.SkillCard.disabled') }}</span>
          </div>
        </div>
      </div>

      <SkillDescriptionSummary :description="skill.description" />
    </header>

    <!-- Main Workspace -->
    <SkillWorkspaceLoader :skillId="skill.name">
      <template #default="{ workspaceId }">
        <div class="workspace">
          <!-- Left: File Sidebar -->
          <div class="sidebar">
            <FileExplorer :workspaceId="workspaceId" />
          </div>

          <!-- Right: Editor/Viewer -->
          <div class="editor-pane">
            <FileExplorerTabs :workspaceId="workspaceId" />
          </div>
        </div>
      </template>
    </SkillWorkspaceLoader>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSkillStore } from '~/stores/skillStore'
import { Icon } from '@iconify/vue'
import SkillWorkspaceLoader from './SkillWorkspaceLoader.vue'
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue'
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue'
import SkillDescriptionSummary from './SkillDescriptionSummary.vue'
import type { Skill } from '~/types/skill'

const { t } = useLocalization()

const props = defineProps<{
  skillName: string
}>()

defineEmits<{
  back: []
}>()

const skillStore = useSkillStore()
const skill = ref<Skill | null>(null)
const isLoading = ref(true)
const loadError = ref('')

// Lifecycle and Methods
onMounted(async () => {
  await loadSkillDetails()
})

watch(() => props.skillName, async () => {
  await loadSkillDetails()
})

async function loadSkillDetails() {
  isLoading.value = true
  loadError.value = ''
  skill.value = null

  try {
    const loadedSkill = await skillStore.fetchSkill(props.skillName)
    if (!loadedSkill) {
      loadError.value = t('skills.components.skills.SkillDetail.not_found')
      return
    }

    skill.value = loadedSkill
  } catch (e: any) {
    loadError.value = e?.message || t('skills.components.skills.SkillDetail.failed_to_load_skill')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.skill-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  padding: 2rem;
  color: #6b7280;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  color: #f59e0b;
}

.btn-recover {
  border: 1px solid #d1d5db;
  background: white;
  color: #111827;
  padding: 0.625rem 1rem;
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

/* Compact Header */
.compact-header {
  padding: 0.875rem 2rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  min-width: 0;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  margin-left: -0.375rem; /* Optical alignment */
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-back:hover {
  color: #111827;
  background: #f3f4f6;
}

.btn-recover:hover {
  background: #f9fafb;
}

.back-icon {
  font-size: 1.25rem;
}

.header-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.skill-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-disabled {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-weight: 500;
  flex-shrink: 0;
}

.btn-back:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .compact-header {
    padding: 0.75rem 1rem;
  }

  .header-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
  }

}

/* Workspace */
.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

/* Sidebar */
.sidebar {
  width: 280px; /* Slightly wider */
  background: #f9fafb; /* Light gray background */
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Editor Pane */
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
