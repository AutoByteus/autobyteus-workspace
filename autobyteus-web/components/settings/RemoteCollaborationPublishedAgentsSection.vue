<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="remote-collaboration-published">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-xl font-semibold text-gray-900">{{ t('settings.components.settings.RemoteCollaboration.published.title') }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ t('settings.components.settings.RemoteCollaboration.published.description') }}</p>
      </div>
      <button
        v-if="!editing"
        type="button"
        class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        data-testid="remote-collaboration-publish-start"
        @click="editing = { mode: 'publish' }"
      >
        {{ t('settings.components.settings.RemoteCollaboration.published.publish') }}
      </button>
    </div>

    <ul v-if="store.publishedAgents.length" class="mt-4 divide-y divide-slate-100" data-testid="remote-collaboration-published-list">
      <li
        v-for="agent in store.publishedAgents"
        :key="agent.agentDefinitionId"
        class="flex flex-wrap items-center gap-3 py-3"
        :data-testid="`remote-collaboration-published-${agent.agentDefinitionId}`"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-slate-900">
            {{ agent.definitionName ?? agent.agentDefinitionId }}
            <span class="ml-2 font-mono text-xs text-slate-500">{{ agent.address ?? t('settings.components.settings.RemoteCollaboration.published.noAddress') }}</span>
          </p>
          <p class="truncate text-xs text-slate-500">
            {{ agent.runtimeKind }} · {{ agent.llmModelIdentifier }} · {{ agent.workspaceRootPath }}
            · {{ agent.autoExecuteTools ? t('settings.components.settings.RemoteCollaboration.published.autoApproveOn') : t('settings.components.settings.RemoteCollaboration.published.autoApproveOff') }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
          :disabled="store.saving || Boolean(editing)"
          @click="editing = { mode: 'update', agent }"
        >
          {{ t('settings.components.settings.RemoteCollaboration.published.edit') }}
        </button>
        <button
          type="button"
          class="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-red-300"
          :disabled="store.saving"
          :data-testid="`remote-collaboration-unpublish-${agent.agentDefinitionId}`"
          @click="store.unpublishAgent(agent.agentDefinitionId)"
        >
          {{ t('settings.components.settings.RemoteCollaboration.published.unpublish') }}
        </button>
      </li>
    </ul>
    <p v-else-if="!store.loading && !editing" class="mt-4 text-sm text-slate-500">
      {{ t('settings.components.settings.RemoteCollaboration.published.empty') }}
    </p>

    <p
      v-if="store.error && store.errorScope === 'published'"
      class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="remote-collaboration-published-error"
    >
      {{ store.error }}
    </p>

    <RemoteCollaborationPublishForm
      v-if="editing"
      class="mt-5"
      :agent="editing.mode === 'update' ? editing.agent : null"
      :published-ids="store.publishedAgents.map((agent) => agent.agentDefinitionId)"
      @close="editing = null"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RemoteCollaborationPublishForm from '~/components/settings/RemoteCollaborationPublishForm.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRemoteCollaborationStore, type PublishedAgent } from '~/stores/remoteCollaborationStore'

const { t } = useLocalization()
const store = useRemoteCollaborationStore()
const editing = ref<{ mode: 'publish' } | { mode: 'update'; agent: PublishedAgent } | null>(null)
</script>
