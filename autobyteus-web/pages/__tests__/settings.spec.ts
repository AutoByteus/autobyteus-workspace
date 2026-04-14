import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SettingsPage from '../settings.vue'

const translationMap: Record<string, string> = {
  'settings.page.backAriaLabel': 'Back to workspace',
  'settings.page.backLabel': 'Back to Workspace',
  'settings.page.empty.title': 'Settings',
  'settings.page.empty.description': 'Select a category to configure settings.',
  'settings.page.sections.apiKeys': 'API Keys',
  'settings.page.sections.tokenUsage': 'Token Usage Statistics',
  'settings.page.sections.nodes': 'Nodes',
  'settings.page.sections.messaging': 'Messaging',
  'settings.page.sections.display': 'Display',
  'settings.page.sections.language': 'Language',
  'settings.page.sections.localTools': 'Local Tools',
  'settings.page.sections.mcpServers': 'MCP Servers',
  'settings.page.sections.agentPackages': 'Agent Packages',
  'settings.page.sections.serverSettings': 'Server Settings',
  'settings.page.sections.extensions': 'Extensions',
  'settings.page.sections.updates': 'Updates',
  'settings.page.serverSettings.quick': 'Basics',
  'settings.page.serverSettings.advanced': 'Advanced',
}

const {
  routeMock,
  routerMock,
  serverStoreMock,
  windowNodeContextStoreMock,
} = vi.hoisted(() => ({
  routeMock: {
    query: {} as Record<string, unknown>,
  },
  routerMock: {
    push: vi.fn().mockResolvedValue(undefined),
  },
  serverStoreMock: {
    status: 'running',
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('~/stores/serverStore', () => ({
  useServerStore: () => serverStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

const mountSettings = () =>
  mount(SettingsPage, {
    global: {
      stubs: {
        ProviderAPIKeyManager: { template: '<div data-testid="section-api-keys" />' },
        TokenUsageStatistics: { template: '<div data-testid="section-token-usage" />' },
        ConversationHistoryManager: { template: '<div data-testid="section-conversation-logs" />' },
        NodeManager: { template: '<div data-testid="section-nodes" />' },
        MessagingSetupManager: { template: '<div data-testid="section-messaging" />' },
        DisplaySettingsManager: { template: '<div data-testid="section-display" />' },
        LanguageSettingsManager: { template: '<div data-testid="section-language" />' },
        AboutSettingsManager: { template: '<div data-testid="section-updates" />' },
        AgentPackagesManager: { template: '<div data-testid="section-agent-packages" />' },
        ExtensionsManager: { template: '<div data-testid="section-extensions" />' },
        ToolsManagementWorkspace: { template: '<div data-testid="section-tools-management" />' },
        ServerSettingsManager: {
          props: ['sectionMode'],
          template: '<div data-testid="section-server-settings">mode={{ sectionMode }}</div>',
        },
      },
      mocks: {
        $t: (key: string) => translationMap[key] ?? key,
      },
    },
  })

describe('settings page', () => {
  beforeEach(() => {
    routeMock.query = {}
    serverStoreMock.status = 'running'
    windowNodeContextStoreMock.isEmbeddedWindow = true
    vi.clearAllMocks()
  })

  it('shows server settings section in remote windows', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false
    const wrapper = mountSettings()

    expect(wrapper.text()).toContain('API Keys')
    expect(wrapper.text()).toContain('Nodes')
    expect(wrapper.text()).toContain('Messaging')
    expect(wrapper.text()).toContain('Display')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Updates')
    expect(wrapper.text()).toContain('Local Tools')
    expect(wrapper.text()).toContain('MCP Servers')
    expect(wrapper.text()).toContain('Agent Packages')
    expect(wrapper.text()).toContain('Server Settings')
    const sidebarText = wrapper.text()
    expect(sidebarText.indexOf('Server Settings')).toBeLessThan(sidebarText.indexOf('Updates'))
    expect(wrapper.get('[data-testid="settings-nav-back"]').attributes('aria-label')).toBe('Back to workspace')
  })

  it('normalizes legacy server-status route query to server-settings in remote windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false
    routeMock.query = { section: 'server-status' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('server-settings')
  })

  it('defaults to server-settings when embedded server is not running', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true
    serverStoreMock.status = 'starting'
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('server-settings')
  })

  it('renders the server settings manager without a separate top-level applications card shell', async () => {
    routeMock.query = { section: 'server-settings' }
    const wrapper = mountSettings()
    await nextTick()

    expect(wrapper.find('[data-testid="section-server-settings"]').exists()).toBe(true)
  })

  it('normalizes legacy server-status route query to server-settings in embedded windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true
    routeMock.query = { section: 'server-status' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('server-settings')
  })

  it('supports messaging section query and activates messaging section', async () => {
    routeMock.query = { section: 'messaging' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('messaging')
  })

  it('supports language section query and activates language section', async () => {
    routeMock.query = { section: 'language' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('language')
    expect(wrapper.find('[data-testid="section-language"]').exists()).toBe(true)
  })

  it('supports display section query and activates the display settings section', async () => {
    routeMock.query = { section: 'display' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('display')
    expect(wrapper.find('[data-testid="section-display"]').exists()).toBe(true)
  })

  it('supports updates section query and activates updates section', async () => {
    routeMock.query = { section: 'updates' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('updates')
  })

  it('maps legacy about section query to updates section', async () => {
    routeMock.query = { section: 'about' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('updates')
  })

  it('supports mcp-servers section query and activates mcp-servers section', async () => {
    routeMock.query = { section: 'mcp-servers' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('mcp-servers')
  })

  it('supports agent-packages section query and activates agent-packages section', async () => {
    routeMock.query = { section: 'agent-packages' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('agent-packages')
  })

  it('supports extensions section query and activates extensions section', async () => {
    routeMock.query = { section: 'extensions' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('extensions')
    expect(wrapper.find('[data-testid="section-extensions"]').exists()).toBe(true)
  })

  it('navigates back to workspace when back item is clicked', async () => {
    const wrapper = mountSettings()
    await wrapper.get('[data-testid="settings-nav-back"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/workspace')
  })
})
