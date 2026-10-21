<template>
  <div class="space-y-5" data-testid="remote-collaboration-card">
    <FeatureCapabilityToggleCard
      :store="capabilityStore"
      :title="t('settings.components.settings.RemoteCollaboration.title')"
      :description="t('settings.components.settings.RemoteCollaboration.description')"
      test-id-prefix="remote-collaboration"
      :status-labels="statusLabels"
      :status-message="statusMessage"
    />

    <p
      v-if="store.error && store.errorScope === 'load'"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="remote-collaboration-error"
    >
      {{ store.error }}
    </p>

    <RemoteCollaborationPeersSection :switch-on="capabilityStore.isEnabled" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import FeatureCapabilityToggleCard from '~/components/settings/FeatureCapabilityToggleCard.vue'
import RemoteCollaborationPeersSection from '~/components/settings/RemoteCollaborationPeersSection.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRemoteCollaborationCapabilityStore } from '~/stores/remoteCollaborationCapabilityStore'
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'

const { t } = useLocalization()
const capabilityStore = useRemoteCollaborationCapabilityStore()
const store = useRemoteCollaborationStore()
const offers = useRemoteCollaborationOffersStore()

const statusLabels = computed(() => ({
  loading: t('settings.components.settings.RemoteCollaboration.status.loading'),
  error: t('settings.components.settings.RemoteCollaboration.status.error'),
  enabled: t('settings.components.settings.RemoteCollaboration.status.enabled'),
  disabled: t('settings.components.settings.RemoteCollaboration.status.disabled'),
  saving: t('settings.components.settings.RemoteCollaboration.status.saving'),
}))

const statusMessage = computed(() => capabilityStore.capability?.source === 'DEFAULT_DISABLED'
  ? t('settings.components.settings.RemoteCollaboration.source.defaultDisabled')
  : null)

// The peers' offers (autobyteus-267 REQ-504, REQ-508): every peer is asked once when the tab opens with the switch on,
// and again when the switch turns on; turning it off, or leaving the tab, drops every state. Nothing polls. The
// switch is only watched once the tab has loaded, so opening it asks each peer once.
let opened = false
onMounted(async () => {
  await Promise.all([capabilityStore.ensureResolved().catch(() => undefined), store.load()])
  opened = true
  if (capabilityStore.isEnabled) offers.askAll(store.peers)
})
watch(() => capabilityStore.isEnabled, (on) => {
  if (!opened) return
  if (on) offers.askAll(store.peers)
  else offers.clear()
})
onBeforeUnmount(() => {
  opened = false
  offers.clear()
})
</script>
