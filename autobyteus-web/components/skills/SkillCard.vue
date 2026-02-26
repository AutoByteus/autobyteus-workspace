<template>
  <div class="skill-card" :class="{ 'is-disabled': skill.isDisabled }">
    <div class="card-body">
      <div class="header">
        <h3 class="skill-name" :title="skill.name">{{ skill.name }}</h3>
        <span v-if="skill.isDisabled" class="badge-disabled">Disabled</span>
      </div>
      
      <p class="skill-description" :title="skill.description">
        {{ skill.description || 'No description provided.' }}
      </p>
      
      <div class="meta-info">
        <Icon icon="heroicons:document" class="meta-icon" />
        <span class="file-count">{{ skill.fileCount }} {{ skill.fileCount === 1 ? 'file' : 'files' }}</span>
      </div>
    </div>

    <div class="card-footer">
      <div class="actions">
        <button 
          class="btn-primary" 
          @click="$emit('view', skill)" 
        >
          View
        </button>

        <div class="secondary-actions">
          <button 
            class="btn-secondary" 
            @click="$emit('toggle-disable', skill)"
          >
            {{ skill.isDisabled ? 'Enable' : 'Disable' }}
          </button>
          
          <button 
            class="btn-danger" 
            @click="$emit('delete', skill)"
            title="Delete Skill"
          >
            <Icon icon="heroicons:trash" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Skill } from '~/types/skill'

defineProps<{
  skill: Skill
}>()

defineEmits<{
  view: [skill: Skill]
  delete: [skill: Skill]
  'toggle-disable': [skill: Skill]
}>()
</script>

<style scoped>
.skill-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  height: 100%;
}

.skill-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.card-body {
  padding: 1.25rem 1.25rem 0.5rem;
  flex: 1;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.skill-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

.badge-disabled {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
  white-space: nowrap;
}

.skill-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.625rem; /* Fixed height for 2 lines */
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.meta-icon {
  font-size: 1rem;
}

.card-footer {
  padding: 1rem 1.25rem 1.25rem;
  border-top: 1px solid transparent;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.secondary-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

button {
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.btn-danger {
  background: white;
  color: #9ca3af;
  border: 1px solid transparent;
  padding: 0.4rem;
  width: 2rem;
  height: 2rem;
}

.btn-danger:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* Disabled State Styles */
.is-disabled {
  background-color: #fcfcfc;
}

.is-disabled .skill-name {
  color: #9ca3af;
}

.is-disabled .btn-primary {
  background: #9ca3af;
  cursor: default;
}
</style>
