import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import MemorySyncCard from '../MemorySyncCard.vue';

const { storeSlot, translationCatalog } = vi.hoisted(() => ({
  storeSlot: { store: null as any },
  translationCatalog: {
  targetNodeTitle: 'Memory Sync target node',
  targetNodeDescription: 'Target node description',
  hubTitle: 'Memory Hub',
  hubDescriptionPrefix: 'Receive imported memory under',
  enableHub: 'Enable hub',
  advertisedHubBaseUrl: 'Advertised hub base URL',
  refreshUrlCandidates: 'Refresh URL candidates',
  ingestionEndpoint: 'Ingestion endpoint',
  saveHubSettings: 'Save hub settings',
  generateToken: 'Generate token',
  defaultCredentialLabel: 'Memory Sync source token',
  sourceCredentials: 'Source credentials',
  noCredentialsYet: 'No credentials yet.',
  importedSources: 'Imported sources',
  noImportedMemoryYet: 'No imported memory yet.',
  files: 'files',
  sourceTitle: 'Memory Sync Source',
  sourceDescriptionPrefix: 'Push this node local',
  sourceDescriptionAnd: 'and',
  sourceDescriptionSuffix: 'memory to a hub.',
  enableSource: 'Enable source',
  sourceNodeId: 'Source node id',
  displayName: 'Display name',
  hubBaseUrl: 'Hub base URL',
  hubToken: 'Hub token',
  pasteToken: 'Paste token',
  backgroundSync: 'Background sync',
  intervalMs: 'Interval ms',
  saveSourceSettings: 'Save source settings',
  testConnection: 'Test connection',
  testing: 'Testing…',
  syncNow: 'Sync now',
  syncing: 'Syncing…',
  currentJob: 'Current job',
  idle: 'idle',
  syncingJob: 'syncing…',
  lastSync: 'Last sync',
  success: 'success',
  error: 'error',
  notSyncedYet: 'not synced yet',
  testingSavedSettings: 'Testing saved settings…',
  testingDraftToken: 'Testing draft token…',
  connectionTestSucceeded: 'Connection test succeeded',
  connectionTestFailed: 'Connection test failed',
  savedSettingsMode: 'saved settings',
  draftTokenMode: 'draft token',
  hubEnabled: 'Hub enabled',
  authenticated: 'Authenticated',
  yes: 'yes',
  no: 'no',
  unknown: 'unknown',
  } as Record<string, string>,
}));

vi.mock('~/stores/memorySyncStore', () => ({
  useMemorySyncStore: () => storeSlot.store,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      return translationCatalog[key.split('.').pop() || key] ?? key;
    },
  }),
}));

const createStatus = () => ({
  hub: { enabled: true, advertisedHubBaseUrl: 'http://hub.local', updatedAt: null },
  source: {
    enabled: true,
    sourceNodeId: 'saved-source',
    displayName: 'Saved Source',
    hubBaseUrl: 'http://saved-hub.local',
    hubTokenConfigured: true,
    hubTokenPreview: '••••••••',
    backgroundEnabled: true,
    intervalMs: 60000,
    batchSize: 25,
    updatedAt: null,
  },
  connectionInfo: {
    hubEnabled: true,
    advertisedHubBaseUrl: 'http://hub.local',
    ingestEndpointUrl: null,
    healthEndpointUrl: null,
    secureTransportWarning: null,
    credentials: [],
  },
  sourceState: {
    jobState: 'success',
    lastSuccessfulSyncAt: '2026-06-24T06:00:16.000Z',
    lastError: null,
    trackedFileCount: 3,
  },
  imports: [],
  oneTimePlaintextToken: null,
});

const createStore = () => reactive({
  status: createStatus(),
  candidates: [],
  loading: false,
  saving: false,
  syncing: false,
  testingConnection: false,
  error: null,
  oneTimeToken: null,
  connectionTestResult: null,
  loadStatus: vi.fn(async () => undefined),
  loadCandidates: vi.fn(async () => undefined),
  updateHubConfig: vi.fn(async () => undefined),
  updateSourceConfig: vi.fn(async () => undefined),
  testConnection: vi.fn(async () => undefined),
  syncNow: vi.fn(async () => undefined),
  createCredential: vi.fn(async () => undefined),
  regenerateCredential: vi.fn(async () => undefined),
  revokeCredential: vi.fn(async () => undefined),
  refreshStatusOnly: vi.fn(async () => undefined),
});

const flushMounted = async () => {
  await Promise.resolve();
  await nextTick();
};

const mountCard = async () => {
  const wrapper = mount(MemorySyncCard, {
    props: { nodeName: 'Remote Node', nodeTypeLabel: 'remote', baseUrl: 'http://node.local' },
    global: {
      stubs: {
        NuxtLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
  await flushMounted();
  return wrapper;
};

describe('MemorySyncCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storeSlot.store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('preserves edited Source form values and pasted tokens when status refresh changes store status', async () => {
    const wrapper = await mountCard();

    await wrapper.get('[data-testid="memory-sync-hub-base-url"]').setValue('http://draft-hub.local');
    await wrapper.get('[data-testid="memory-sync-source-node-id"]').setValue('draft-source');
    await wrapper.get('[data-testid="memory-sync-display-name"]').setValue('Draft Source');
    await wrapper.get('[data-testid="memory-sync-hub-token"]').setValue('draft-token');

    storeSlot.store.status.source.hubBaseUrl = 'http://poll-hub.local';
    storeSlot.store.status.source.sourceNodeId = 'poll-source';
    storeSlot.store.status.source.displayName = 'Poll Source';
    storeSlot.store.status.sourceState = {
      jobState: 'running',
      lastSuccessfulSyncAt: '2026-06-24T06:00:16.000Z',
      lastError: null,
      trackedFileCount: 4,
    };
    await nextTick();

    expect((wrapper.get('[data-testid="memory-sync-hub-base-url"]').element as HTMLInputElement).value).toBe('http://draft-hub.local');
    expect((wrapper.get('[data-testid="memory-sync-source-node-id"]').element as HTMLInputElement).value).toBe('draft-source');
    expect((wrapper.get('[data-testid="memory-sync-display-name"]').element as HTMLInputElement).value).toBe('Draft Source');
    expect((wrapper.get('[data-testid="memory-sync-hub-token"]').element as HTMLInputElement).value).toBe('draft-token');
    expect(wrapper.get('[data-testid="memory-sync-current-job"]').text()).toContain('syncing…');
  });

  it('uses saved connection-test mode when the token field is blank even if draft identity fields changed', async () => {
    const wrapper = await mountCard();

    await wrapper.get('[data-testid="memory-sync-hub-base-url"]').setValue('http://draft-hub.local');
    await wrapper.get('[data-testid="memory-sync-source-node-id"]').setValue('draft-source');
    await wrapper.get('[data-testid="memory-sync-hub-token"]').setValue('');
    await wrapper.get('[data-testid="memory-sync-test-connection"]').trigger('click');

    expect(storeSlot.store.testConnection).toHaveBeenCalledWith({ mode: 'saved' });
  });

  it('uses draft connection-test mode when a draft token is present', async () => {
    const wrapper = await mountCard();

    await wrapper.get('[data-testid="memory-sync-hub-base-url"]').setValue('http://draft-hub.local');
    await wrapper.get('[data-testid="memory-sync-source-node-id"]').setValue('draft-source');
    await wrapper.get('[data-testid="memory-sync-hub-token"]').setValue('draft-token');
    await wrapper.get('[data-testid="memory-sync-test-connection"]').trigger('click');

    expect(storeSlot.store.testConnection).toHaveBeenCalledWith({
      mode: 'draft',
      hubBaseUrl: 'http://draft-hub.local',
      sourceNodeId: 'draft-source',
      token: 'draft-token',
    });
  });

  it('shows latest sync error before stale success without legacy success metrics or global info', async () => {
    const wrapper = await mountCard();

    storeSlot.store.lastSyncResult = { changedFiles: 7, unchangedFiles: 2 };
    storeSlot.store.info = 'Legacy global test feedback';
    storeSlot.store.status.sourceState = {
      jobState: 'error',
      lastSuccessfulSyncAt: '2026-06-24T06:00:16.000Z',
      lastError: '401 Unauthorized',
      trackedFileCount: 4,
    };
    storeSlot.store.syncing = true;
    await nextTick();

    expect(wrapper.get('[data-testid="memory-sync-last-sync"]').text()).toContain('error · 401 Unauthorized');
    expect(wrapper.get('[data-testid="memory-sync-last-sync"]').text()).not.toContain('success');
    expect(wrapper.text()).not.toContain('Last run');
    expect(wrapper.text()).not.toContain('7 changed');
    expect(wrapper.text()).not.toContain('Legacy global test feedback');
    expect(wrapper.get('[data-testid="memory-sync-sync-now"]').text()).toContain('Syncing…');
    expect(wrapper.get('[data-testid="memory-sync-sync-now"]').attributes('disabled')).toBeDefined();
  });
});
