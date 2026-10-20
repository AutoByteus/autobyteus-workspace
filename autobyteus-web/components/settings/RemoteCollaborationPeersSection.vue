<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="remote-collaboration-peers">
    <h3 class="text-xl font-semibold text-gray-900">{{ t('settings.components.settings.RemoteCollaboration.peers.title') }}</h3>
    <p class="mt-1 text-sm text-gray-500">{{ t('settings.components.settings.RemoteCollaboration.peers.description') }}</p>

    <ul v-if="store.peers.length" class="mt-4 divide-y divide-slate-100" data-testid="remote-collaboration-peer-list">
      <li
        v-for="peer in store.peers"
        :key="peer.nodeId"
        class="flex flex-wrap items-center gap-3 py-3"
        :data-testid="`remote-collaboration-peer-${peer.nodeId}`"
      >
        <div class="min-w-0 flex-1">
          <input
            v-if="renaming === peer.nodeId"
            v-model="renameDraft"
            type="text"
            class="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            :aria-label="t('settings.components.settings.RemoteCollaboration.peers.nameLabel')"
            data-testid="remote-collaboration-peer-rename-input"
            @keydown.enter.prevent="saveRename(peer.nodeId)"
          >
          <p v-else class="font-medium text-slate-900">{{ peer.name }}</p>
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
          <button type="button" :class="secondaryButton" :disabled="store.saving" @click="startRename(peer.nodeId, peer.name)">
            {{ t('settings.components.settings.RemoteCollaboration.peers.rename') }}
          </button>
          <button
            type="button"
            :class="dangerButton"
            :disabled="store.saving"
            :data-testid="`remote-collaboration-peer-remove-${peer.nodeId}`"
            @click="store.removePeer(peer.nodeId)"
          >
            {{ t('settings.components.settings.RemoteCollaboration.peers.remove') }}
          </button>
        </template>
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
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'

const props = defineProps<{ switchOn: boolean }>()

const { t } = useLocalization()
const store = useRemoteCollaborationStore()

const primaryButton = 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300'
const secondaryButton = 'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'
const dangerButton = 'rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300'

const draft = reactive({ baseUrl: '', name: '' })
const renaming = ref<string | null>(null)
const renameDraft = ref('')

const canAdd = computed(() => props.switchOn && !store.saving && draft.baseUrl.trim().length > 0 && draft.name.trim().length > 0)

const addPeer = async (): Promise<void> => {
  if (!canAdd.value) return
  if (await store.addPeer({ baseUrl: draft.baseUrl.trim(), name: draft.name.trim() })) {
    draft.baseUrl = ''
    draft.name = ''
  }
}

const startRename = (nodeId: string, name: string): void => {
  renaming.value = nodeId
  renameDraft.value = name
}

const saveRename = async (nodeId: string): Promise<void> => {
  if (await store.renamePeer(nodeId, renameDraft.value.trim())) renaming.value = null
}
</script>
