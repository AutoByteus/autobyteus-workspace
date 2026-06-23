<template>
  <div class="space-y-5">
    <section class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.MemorySyncCard.targetNodeTitle') }}</h3>
      <p class="mt-2 text-sm text-slate-700">
        {{ nodeName }}
        <span class="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{{ nodeTypeLabel }}</span>
      </p>
      <p v-if="baseUrl" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">{{ baseUrl }}</p>
      <p class="mt-2 text-xs text-slate-500">{{ t('settings.components.settings.MemorySyncCard.targetNodeDescription') }}</p>
    </section>

    <p v-if="store.error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ store.error }}</p>
    <p v-if="store.info" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{{ store.info }}</p>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('settings.components.settings.MemorySyncCard.hubTitle') }}</h3>
          <p class="text-sm text-slate-500">{{ t('settings.components.settings.MemorySyncCard.hubDescriptionPrefix') }} <code>memory/imports/&lt;sourceNodeId&gt;</code>.</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input v-model="hubForm.enabled" type="checkbox" class="rounded border-slate-300" />
          {{ t('settings.components.settings.MemorySyncCard.enableHub') }}
        </label>
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('settings.components.settings.MemorySyncCard.advertisedHubBaseUrl') }}</label>
          <input v-model="hubForm.advertisedHubBaseUrl" type="text" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="http://host.docker.internal:29695" />
        </div>
        <button class="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="loadCandidates">{{ t('settings.components.settings.MemorySyncCard.refreshUrlCandidates') }}</button>
      </div>

      <div v-if="store.candidates.length" class="mt-3 flex flex-wrap gap-2">
        <button v-for="candidate in store.candidates" :key="candidate.id" class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50" @click="hubForm.advertisedHubBaseUrl = candidate.baseUrl">
          {{ candidate.label }} · {{ candidate.baseUrl }}
        </button>
      </div>

      <p v-if="store.status.connectionInfo.secureTransportWarning" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{{ store.status.connectionInfo.secureTransportWarning }}</p>
      <p v-if="store.status.connectionInfo.ingestEndpointUrl" class="mt-3 font-mono text-xs text-slate-500">{{ t('settings.components.settings.MemorySyncCard.ingestionEndpoint') }}: {{ store.status.connectionInfo.ingestEndpointUrl }}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" :disabled="store.saving" @click="saveHub">{{ t('settings.components.settings.MemorySyncCard.saveHubSettings') }}</button>
        <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" :disabled="store.saving" @click="store.createCredential(t('settings.components.settings.MemorySyncCard.defaultCredentialLabel'))">{{ t('settings.components.settings.MemorySyncCard.generateToken') }}</button>
      </div>

      <div v-if="store.oneTimeToken" class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
        <p class="text-sm font-semibold text-green-800">{{ t('settings.components.settings.MemorySyncCard.copyTokenNow') }}</p>
        <code class="mt-2 block break-all rounded bg-white px-3 py-2 text-xs text-green-900">{{ store.oneTimeToken }}</code>
      </div>

      <div class="mt-5">
        <h4 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.MemorySyncCard.sourceCredentials') }}</h4>
        <div v-if="store.status.connectionInfo.credentials.length === 0" class="mt-2 text-sm text-slate-500">{{ t('settings.components.settings.MemorySyncCard.noCredentialsYet') }}</div>
        <div v-else class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
          <div v-for="credential in store.status.connectionInfo.credentials" :key="credential.credentialId" class="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
            <div class="text-sm">
              <p class="font-mono text-xs text-slate-600">{{ credential.credentialId }}</p>
              <p class="text-slate-500">{{ credential.label || t('settings.components.settings.MemorySyncCard.sourceTokenFallback') }} · {{ credential.status }}<span v-if="credential.boundSourceNodeId"> · {{ credential.boundSourceNodeId }}</span></p>
            </div>
            <div class="flex gap-2">
              <button class="rounded border border-slate-300 px-2 py-1 text-xs" @click="store.regenerateCredential(credential.credentialId)">{{ t('settings.components.settings.MemorySyncCard.regenerate') }}</button>
              <button class="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700" @click="store.revokeCredential(credential.credentialId)">{{ t('settings.components.settings.MemorySyncCard.revoke') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5">
        <h4 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.MemorySyncCard.importedSources') }}</h4>
        <div v-if="store.status.imports.length === 0" class="mt-2 text-sm text-slate-500">{{ t('settings.components.settings.MemorySyncCard.noImportedMemoryYet') }}</div>
        <div v-else class="mt-2 grid gap-2 md:grid-cols-2">
          <NuxtLink v-for="item in store.status.imports" :key="item.sourceNodeId" class="rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50" :to="`/memory?source=imported:${encodeURIComponent(item.sourceNodeId)}`">
            <p class="font-semibold text-slate-900">{{ item.displayName || item.sourceNodeId }}</p>
            <p class="font-mono text-xs text-slate-500">{{ item.sourceNodeId }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ item.fileCount }} {{ t('settings.components.settings.MemorySyncCard.files') }} · {{ formatBytes(item.totalBytes) }}<span v-if="item.lastImportedAt"> · {{ formatTimestamp(item.lastImportedAt) }}</span></p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('settings.components.settings.MemorySyncCard.sourceTitle') }}</h3>
          <p class="text-sm text-slate-500">{{ t('settings.components.settings.MemorySyncCard.sourceDescriptionPrefix') }} <code>agents</code> {{ t('settings.components.settings.MemorySyncCard.sourceDescriptionAnd') }} <code>agent_teams</code> {{ t('settings.components.settings.MemorySyncCard.sourceDescriptionSuffix') }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input v-model="sourceForm.enabled" type="checkbox" class="rounded border-slate-300" />
          {{ t('settings.components.settings.MemorySyncCard.enableSource') }}
        </label>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <label class="text-sm font-medium text-slate-700">{{ t('settings.components.settings.MemorySyncCard.sourceNodeId') }}
          <input v-model="sourceForm.sourceNodeId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="docker-node-1" />
        </label>
        <label class="text-sm font-medium text-slate-700">{{ t('settings.components.settings.MemorySyncCard.displayName') }}
          <input v-model="sourceForm.displayName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label class="text-sm font-medium text-slate-700">{{ t('settings.components.settings.MemorySyncCard.hubBaseUrl') }}
          <input v-model="sourceForm.hubBaseUrl" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
        </label>
        <label class="text-sm font-medium text-slate-700">{{ t('settings.components.settings.MemorySyncCard.hubToken') }}
          <input v-model="sourceForm.hubToken" type="password" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" :placeholder="store.status.source.hubTokenPreview || t('settings.components.settings.MemorySyncCard.pasteToken')" />
        </label>
        <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input v-model="sourceForm.backgroundEnabled" type="checkbox" /> {{ t('settings.components.settings.MemorySyncCard.backgroundSync') }}
        </label>
        <label class="text-sm font-medium text-slate-700">{{ t('settings.components.settings.MemorySyncCard.intervalMs') }}
          <input v-model.number="sourceForm.intervalMs" type="number" min="5000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" :disabled="store.saving" @click="saveSource">{{ t('settings.components.settings.MemorySyncCard.saveSourceSettings') }}</button>
        <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="testConnection">{{ t('settings.components.settings.MemorySyncCard.testConnection') }}</button>
        <button class="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50" :disabled="store.syncing" @click="store.syncNow">{{ store.syncing ? t('settings.components.settings.MemorySyncCard.syncing') : t('settings.components.settings.MemorySyncCard.syncNow') }}</button>
      </div>

      <div class="mt-4 text-sm text-slate-600">
        <p>{{ t('settings.components.settings.MemorySyncCard.jobState') }}: {{ store.status.sourceState?.jobState || t('settings.components.settings.MemorySyncCard.idle') }}</p>
        <p v-if="store.status.sourceState?.lastSuccessfulSyncAt">{{ t('settings.components.settings.MemorySyncCard.lastSuccess') }}: {{ formatTimestamp(store.status.sourceState.lastSuccessfulSyncAt) }}</p>
        <p v-if="store.status.sourceState?.lastError" class="text-red-600">{{ t('settings.components.settings.MemorySyncCard.lastError') }}: {{ store.status.sourceState.lastError }}</p>
        <p v-if="store.lastSyncResult" class="text-green-700">{{ t('settings.components.settings.MemorySyncCard.lastRun', { changed: store.lastSyncResult.changedFiles, unchanged: store.lastSyncResult.unchangedFiles }) }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useMemorySyncStore } from '~/stores/memorySyncStore';

const props = defineProps<{
  nodeName: string;
  nodeTypeLabel: string;
  baseUrl?: string;
}>();

const store = useMemorySyncStore();
const { t } = useLocalization();
const hubForm = reactive({ enabled: false, advertisedHubBaseUrl: '' });
const sourceForm = reactive({
  enabled: false,
  sourceNodeId: '',
  displayName: '',
  hubBaseUrl: '',
  hubToken: '',
  backgroundEnabled: false,
  intervalMs: 60000,
  batchSize: 25,
});

watch(() => store.status, syncForms, { deep: true });

onMounted(async () => {
  await store.loadStatus();
  await loadCandidates();
  syncForms();
});

function syncForms() {
  hubForm.enabled = store.status.hub.enabled;
  hubForm.advertisedHubBaseUrl = store.status.hub.advertisedHubBaseUrl || props.baseUrl || '';
  sourceForm.enabled = store.status.source.enabled;
  sourceForm.sourceNodeId = store.status.source.sourceNodeId || '';
  sourceForm.displayName = store.status.source.displayName || props.nodeName || '';
  sourceForm.hubBaseUrl = store.status.source.hubBaseUrl || '';
  sourceForm.hubToken = '';
  sourceForm.backgroundEnabled = store.status.source.backgroundEnabled;
  sourceForm.intervalMs = store.status.source.intervalMs || 60000;
  sourceForm.batchSize = store.status.source.batchSize || 25;
}

async function loadCandidates() {
  await store.loadCandidates(props.baseUrl, hubForm.advertisedHubBaseUrl);
}

async function saveHub() {
  await store.updateHubConfig({ enabled: hubForm.enabled, advertisedHubBaseUrl: hubForm.advertisedHubBaseUrl });
}

async function saveSource() {
  await store.updateSourceConfig({
    ...sourceForm,
    hubToken: sourceForm.hubToken || undefined,
  });
}

async function testConnection() {
  await store.testConnection({
    hubBaseUrl: sourceForm.hubBaseUrl,
    token: sourceForm.hubToken,
    sourceNodeId: sourceForm.sourceNodeId,
  });
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value)) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
</script>
