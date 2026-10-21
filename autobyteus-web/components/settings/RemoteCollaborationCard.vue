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

    <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="remote-collaboration-availability">
      <h3 class="text-xl font-semibold text-gray-900">{{ t('settings.components.settings.RemoteCollaboration.availability.title') }}</h3>
      <p class="mt-1 text-sm text-gray-500">{{ t('settings.components.settings.RemoteCollaboration.availability.note') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import FeatureCapabilityToggleCard from '~/components/settings/FeatureCapabilityToggleCard.vue'
import RemoteCollaborationPeersSection from '~/components/settings/RemoteCollaborationPeersSection.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRemoteCollaborationCapabilityStore } from '~/stores/remoteCollaborationCapabilityStore'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'

const { t } = useLocalization()
const capabilityStore = useRemoteCollaborationCapabilityStore()
const store = useRemoteCollaborationStore()

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

onMounted(() => {
  void capabilityStore.ensureResolved()
  void store.load()
})
</script>
