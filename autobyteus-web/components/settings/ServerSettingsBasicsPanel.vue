<template>
  <div class="space-y-6 max-w-7xl mx-auto rounded-3xl bg-white/70 p-4 md:p-5">
    <ServerSettingsEndpointCards @notify="showNotification" />

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <ApplicationsFeatureToggleCard />
      <MediaDefaultModelsCard />
      <CodexFullAccessCard />
      <StreamingParserCard />
      <FeaturedCatalogItemsCard />
      <WebSearchConfigurationCard @notify="showNotification" />
      <CompactionConfigCard />
    </div>

    <div
      v-if="notification"
      class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
      :class="notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'"
      data-testid="server-settings-basics-notification"
    >
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ApplicationsFeatureToggleCard from '~/components/settings/ApplicationsFeatureToggleCard.vue'
import CodexFullAccessCard from '~/components/settings/CodexFullAccessCard.vue'
import CompactionConfigCard from '~/components/settings/CompactionConfigCard.vue'
import FeaturedCatalogItemsCard from '~/components/settings/FeaturedCatalogItemsCard.vue'
import MediaDefaultModelsCard from '~/components/settings/MediaDefaultModelsCard.vue'
import ServerSettingsEndpointCards from '~/components/settings/ServerSettingsEndpointCards.vue'
import StreamingParserCard from '~/components/settings/StreamingParserCard.vue'
import WebSearchConfigurationCard from '~/components/settings/WebSearchConfigurationCard.vue'

type NotificationType = 'success' | 'error'
type NotificationPayload = { type: NotificationType; message: string }

const notification = ref<NotificationPayload | null>(null)

const showNotification = (payload: NotificationPayload) => {
  notification.value = payload
  setTimeout(() => {
    notification.value = null
  }, 3000)
}
</script>
