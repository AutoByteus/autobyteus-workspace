<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="github-integration-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.GitHubIntegrationCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.GitHubIntegrationCard.description') }}
        </p>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
        :class="status.connected ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-slate-100 text-slate-600'"
        data-testid="github-integration-status"
      >
        <span class="h-2 w-2 rounded-full" :class="status.connected ? 'bg-green-500' : 'bg-slate-400'" aria-hidden="true" />
        {{ status.connected
          ? t('settings.components.settings.GitHubIntegrationCard.connectedAs', { login: status.login ?? '' })
          : t('settings.components.settings.GitHubIntegrationCard.notConnected') }}
      </span>
    </div>

    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-900" for="github-integration-token">
        {{ status.connected
          ? t('settings.components.settings.GitHubIntegrationCard.replaceTokenLabel')
          : t('settings.components.settings.GitHubIntegrationCard.tokenLabel') }}
      </label>
      <div class="flex gap-2">
        <input
          id="github-integration-token"
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :placeholder="t('settings.components.settings.GitHubIntegrationCard.tokenPlaceholder')"
          :disabled="busy !== null"
          data-testid="github-integration-token-input"
          @keydown.enter.prevent="saveToken"
        >
        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          :disabled="!tokenDraft.trim() || busy !== null"
          data-testid="github-integration-save"
          @click="saveToken"
        >
          <span v-if="busy === 'connect'" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white" aria-hidden="true" />
          {{ t('settings.components.settings.GitHubIntegrationCard.save') }}
        </button>
      </div>
      <p class="text-xs text-gray-500">{{ t('settings.components.settings.GitHubIntegrationCard.tokenHint') }}</p>

      <div v-if="status.connected" class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy !== null"
          data-testid="github-integration-test"
          @click="testConnection"
        >
          {{ busy === 'test'
            ? t('settings.components.settings.GitHubIntegrationCard.testing')
            : t('settings.components.settings.GitHubIntegrationCard.test') }}
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy !== null"
          data-testid="github-integration-remove"
          @click="removeToken"
        >
          {{ t('settings.components.settings.GitHubIntegrationCard.remove') }}
        </button>
        <span v-if="connectedSince" class="text-xs text-gray-500" data-testid="github-integration-connected-at">
          {{ t('settings.components.settings.GitHubIntegrationCard.connectedSince', { date: connectedSince }) }}
        </span>
      </div>
    </div>

    <p v-if="message" class="mt-3 text-sm" :class="message.kind === 'error' ? 'text-red-600' : 'text-green-700'" role="status" data-testid="github-integration-message">
      {{ message.text }}
    </p>

    <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4" data-testid="github-integration-agents">
      <h4 class="text-sm font-semibold text-gray-900">
        {{ t('settings.components.settings.GitHubIntegrationCard.agentsTitle') }}
      </h4>
      <p class="mt-1 text-sm text-gray-600">
        {{ t('settings.components.settings.GitHubIntegrationCard.agentsExplanation') }}
      </p>
      <p v-if="agentOptions.length === 0" class="mt-3 text-sm text-gray-500" data-testid="github-integration-no-agents">
        {{ t('settings.components.settings.GitHubIntegrationCard.noAgents') }}
      </p>
      <ul v-else class="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
        <li v-for="agent in agentOptions" :key="agent.id">
          <label class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              :checked="allowed.has(agent.id)"
              :disabled="busy !== null"
              :data-testid="`github-integration-agent-${agent.id}`"
              @change="toggleAgent(agent.id)"
            >
            <span class="min-w-0 truncate text-sm text-gray-800">{{ agent.name }}</span>
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { GitHubIntegrationError, useGitHubIntegrationStore } from '~/stores/githubIntegrationStore'

type Busy = 'connect' | 'test' | 'remove' | 'agents'
type Message = { kind: 'success' | 'error'; text: string }

const store = useGitHubIntegrationStore()
const agentStore = useAgentDefinitionStore()
const { t } = useLocalization()

const tokenDraft = ref('')
const busy = ref<Busy | null>(null)
const message = ref<Message | null>(null)

const status = computed(() => store.status)
const allowed = computed(() => new Set(store.status.agentDefinitionIds))
const agentOptions = computed(() =>
  [...agentStore.agentDefinitions]
    .map((agent) => ({ id: agent.id, name: agent.name }))
    .sort((left, right) => left.name.localeCompare(right.name)),
)
const connectedSince = computed(() => {
  const at = store.status.connectedAt
  return at ? new Date(at).toLocaleDateString() : ''
})

const ERROR_KEYS: Readonly<Record<string, string>> = {
  TOKEN_REJECTED: 'settings.components.settings.GitHubIntegrationCard.errorTokenRejected',
  TOKEN_CHECK_FAILED: 'settings.components.settings.GitHubIntegrationCard.errorTokenCheckFailed',
  TOKEN_REQUIRED: 'settings.components.settings.GitHubIntegrationCard.errorTokenRequired',
  INTEGRATION_NOT_CONNECTED: 'settings.components.settings.GitHubIntegrationCard.errorNotConnected',
  VAULT_UNAVAILABLE: 'settings.components.settings.GitHubIntegrationCard.errorVaultUnavailable',
}

/** The message for a coded server error, else the action's own failure message. Never shows the token. */
const errorText = (cause: unknown, fallbackKey: string): string => {
  const code = cause instanceof GitHubIntegrationError ? cause.code : null
  return t((code && ERROR_KEYS[code]) || fallbackKey)
}

const run = async (kind: Busy, action: () => Promise<string | null>, fallbackKey: string): Promise<void> => {
  if (busy.value) return
  busy.value = kind
  message.value = null
  try {
    const success = await action()
    if (success) message.value = { kind: 'success', text: success }
  } catch (cause) {
    message.value = { kind: 'error', text: errorText(cause, fallbackKey) }
  } finally {
    busy.value = null
  }
}

const saveToken = (): Promise<void> => run('connect', async () => {
  const token = tokenDraft.value.trim()
  if (!token) return null
  const connected = await store.connect(token)
  tokenDraft.value = ''
  return t('settings.components.settings.GitHubIntegrationCard.saved', { login: connected.login ?? '' })
}, 'settings.components.settings.GitHubIntegrationCard.saveFailed')

const testConnection = (): Promise<void> => run('test', async () => {
  const tested = await store.test()
  return t('settings.components.settings.GitHubIntegrationCard.testPassed', { login: tested.login ?? '' })
}, 'settings.components.settings.GitHubIntegrationCard.testFailed')

const removeToken = (): Promise<void> => run('remove', async () => {
  await store.disconnect()
  return t('settings.components.settings.GitHubIntegrationCard.removed')
}, 'settings.components.settings.GitHubIntegrationCard.removeFailed')

const toggleAgent = (agentId: string): Promise<void> => run('agents', async () => {
  const next = new Set(store.status.agentDefinitionIds)
  if (next.has(agentId)) next.delete(agentId)
  else next.add(agentId)
  await store.setAgentAccess([...next])
  return null
}, 'settings.components.settings.GitHubIntegrationCard.agentsFailed')

onMounted(async () => {
  await Promise.all([
    store.fetchStatus().catch((cause) => {
      message.value = { kind: 'error', text: errorText(cause, 'settings.components.settings.GitHubIntegrationCard.loadFailed') }
    }),
    agentStore.fetchAllAgentDefinitions(),
  ])
})
</script>
