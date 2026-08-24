<template>
  <div class="description-row" :class="{ 'is-expanded': isDescriptionExpanded }">
    <div class="description-summary" :class="{ 'is-expanded': isDescriptionExpanded }">
      <span
        :id="descriptionTextId"
        :class="isDescriptionExpanded ? 'description-expanded-text' : 'description-text'"
      >
        {{ skillDescription }}
      </span>
      <button
        v-if="hasSkillDescription"
        :class="['description-toggle', isDescriptionExpanded ? 'description-less' : 'description-more']"
        type="button"
        :aria-expanded="isDescriptionExpanded"
        :aria-controls="descriptionTextId"
        :aria-label="toggleDescriptionLabel"
        @click="toggleDescriptionExpansion"
      >
        {{ toggleDescriptionText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const { t } = useLocalization()

const props = defineProps<{
  description: string
}>()

const isDescriptionExpanded = ref(false)
const descriptionTextId = 'skill-description-text'

const hasSkillDescription = computed(() => Boolean(props.description?.trim()))
const skillDescription = computed(() => {
  const description = props.description?.trim()
  return description || t('skills.components.skills.SkillCard.no_description_provided')
})
const toggleDescriptionText = computed(() => (
  isDescriptionExpanded.value
    ? t('skills.components.skills.SkillDetail.less_description')
    : t('skills.components.skills.SkillDetail.more_description')
))
const toggleDescriptionLabel = computed(() => (
  isDescriptionExpanded.value
    ? t('skills.components.skills.SkillDetail.collapse_description')
    : t('skills.components.skills.SkillDetail.expand_description')
))

function toggleDescriptionExpansion() {
  isDescriptionExpanded.value = !isDescriptionExpanded.value
}
</script>

<style scoped>
.description-row {
  margin-top: 0.35rem;
  padding-left: 2.625rem;
  min-width: 0;
}

.description-summary {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  min-width: 0;
  max-width: min(72rem, 100%);
  color: #6b7280;
  font-size: 0.9375rem;
  line-height: 1.35;
}

.description-summary.is-expanded {
  align-items: flex-start;
}

.description-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.description-expanded-text {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  color: #4b5563;
  line-height: 1.45;
}

.description-toggle {
  background: transparent;
  border: none;
  color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
}

.description-toggle:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.description-toggle:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .description-row {
    padding-left: 0;
  }
}
</style>
