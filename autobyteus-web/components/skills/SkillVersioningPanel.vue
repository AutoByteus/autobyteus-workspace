<template>
  <div class="versioning-panel" :class="{ 'versioning-panel--compact': mode === 'compact' }">
    <!-- Compact Mode -->
    <div v-if="mode === 'compact'" class="compact-container">
      <div v-if="!skill.isVersioned" class="compact-actions">
        <div class="status-badge-ghost">
          <span class="status-dot-xs"></span>
          Not versioned
        </div>
        <button class="btn-magic btn-sm" :disabled="skill.isReadonly || actionLoading" @click="$emit('enable-versioning')">
          <svg class="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          Enable Versioning
        </button>
      </div>
      
      <div v-else class="compact-actions">
         <span class="status-badge-active" :title="'Active: ' + (skill.activeVersion || 'Unknown')">
          <span class="status-dot-active"></span>
          {{ skill.activeVersion || 'Unknown' }}
        </span>
        
        <div class="compact-controls">
          <div class="select-wrapper-sm">
            <select
              v-model="selectedVersion"
              class="version-select-sm"
              :disabled="versionsLoading || versions.length === 0"
            >
              <option v-if="versions.length === 0" disabled value="">No versions</option>
              <option v-for="version in versions" :key="version.tag" :value="version.tag">
                {{ version.tag }}
              </option>
            </select>
            <svg class="select-arrow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <button
            class="btn-soft btn-sm"
            :disabled="!canActivate || actionLoading || skill.isReadonly"
            @click="activateSelected"
          >
            Activate
          </button>
           <button class="btn-ghost btn-sm" :disabled="versions.length < 2" @click="$emit('compare-versions')" title="History">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Default Mode -->
    <template v-else>
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Versioning</h3>
          <p class="panel-subtitle">Manage skill versions and compare changes.</p>
        </div>
        <div v-if="skill.isVersioned" class="active-pill">
          Active: {{ skill.activeVersion || 'Unknown' }}
        </div>
      </div>

      <div v-if="!skill.isVersioned" class="panel-body">
        <div class="status-row">
          <span class="status-dot status-dot--inactive"></span>
          <span class="status-text">Not versioned</span>
        </div>
        
        <button class="btn-magic" :disabled="skill.isReadonly || actionLoading" @click="$emit('enable-versioning')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          Enable Versioning
        </button>
        
        <p v-if="skill.isReadonly" class="hint-text">This skill is read-only.</p>
        <p v-if="actionError" class="error-text">{{ actionError }}</p>
      </div>

      <div v-else class="panel-body">
        <div class="status-row">
          <span class="status-dot status-dot--active"></span>
          <span class="status-text">Versioned</span>
        </div>

        <div class="controls-row">
          <label class="control-label">Activate version</label>
          <div class="control-group">
            <div class="select-wrapper">
              <select
                v-model="selectedVersion"
                class="version-select"
                :disabled="versionsLoading || versions.length === 0"
              >
                <option v-if="versions.length === 0" disabled value="">
                  No versions available
                </option>
                <option
                  v-for="version in versions"
                  :key="version.tag"
                  :value="version.tag"
                >
                  {{ version.tag }}
                </option>
              </select>
              <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            <button
              class="btn-soft"
              :disabled="!canActivate || actionLoading || skill.isReadonly"
              @click="activateSelected"
            >
              Activate
            </button>
          </div>
          <p v-if="versionsLoading" class="hint-text">Loading...</p>
          <p v-else-if="versionsError" class="error-text">{{ versionsError }}</p>
          <p v-else-if="skill.isReadonly" class="hint-text">This skill is read-only.</p>
          <p v-if="actionError" class="error-text">{{ actionError }}</p>
        </div>

        <div class="actions-row">
          <button class="btn-ghost" :disabled="versions.length < 2" @click="$emit('compare-versions')">
            <svg class="btn-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            History / Compare
          </button>
          <span v-if="versions.length < 2" class="hint-text">Need at least two versions to compare.</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Skill, SkillVersion } from '~/types/skill'

const props = withDefaults(defineProps<{
  skill: Skill
  versions: SkillVersion[]
  versionsLoading: boolean
  versionsError: string
  actionError: string
  actionLoading: boolean
  mode?: 'default' | 'compact'
}>(), {
  mode: 'default'
})

const emit = defineEmits<{
  'enable-versioning': []
  'activate-version': [version: string]
  'compare-versions': []
}>()

const selectedVersion = ref('')

const canActivate = computed(() => {
  if (!props.skill.isVersioned) return false
  if (!selectedVersion.value) return false
  return selectedVersion.value !== props.skill.activeVersion
})

function selectDefaultVersion() {
  if (props.skill.activeVersion) {
    selectedVersion.value = props.skill.activeVersion
    return
  }
  if (props.versions.length > 0) {
    selectedVersion.value = props.versions[0].tag
  }
}

function activateSelected() {
  if (!canActivate.value) return
  emit('activate-version', selectedVersion.value)
}

watch(
  () => [props.skill.activeVersion, props.versions],
  () => {
    if (!selectedVersion.value || selectedVersion.value === props.skill.activeVersion) {
      selectDefaultVersion()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* --- Core Layout & Typo --- */
.versioning-panel {
  border-bottom: 1px solid #f3f4f6; /* Lighter border */
  background: #ffffff; /* Clean white bg */
  padding: 1.5rem 2rem;
  transition: all 0.2s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem; /* 18px */
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.panel-subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 400;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* --- Badges & Pills --- */
.active-pill {
  background: #ecfdf5; /* Emerald 50 */
  color: #047857;      /* Emerald 700 */
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid #d1fae5;
  letter-spacing: 0.02em;
}

/* --- Buttons --- */
/* 1. Primary Action Button (Matches Create Skill) */
.btn-magic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: none;
}

.btn-magic:hover:not(:disabled) {
  background: #2563eb;
  transform: none;
  box-shadow: none;
  filter: none;
}

.btn-magic:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #3b82f6;
}

.btn-icon {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.5rem;
}

.btn-icon-sm {
  width: 1rem;
  height: 1rem;
  margin-right: 0.375rem;
}

/* 2. Soft Button (Secondary) */
.btn-soft {
  background: #f3f4f6;
  color: #111827;
  border: 1px solid transparent;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-soft:hover:not(:disabled) {
  background: #e5e7eb;
  color: #000;
}

.btn-soft:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 3. Ghost Button (Tertiary/Icon only) */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  background: transparent;
  color: #6b7280;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.btn-ghost:hover:not(:disabled) {
  color: #111827;
  background: #f9fafb;
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Selects & Inputs --- */
.select-wrapper {
  position: relative;
  width: 200px;
}

.version-select {
  width: 100%;
  appearance: none;
  padding: 0.55rem 0.75rem;
  padding-right: 2.5rem; /* Space for arrow */
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.version-select:focus {
  outline: none;
  border-color: #2563eb; /* Brand blue focus */
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.version-select:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
  pointer-events: none;
}

.control-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.control-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* --- Status Indicators --- */
.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-dot--inactive { background: #d1d5db; }
.status-dot--active { background: #10b981; }

.status-text {
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;
}

.hint-text {
  font-size: 0.8125rem;
  color: #6b7280;
}

.error-text {
  font-size: 0.8125rem;
  color: #dc2626;
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* --- Compact Mode Overrides --- */
.versioning-panel--compact {
  padding: 0;
  border: none;
  background: transparent;
}

.compact-container, .compact-actions, .compact-controls {
  display: flex;
  align-items: center;
}

.compact-actions { gap: 1rem; }
.compact-controls { gap: 0.75rem; }

.status-badge-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4b5563;
}

.status-badge-active {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  color: #15803d;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-dot-xs {
  width: 0.5rem;
  height: 0.5rem;
  background: #9ca3af;
  border-radius: 50%;
}

.status-dot-active {
  width: 0.5rem;
  height: 0.5rem;
  background: #16a34a;
  border-radius: 50%;
}

.select-wrapper-sm {
  position: relative;
  width: auto;
}

.version-select-sm {
  appearance: none;
  padding: 0.45rem 0.75rem;
  padding-right: 2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  background: white;
  min-width: 100px;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
  color: #1f2937;
}

.select-arrow-sm {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  pointer-events: none;
}

.w-3 { width: 0.75rem; }
.h-3 { height: 0.75rem; }
.w-4 { width: 1.25rem; }
.h-4 { height: 1.25rem; }
.mr-1\.5 { margin-right: 0.375rem; }
</style>
