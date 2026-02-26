<template>
  <div class="h-full bg-gray-50 p-6 overflow-auto">
    <div class="mx-auto max-w-7xl space-y-6">
      <header class="space-y-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Prompt Engineering</h1>
          <p class="text-sm text-gray-600">Create, review, and refine prompt assets.</p>
        </div>
        <nav class="inline-flex rounded-lg border border-gray-200 bg-white p-1" aria-label="Prompt sections">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            :class="activeSection === 'marketplace' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="navigateTo('marketplace')"
          >
            Prompts
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            :class="activeSection === 'drafts' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="navigateTo('drafts')"
          >
            Drafts
          </button>
        </nav>
      </header>

      <section class="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <transition name="fade" mode="out-in">
          <PromptMarketplace
            v-if="viewStore.isMarketplaceView"
            :selectedPromptId="viewStore.selectedPromptId"
            @select-prompt="viewStore.showPromptDetails"
          />

          <DraftsList v-else-if="viewStore.isDraftsView" />

          <CreatePromptView v-else-if="viewStore.isCreateView" />

          <PromptDetails v-else-if="viewStore.isDetailsView" :promptId="viewStore.selectedPromptId!" />
        </transition>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePromptEngineeringViewStore } from '~/stores/promptEngineeringViewStore';
import PromptMarketplace from '~/components/promptEngineering/PromptMarketplace.vue';
import PromptDetails from '~/components/promptEngineering/PromptDetails.vue';
import CreatePromptView from '~/components/promptEngineering/CreatePromptView.vue';
import DraftsList from '~/components/promptEngineering/DraftsList.vue';

const viewStore = usePromptEngineeringViewStore();

const activeSection = computed(() => viewStore.currentSectionContext);

function navigateTo(section: 'marketplace' | 'drafts') {
  if (section === 'marketplace') {
    viewStore.showMarketplace();
    return;
  }
  viewStore.showDraftsList();
}
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
