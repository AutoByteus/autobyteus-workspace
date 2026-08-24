<template>
  <div class="flex h-full bg-gray-50">
    <!-- Main Content Area -->
    <div :class="['flex-1', selectedSkillName ? 'overflow-hidden' : 'p-6 overflow-auto']">
      <transition name="fade" mode="out-in">
        <!-- Skills List View -->
        <SkillsList 
          v-if="!selectedSkillName"
          @viewDetail="showSkillDetail"
        />
        
        <!-- Skill Detail View -->
        <SkillDetail
          v-else
          :skillName="selectedSkillName"
          @back="selectedSkillName = null"
        />
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import SkillsList from '~/components/skills/SkillsList.vue';
import SkillDetail from '~/components/skills/SkillDetail.vue';
import { useSkillStore } from '~/stores/skillStore';

const skillStore = useSkillStore();
const { skills } = storeToRefs(skillStore);
const selectedSkillName = ref<string | null>(null);

function showSkillDetail(skillName: string) {
  selectedSkillName.value = skillName;
}

watch(skills, (nextSkills) => {
  if (!selectedSkillName.value) {
    return;
  }

  const stillExists = nextSkills.some((skill) => skill.name === selectedSkillName.value);
  if (!stillExists) {
    selectedSkillName.value = null;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
