<template>
  <div :data-testid="`integration-detail-${item.id}`">
  <ol>
    <!-- 1. Imported -->
    <li class="relative flex gap-4 pb-6" :data-testid="`integration-step-import-${item.id}`">
      <span class="absolute bottom-1 left-3.5 top-9 w-px bg-slate-200" aria-hidden="true" />
      <StepMarker :number="1" state="done" />
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-semibold leading-7 text-gray-900">{{ t('integrations.install.titleDone') }}</h4>
        <p class="text-sm text-gray-600">
          <template v-for="(part, index) in withSkillName(t('integrations.install.textDone', { skill: item.skillName }), item.skillName)" :key="index">
            <code v-if="part.skill" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
        <p class="mt-0.5 text-xs text-gray-500" :data-testid="`integration-source-${item.id}`">{{ t('integrations.install.from', { repository: item.source.label }) }}</p>
      </div>
    </li>

    <!-- 2. Connect -->
    <li class="relative flex gap-4 pb-6" :data-testid="`integration-step-connect-${item.id}`">
      <span class="absolute bottom-1 left-3.5 top-9 w-px bg-slate-200" aria-hidden="true" />
      <StepMarker :number="2" :state="connected ? 'done' : 'active'" />
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-semibold leading-7 text-gray-900">
          {{ connected
            ? t('integrations.connect.titleConnected', { name: item.name })
            : t('integrations.connect.title', { name: item.name }) }}
        </h4>

          <p v-if="connected" class="text-sm text-gray-600">
            {{ t('integrations.connect.connectedText') }}
            <span v-if="connectedSince" :data-testid="`integration-connected-at-${item.id}`">{{ t('integrations.connect.connectedSince', { date: connectedSince }) }}</span>
          </p>
          <p v-else-if="item.tokenHelp" class="text-sm text-gray-600" :data-testid="`integration-help-${item.id}`">
            <!-- Repository text: text nodes and https links only, never HTML; a link opens outside the app. -->
            <template v-for="(part, index) in helpParts" :key="index">
              <a
                v-if="part.href"
                :href="part.href"
                target="_blank"
                rel="noopener noreferrer"
                class="break-words text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                @click.prevent="openExternalLink(part.href)"
              >{{ part.text }}</a>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>

          <div v-if="showTokenField" class="mt-3">
            <label class="block text-sm font-medium text-gray-900" :for="`integration-token-${item.id}`">
              {{ connected ? t('integrations.connect.replaceTokenLabel', { name: item.name }) : t('integrations.connect.tokenLabel', { name: item.name }) }}
            </label>
            <div class="mt-1.5 flex gap-2">
              <input
                :id="`integration-token-${item.id}`"
                v-model="tokenDraft"
                type="password"
                autocomplete="off"
                spellcheck="false"
                class="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                :placeholder="t('integrations.connect.tokenPlaceholder', { name: item.name })"
                :disabled="busy !== undefined"
                :data-testid="`integration-token-input-${item.id}`"
                @keydown.enter.prevent="runConnect"
              >
              <button
                type="button"
                class="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                :disabled="!tokenDraft.trim() || busy !== undefined"
                :data-testid="`integration-connect-${item.id}`"
                @click="runConnect"
              >
                <span v-if="busy === 'connect'" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white" aria-hidden="true" />
                {{ busy === 'connect' ? t('integrations.connect.checking') : t('integrations.connect.connect') }}
              </button>
              <button
                v-if="connected"
                type="button"
                class="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="busy !== undefined"
                @click="cancelReplace"
              >
                {{ t('integrations.connect.cancel') }}
              </button>
            </div>
            <p class="mt-1.5 text-xs text-gray-500">{{ t('integrations.connect.hint', { name: item.name }) }}</p>
          </div>

          <div v-if="connected && !showTokenField" class="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy !== undefined"
              :data-testid="`integration-test-${item.id}`"
              @click="runTest"
            >
              {{ busy === 'test' ? t('integrations.connect.testing') : t('integrations.connect.test') }}
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy !== undefined"
              :data-testid="`integration-replace-${item.id}`"
              @click="replacing = true"
            >
              {{ t('integrations.connect.replace') }}
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy !== undefined"
              :data-testid="`integration-remove-${item.id}`"
              @click="runRemove"
            >
              {{ busy === 'remove' ? t('integrations.connect.removing') : t('integrations.connect.remove') }}
            </button>
          </div>
        <p
          v-if="message"
          class="mt-3 text-sm"
          :class="message.kind === 'error' ? 'text-red-600' : 'text-green-700'"
          role="status"
          :data-testid="`integration-message-${item.id}`"
        >
          {{ message.text }}
        </p>
      </div>
    </li>

    <!-- 3. Give agents access -->
    <li class="relative flex gap-4" :data-testid="`integration-step-access-${item.id}`">
      <StepMarker :number="3" :state="connected ? 'active' : 'upcoming'" />
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-semibold leading-7" :class="connected ? 'text-gray-900' : 'text-gray-400'">{{ t('integrations.access.title') }}</h4>
        <p class="text-sm" :class="connected ? 'text-gray-600' : 'text-gray-400'">
          <template v-for="(part, index) in withSkillName(t('integrations.access.text', { skill: item.skillName }), item.skillName)" :key="index">
            <code v-if="part.skill" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs" :class="connected ? 'text-slate-800' : 'text-slate-500'">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
        <NuxtLink
          v-if="connected"
          :to="{ path: '/agents', query: { view: 'list' } }"
          class="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :data-testid="`integration-open-agents-${item.id}`"
        >
          {{ t('integrations.access.openAgents') }}
          <Icon icon="heroicons:arrow-right" class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </div>
    </li>
  </ol>

  <IntegrationToolsRow
    :item="item"
    :busy="busy !== undefined"
    :checking="busy === 'tools'"
    @recheck="runRecheck"
  />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { IntegrationError, useIntegrationsStore, type IntegrationView } from '~/stores/integrationsStore'
import IntegrationToolsRow from '~/components/integrations/IntegrationToolsRow.vue'
import StepMarker from '~/components/integrations/IntegrationStepMarker.vue'
import { openExternalLink } from '~/utils/externalLink'
import { helpTextParts, withSkillName } from '~/utils/integrations/integrationText'

const props = defineProps<{ item: IntegrationView }>()

const store = useIntegrationsStore()
const { t, resolvedLocale } = useLocalization()

const tokenDraft = ref('')
const replacing = ref(false)

const connected = computed(() => props.item.state === 'CONNECTED')
const busy = computed(() => store.busy[props.item.id])
const message = computed(() => store.messages[props.item.id])
const showTokenField = computed(() => !connected.value || replacing.value)
const connectedSince = computed(() => (props.item.connectedAt ? new Date(props.item.connectedAt).toLocaleDateString(resolvedLocale.value) : ''))
const helpParts = computed(() => helpTextParts(props.item.tokenHelp ?? ''))

const say = (kind: 'success' | 'error', text: string) => store.setMessage(props.item.id, { kind, text })

const ERROR_KEYS: Readonly<Record<string, string>> = {
  TOKEN_REJECTED: 'integrations.connect.errorTokenRejected',
  TOKEN_CHECK_FAILED: 'integrations.connect.errorTokenCheckFailed',
  TOKEN_REQUIRED: 'integrations.connect.errorTokenRequired',
  VAULT_UNAVAILABLE: 'integrations.connect.errorVaultUnavailable',
  INTEGRATION_NOT_CONNECTED: 'integrations.connect.errorNotConnected',
}

/** The message for a coded server error, else the action's own failure message. Never shows the token. */
const errorText = (cause: unknown, fallbackKey: string): string => {
  const code = cause instanceof IntegrationError ? cause.code : ''
  return t(ERROR_KEYS[code] ?? fallbackKey, { name: props.item.name, skill: props.item.skillName })
}

const runConnect = async () => {
  const token = tokenDraft.value.trim()
  if (!token) return
  try {
    if (await store.connect(props.item.id, token) !== null) {
      tokenDraft.value = ''
      replacing.value = false
    }
  } catch (cause) {
    say('error', errorText(cause, 'integrations.connect.saveFailed'))
  }
}

const runTest = async () => {
  try {
    const login = await store.test(props.item.id)
    if (login !== null) say('success', t('integrations.connect.testPassed', { login }))
  } catch (cause) {
    const rejected = cause instanceof IntegrationError && cause.code === 'TOKEN_REJECTED'
    say('error', rejected
      ? t('integrations.connect.errorStoredTokenRejected', { name: props.item.name })
      : errorText(cause, 'integrations.connect.testFailed'))
  }
}

const runRemove = async () => {
  try {
    await store.remove(props.item.id)
    replacing.value = false
    say('success', t('integrations.connect.removed', { name: props.item.name }))
  } catch (cause) {
    say('error', errorText(cause, 'integrations.connect.removeFailed'))
  }
}

const runRecheck = async () => {
  await store.checkTools(props.item.id)
}

const cancelReplace = () => {
  replacing.value = false
  tokenDraft.value = ''
}
</script>
