<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="remote-collaboration-peers">
    <h3 class="text-xl font-semibold text-gray-900">{{ t('settings.components.settings.RemoteCollaboration.peers.title') }}</h3>
    <p class="mt-1 text-sm text-gray-500">{{ t('settings.components.settings.RemoteCollaboration.peers.description') }}</p>

    <p
      v-if="!switchOn && store.peers.length"
      class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      data-testid="remote-collaboration-peers-off-notice"
    >
      {{ t('settings.components.settings.RemoteCollaboration.peers.switchOff') }}
    </p>

    <ul v-if="store.peers.length" class="mt-4 divide-y divide-slate-100" data-testid="remote-collaboration-peer-list">
      <li
        v-for="peer in store.peers"
        :key="peer.nodeId"
        class="py-4"
        :data-testid="`remote-collaboration-peer-${peer.nodeId}`"
      >
        <div class="flex flex-wrap items-center gap-3">
          <div class="min-w-[13rem] flex-1">
            <input
              v-if="renaming === peer.nodeId"
              v-model="renameDraft"
              type="text"
              class="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              :aria-label="t('settings.components.settings.RemoteCollaboration.peers.nameLabel')"
              data-testid="remote-collaboration-peer-rename-input"
              @keydown.enter.prevent="saveRename(peer.nodeId)"
            >
            <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p class="font-medium text-slate-900">{{ peer.name }}</p>
              <span
                v-if="switchOn && offers.peers[peer.nodeId]"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusOf(peer.nodeId).chipClass"
                role="status"
                :data-testid="`remote-collaboration-peer-status-${peer.nodeId}`"
              >
                <span v-if="statusOf(peer.nodeId).waiting" class="inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-slate-500" aria-hidden="true" />
                <span v-else class="inline-block h-1.5 w-1.5 rounded-full" :class="statusOf(peer.nodeId).dotClass" aria-hidden="true" />
                {{ statusOf(peer.nodeId).label }}
              </span>
            </div>
            <p class="truncate text-xs text-slate-500">{{ peer.baseUrl }} · {{ peer.nodeId }}</p>
          </div>
          <template v-if="renaming === peer.nodeId">
            <button type="button" :class="primaryButton" :disabled="store.saving" @click="saveRename(peer.nodeId)">
              {{ t('settings.components.settings.RemoteCollaboration.save') }}
            </button>
            <button type="button" :class="secondaryButton" @click="renaming = null">
              {{ t('settings.components.settings.RemoteCollaboration.cancel') }}
            </button>
          </template>
          <template v-else>
            <button
              v-if="switchOn"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-slate-300"
              :disabled="offers.peers[peer.nodeId]?.phase === 'checking'"
              :title="t('settings.components.settings.RemoteCollaboration.peers.refresh')"
              :aria-label="t('settings.components.settings.RemoteCollaboration.peers.refreshLabel', { name: peer.name })"
              :data-testid="`remote-collaboration-peer-refresh-${peer.nodeId}`"
              @click="void offers.ask(peer.nodeId)"
            >
              <svg class="h-4 w-4" :class="offers.peers[peer.nodeId]?.phase === 'checking' ? 'animate-spin' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M16 10a6 6 0 1 1-1.8-4.3" stroke-linecap="round" /><path d="M16.2 3v3.2h-3.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" :class="secondaryButton" :disabled="store.saving" @click="startRename(peer.nodeId, peer.name)">
              {{ t('settings.components.settings.RemoteCollaboration.peers.rename') }}
            </button>
            <button
              type="button"
              :class="dangerButton"
              :disabled="store.saving"
              :data-testid="`remote-collaboration-peer-remove-${peer.nodeId}`"
              @click="removePeer(peer.nodeId)"
            >
              {{ t('settings.components.settings.RemoteCollaboration.peers.remove') }}
            </button>
          </template>
        </div>

        <div v-if="switchOn && offers.peers[peer.nodeId]" class="mt-2" aria-live="polite">
          <p v-if="offerOf(peer.nodeId).phase === 'checking'" class="text-sm text-slate-500" :data-testid="`remote-collaboration-peer-detail-${peer.nodeId}`">
            {{ t('settings.components.settings.RemoteCollaboration.peers.detail.waiting', { name: peer.name }) }}
          </p>
          <p v-else-if="offerOf(peer.nodeId).phase === 'unavailable'" class="text-sm text-slate-600" :data-testid="`remote-collaboration-peer-detail-${peer.nodeId}`">
            {{ t(`settings.components.settings.RemoteCollaboration.peers.detail.${offerOf(peer.nodeId).code}`, { name: peer.name }) }}
          </p>
          <p v-else-if="offerOf(peer.nodeId).entries.length === 0" class="text-sm text-slate-500" :data-testid="`remote-collaboration-peer-empty-${peer.nodeId}`">
            {{ t('settings.components.settings.RemoteCollaboration.peers.emptyOffer', { name: peer.name }) }}
          </p>
          <RemoteCollaborationOfferDisclosure
            v-else
            :entries="offerOf(peer.nodeId).entries"
            :footer="checkedAt(offerOf(peer.nodeId).checkedAt)"
            :test-id="`remote-collaboration-peer-offer-${peer.nodeId}`"
          />
        </div>
      </li>
    </ul>
    <p v-else-if="!store.loading" class="mt-4 text-sm text-slate-500">{{ t('settings.components.settings.RemoteCollaboration.peers.empty') }}</p>

    <form class="mt-5 grid gap-3 md:grid-cols-[2fr_1fr_auto]" data-testid="remote-collaboration-add-peer" @submit.prevent="addPeer">
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-slate-700">{{ t('settings.components.settings.RemoteCollaboration.peers.urlLabel') }}</span>
        <input
          v-model="draft.baseUrl"
          type="text"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          :placeholder="t('settings.components.settings.RemoteCollaboration.peers.urlPlaceholder')"
          data-testid="remote-collaboration-peer-url"
        >
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-slate-700">{{ t('settings.components.settings.RemoteCollaboration.peers.nameLabel') }}</span>
        <input
          v-model="draft.name"
          type="text"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          :placeholder="t('settings.components.settings.RemoteCollaboration.peers.namePlaceholder')"
          data-testid="remote-collaboration-peer-name"
        >
      </label>
      <div class="flex items-end">
        <button type="submit" :class="primaryButton" :disabled="!canAdd" data-testid="remote-collaboration-peer-add">
          {{ t('settings.components.settings.RemoteCollaboration.peers.add') }}
        </button>
      </div>
    </form>
    <p
      v-if="store.error && store.errorScope === 'peers'"
      class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="remote-collaboration-peers-error"
    >
      {{ store.error }}
    </p>
    <p v-if="!switchOn" class="mt-2 text-xs text-amber-700" data-testid="remote-collaboration-peer-switch-hint">
      {{ t('settings.components.settings.RemoteCollaboration.peers.switchHint') }}
    </p>

    <div class="mt-5 border-t border-slate-100 pt-3">
      <button
        type="button"
        class="flex items-center gap-2 rounded-md py-1 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-expanded="rulesOpen"
        data-testid="remote-collaboration-rules-toggle"
        @click="rulesOpen = !rulesOpen"
      >
        <svg class="h-4 w-4 text-slate-400 transition-transform" :class="rulesOpen ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {{ t('settings.components.settings.RemoteCollaboration.rules.title') }}
      </button>
      <div v-if="rulesOpen" class="mt-2 pl-6 text-sm text-gray-500" data-testid="remote-collaboration-rules">
        <p>{{ t('settings.components.settings.RemoteCollaboration.rules.lead') }}</p>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          <li>{{ t('settings.components.settings.RemoteCollaboration.rules.runtime') }}</li>
          <li>{{ t('settings.components.settings.RemoteCollaboration.rules.workspace') }}</li>
          <li>{{ t('settings.components.settings.RemoteCollaboration.rules.login') }}</li>
          <li>{{ t('settings.components.settings.RemoteCollaboration.rules.refused') }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import RemoteCollaborationOfferDisclosure from '~/components/settings/RemoteCollaborationOfferDisclosure.vue'
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'

const props = defineProps<{ switchOn: boolean }>()

const { t, resolvedLocale } = useLocalization()
const store = useRemoteCollaborationStore()
const offers = useRemoteCollaborationOffersStore()

const primaryButton = 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300'
const secondaryButton = 'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'
const dangerButton = 'rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300'

const draft = reactive({ baseUrl: '', name: '' })
const rulesOpen = ref(false)
const renaming = ref<string | null>(null)
const renameDraft = ref('')

const canAdd = computed(() => props.switchOn && !store.saving && draft.baseUrl.trim().length > 0 && draft.name.trim().length > 0)

const addPeer = async (): Promise<void> => {
  if (!canAdd.value) return
  const added = await store.addPeer({ baseUrl: draft.baseUrl.trim(), name: draft.name.trim() })
  if (!added) return
  draft.baseUrl = ''
  draft.name = ''
  // A peer just added is asked at once (UXJ-004); adding needs the switch on.
  void offers.ask(added.nodeId)
}

// The peer's offer, read only where the template already checked that it exists.
const offerOf = (nodeId: string): any => offers.peers[nodeId]

const checkedAt = (iso: string): string => t('settings.components.settings.RemoteCollaboration.peers.checkedAt', {
  time: new Date(iso).toLocaleTimeString(resolvedLocale.value, { hour: '2-digit', minute: '2-digit' }),
})

const statusOf = (nodeId: string) => {
  const offer = offers.peers[nodeId]
  const base = 'settings.components.settings.RemoteCollaboration.peers.status.'
  if (!offer || offer.phase === 'checking') return { label: t(`${base}waiting`), waiting: true, chipClass: 'bg-slate-100 text-slate-700', dotClass: '' }
  if (offer.phase === 'available') return { label: t(`${base}available`), waiting: false, chipClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-600' }
  const needsOwner = offer.code === 'REMOTE_COLLABORATION_OFF' || offer.code === 'PEER_NOT_REGISTERED'
  return {
    label: t(`${base}${offer.code}`),
    waiting: false,
    chipClass: needsOwner ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
    dotClass: needsOwner ? 'bg-amber-600' : 'bg-red-600',
  }
}

const removePeer = async (nodeId: string): Promise<void> => {
  if (await store.removePeer(nodeId)) offers.forget(nodeId)
}

const startRename = (nodeId: string, name: string): void => {
  renaming.value = nodeId
  renameDraft.value = name
}

const saveRename = async (nodeId: string): Promise<void> => {
  if (await store.renamePeer(nodeId, renameDraft.value.trim())) renaming.value = null
}
</script>
