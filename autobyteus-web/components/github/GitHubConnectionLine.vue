<template>
  <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" data-testid="github-connection-line">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Icon icon="mdi:github" class="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
      <span class="min-w-0 flex-1" data-testid="github-connection-status">
        <template v-if="store.connected">{{ t('github.connection.connectedAs', { login: store.login ?? '' }) }}</template>
        <template v-else>{{ t('github.connection.notConnected') }}</template>
      </span>
      <template v-if="!showForm">
        <button
          v-if="!store.connected"
          type="button"
          :class="BUTTON"
          :disabled="store.busy !== null"
          data-testid="github-connection-connect"
          @click="openForm"
        >
          {{ t('github.connection.connect') }}
        </button>
        <template v-else>
          <button type="button" :class="BUTTON" :disabled="store.busy !== null" data-testid="github-connection-replace" @click="openForm">
            {{ t('github.connection.replace') }}
          </button>
          <button type="button" :class="BUTTON" :disabled="store.busy !== null" data-testid="github-connection-disconnect" @click="runDisconnect">
            {{ store.busy === 'disconnect' ? t('github.connection.disconnecting') : t('github.connection.disconnect') }}
          </button>
        </template>
      </template>
    </div>

    <p v-if="store.connected && !showForm" class="mt-1 pl-7 text-slate-500" data-testid="github-connection-usage">
      {{ t('github.connection.usage') }}
    </p>

    <form v-if="showForm" class="mt-2 pl-7" @submit.prevent="runConnect">
      <label class="sr-only" for="github-connection-token">{{ t('github.connection.tokenLabel') }}</label>
      <div class="flex gap-2">
        <input
          id="github-connection-token"
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          :placeholder="t('github.connection.tokenPlaceholder')"
          :disabled="store.busy !== null"
          data-testid="github-connection-token-input"
        >
        <button
          type="submit"
          :class="PRIMARY_BUTTON"
          :disabled="!tokenDraft.trim() || store.busy !== null"
          data-testid="github-connection-save"
        >
          {{ store.busy === 'connect' ? t('github.connection.checking') : t('github.connection.save') }}
        </button>
        <button type="button" :class="BUTTON" :disabled="store.busy !== null" data-testid="github-connection-cancel" @click="closeForm">
          {{ t('github.connection.cancel') }}
        </button>
      </div>
      <p class="mt-1.5 leading-5 text-slate-500" data-testid="github-connection-help">
        <a
          :href="CREATE_TOKEN_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          @click.prevent="openExternalLink(CREATE_TOKEN_URL)"
        >{{ t('github.connection.createToken') }}</a>
        {{ t('github.connection.tokenHelp') }}
      </p>
    </form>

    <p v-if="store.error" role="alert" class="mt-1.5 pl-7 text-red-700" data-testid="github-connection-error">{{ store.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useGitHubConnectionStore } from '~/stores/githubConnectionStore'
import { openExternalLink } from '~/utils/externalLink'

const BUTTON = 'inline-flex h-7 shrink-0 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60'
const PRIMARY_BUTTON = 'inline-flex h-8 shrink-0 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'

/** GitHub's page for a new fine-grained personal access token. */
const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

const { t } = useLocalization()
const store = useGitHubConnectionStore()

const tokenDraft = ref('')
const showForm = ref(false)

onMounted(() => {
  void store.load()
})

const openForm = () => {
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  tokenDraft.value = ''
}

const runConnect = async () => {
  const token = tokenDraft.value.trim()
  if (!token) return
  if (await store.connect(token)) closeForm()
}

const runDisconnect = async () => {
  await store.disconnect()
}
</script>
