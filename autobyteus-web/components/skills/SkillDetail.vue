<template>
  <div v-if="!skill" class="loading-state">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
  <div v-else class="skill-detail">
    <!-- Compact Header -->
    <header class="compact-header">
      <div class="header-top-row">
        <button class="btn-back" @click="$emit('back')">
          <Icon icon="heroicons:arrow-left" class="back-icon" />
        </button>
      </div>
      
      <div class="header-main-row">
        <div class="title-group">
          <h2 class="skill-title">{{ skill.name }}</h2>
          <span v-if="skill.isDisabled" class="badge-disabled">Disabled</span>
        </div>
        
        <!-- Versioning Controls (Placeholder for integrated panel) -->
        <div class="header-actions">
           <SkillVersioningPanel
            v-if="skill"
            mode="compact"
            :skill="skill"
            :versions="versions"
            :versions-loading="versionsLoading"
            :versions-error="versionsError"
            :action-error="actionError"
            :action-loading="actionLoading"
            @enable-versioning="handleEnableVersioning"
            @activate-version="handleActivateVersion"
            @compare-versions="showCompareModal = true"
          />
        </div>
      </div>

      <p class="description">{{ skill.description }}</p>
    </header>

    <!-- Main Workspace -->
    <SkillWorkspaceLoader :key="workspaceKey" :skillId="skill.name">
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

    <SkillVersionCompareModal
      v-if="showCompareModal"
      :skill-name="skill.name"
      :versions="versions"
      @close="showCompareModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSkillStore } from '~/stores/skillStore'
import { Icon } from '@iconify/vue'
import SkillWorkspaceLoader from './SkillWorkspaceLoader.vue'
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue'
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue'
import SkillVersioningPanel from './SkillVersioningPanel.vue'
import SkillVersionCompareModal from './SkillVersionCompareModal.vue'
import type { Skill, SkillVersion } from '~/types/skill'
import { useToasts } from '~/composables/useToasts'

const props = defineProps<{
  skillName: string
}>()

const emit = defineEmits<{
  back: []
}>()

const skillStore = useSkillStore()
const { addToast } = useToasts()
const skill = ref<Skill | null>(null)
const versions = ref<SkillVersion[]>([])
const versionsLoading = ref(false)
const versionsError = ref('')
const actionError = ref('')
const actionLoading = ref(false)
const showCompareModal = ref(false)
const workspaceKey = ref(0)

// Lifecycle and Methods
onMounted(async () => {
  await loadSkillDetails()
})

watch(() => props.skillName, async () => {
  await loadSkillDetails()
})

async function loadSkillDetails() {
  skill.value = await skillStore.fetchSkill(props.skillName)
  showCompareModal.value = false
  actionError.value = ''
  actionLoading.value = false
  await loadVersions()
}

async function loadVersions() {
  versions.value = []
  versionsError.value = ''

  if (!skill.value?.isVersioned) {
    return
  }

  versionsLoading.value = true
  try {
    versions.value = await skillStore.fetchSkillVersions(skill.value.name)
  } catch (e: any) {
    versionsError.value = e?.message || 'Failed to load versions.'
  } finally {
    versionsLoading.value = false
  }
}

async function handleEnableVersioning() {
  if (!skill.value) return
  actionError.value = ''
  if (skill.value.isReadonly) {
    actionError.value = 'This skill is read-only.'
    addToast(actionError.value, 'error')
    return
  }

  actionLoading.value = true
  try {
    await skillStore.enableSkillVersioning(skill.value.name)
    await loadSkillDetails()
    addToast('Skill versioning enabled.', 'success')
  } catch (e: any) {
    actionError.value = e?.message || 'Failed to enable skill versioning.'
    addToast(actionError.value, 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleActivateVersion(version: string) {
  if (!skill.value) return
  actionError.value = ''
  if (skill.value.isReadonly) {
    actionError.value = 'This skill is read-only.'
    addToast(actionError.value, 'error')
    return
  }

  actionLoading.value = true
  try {
    await skillStore.activateSkillVersion(skill.value.name, version)
    await loadSkillDetails()
    workspaceKey.value += 1
    addToast(`Activated version ${version}.`, 'success')
  } catch (e: any) {
    actionError.value = e?.message || 'Failed to activate skill version.'
    addToast(actionError.value, 'error')
  } finally {
    actionLoading.value = false
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
  padding: 1.25rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.header-top-row {
  margin-bottom: 0.5rem;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  margin-left: -0.25rem; /* Optical alignment */
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-back:hover {
  color: #111827;
  background: #f3f4f6;
}

.back-icon {
  font-size: 1.25rem;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 2rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.skill-title {
  margin: 0;
  font-size: 2rem; /* Large and bold */
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

.header-actions {
  flex-shrink: 0;
}

.badge-disabled {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-weight: 500;
}

.description {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.5;
  max-width: 800px;
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
