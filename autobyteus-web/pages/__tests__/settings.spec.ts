import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SettingsPage from '../settings.vue'

const translationMap: Record<string, string> = {
  'settings.page.backAriaLabel': 'Back to workspace',
  'settings.page.backLabel': 'Back to Workspace',
  'settings.page.navigationAriaLabel': 'Settings navigation',
  'settings.page.openMenuLabel': 'Open Settings menu',
  'settings.page.closeMenuLabel': 'Close Settings menu',
  'settings.page.empty.title': 'Settings',
  'settings.page.empty.description': 'Select a category to configure settings.',
  'settings.page.sections.apiKeys': 'API Keys',
  'settings.page.sections.tokenUsage': 'Token Statistics',
  'settings.page.sections.messaging': 'Messaging',
  'settings.page.sections.display': 'Display',
  'settings.page.sections.language': 'Language',
  'settings.page.sections.localTools': 'Local Tools',
  'settings.page.sections.mcpServers': 'MCP Servers',
  'settings.page.sections.applicationPackages': 'Application Packages',
  'settings.page.sections.agentPackages': 'Agent Packages',
  'settings.page.sections.serverSettings': 'Server Settings',
  'settings.page.sections.extensions': 'Extensions',
  'settings.page.sections.updates': 'Updates',
  'settings.page.serverSettings.quick': 'Basics',
  'settings.page.serverSettings.advanced': 'Advanced',
  'settings.page.serverSettings.migrations': 'Migrations',
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

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => translationMap[key] ?? key,
  }),
}))

const mountSettings = (attachTo?: HTMLElement) =>
  mount(SettingsPage, {
    ...(attachTo ? { attachTo } : {}),
    global: {
      stubs: {
        ProviderAPIKeyManager: { template: '<div data-testid="section-api-keys" />' },
        TokenUsageStatistics: { template: '<div data-testid="section-token-usage" />' },
        ConversationHistoryManager: { template: '<div data-testid="section-conversation-logs" />' },
        MessagingSetupManager: { template: '<div data-testid="section-messaging" />' },
        DisplaySettingsManager: { template: '<div data-testid="section-display" />' },
        LanguageSettingsManager: { template: '<div data-testid="section-language" />' },
        AboutSettingsManager: { template: '<div data-testid="section-updates" />' },
        ApplicationPackagesManager: { template: '<div data-testid="section-application-packages" />' },
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
    expect(wrapper.text()).not.toContain('Nodes')
    expect(wrapper.text()).toContain('Messaging')
    expect(wrapper.text()).toContain('Display')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Updates')
    expect(wrapper.text()).toContain('Local Tools')
    expect(wrapper.text()).toContain('MCP Servers')
    expect(wrapper.text()).toContain('Application Packages')
    expect(wrapper.text()).toContain('Agent Packages')
    expect(wrapper.text()).toContain('Server Settings')
    const sidebarText = wrapper.text()
    expect(sidebarText.indexOf('Server Settings')).toBeLessThan(sidebarText.indexOf('Updates'))
    expect(wrapper.get('[data-testid="settings-nav-back"]').attributes('aria-label')).toBe('Back to workspace')
  })

  it('gives navigation and content usable full-width regions at narrow viewports while preserving the desktop row', () => {
    const wrapper = mountSettings()
    const layout = wrapper.get('[data-testid="settings-page-layout"]')
    const navigation = wrapper.get('[data-testid="settings-page-navigation"]')
    const content = wrapper.get('[data-testid="settings-page-content"]')

    expect(layout.classes()).toEqual(expect.arrayContaining(['flex-col', 'min-w-0', 'md:flex-row']))
    expect(navigation.classes()).toEqual(expect.arrayContaining([
      'w-full',
      'max-h-[38dvh]',
      'overflow-y-auto',
      'md:max-h-none',
      'md:w-64',
    ]))
    expect(content.classes()).toEqual(expect.arrayContaining(['min-h-0', 'min-w-0', 'flex-1']))
    expect(navigation.classes()).not.toContain('md:hidden')
    expect(wrapper.get('[data-testid="settings-navigation-collapse"]').classes()).toContain('hidden')
    expect(wrapper.get('[data-testid="settings-navigation-collapse"]').classes()).toContain('md:inline-flex')
  })

  it('collapses direct Token Statistics routes without stealing focus', async () => {
    const outsideButton = document.createElement('button')
    document.body.append(outsideButton)
    outsideButton.focus()
    routeMock.query = { section: 'token-usage' }

    const wrapper = mountSettings()
    await flushPromises()

    expect(wrapper.get('[data-testid="section-token-usage"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="settings-page-navigation"]').classes()).toContain('md:hidden')
    expect(wrapper.get('[data-testid="settings-collapsed-header"]').classes()).toEqual(
      expect.arrayContaining(['hidden', 'md:flex']),
    )
    expect(wrapper.get('[data-testid="settings-page-content"]').classes()).toContain('md:pl-4')
    expect(document.activeElement).toBe(outsideButton)

    outsideButton.remove()
  })

  it('moves focus between visible desktop toggles and preserves the active manager instance', async () => {
    routeMock.query = { section: 'token-usage' }
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mountSettings(host)
    await flushPromises()
    const managerElement = wrapper.get('[data-testid="section-token-usage"]').element
    const expandButton = wrapper.get('[data-testid="settings-navigation-expand"]').element as HTMLButtonElement
    const originalGetClientRects = HTMLElement.prototype.getClientRects
    HTMLElement.prototype.getClientRects = () => [{ width: 18, height: 18 }] as unknown as DOMRectList

    try {
      await wrapper.get('[data-testid="settings-navigation-expand"]').trigger('click')
      await flushPromises()

      const collapseButton = wrapper.get('[data-testid="settings-navigation-collapse"]').element as HTMLButtonElement
      expect(document.activeElement).toBe(collapseButton)
      expect(wrapper.get('[data-testid="section-token-usage"]').element).toBe(managerElement)

      await wrapper.get('[data-testid="settings-navigation-collapse"]').trigger('click')
      await flushPromises()
      const nextExpandButton = wrapper.get('[data-testid="settings-navigation-expand"]').element as HTMLButtonElement

      expect(document.activeElement).toBe(nextExpandButton)
      expect(wrapper.get('[data-testid="section-token-usage"]').element).toBe(managerElement)
    } finally {
      HTMLElement.prototype.getClientRects = originalGetClientRects
      wrapper.unmount()
      host.remove()
    }
  })

  it('keeps focus on Token Statistics navigation when the desktop header is CSS-hidden', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mountSettings(host)
    const tokenButton = wrapper.get('[data-testid="settings-nav-token-usage"]')
    const buttonElement = tokenButton.element as HTMLButtonElement
    buttonElement.focus()

    const originalGetClientRects = HTMLElement.prototype.getClientRects
    HTMLElement.prototype.getClientRects = function getClientRects() {
      return this.closest('[data-testid="settings-collapsed-header"]')
        ? [] as unknown as DOMRectList
        : [{ width: 18, height: 18 }] as unknown as DOMRectList
    }

    try {
      await tokenButton.trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(buttonElement)
    } finally {
      HTMLElement.prototype.getClientRects = originalGetClientRects
      wrapper.unmount()
      host.remove()
    }
  })

  it('moves desktop selection focus to the Token Statistics collapsed-header toggle', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mountSettings(host)
    const originalGetClientRects = HTMLElement.prototype.getClientRects
    HTMLElement.prototype.getClientRects = () => [{ width: 18, height: 18 }] as unknown as DOMRectList

    try {
      await wrapper.get('[data-testid="settings-nav-token-usage"]').trigger('click')
      await flushPromises()

      const expandButton = wrapper.get('[data-testid="settings-navigation-expand"]').element
      expect(document.activeElement).toBe(expandButton)
      expect(wrapper.get('[data-testid="section-token-usage"]').exists()).toBe(true)
    } finally {
      HTMLElement.prototype.getClientRects = originalGetClientRects
      wrapper.unmount()
      host.remove()
    }
  })

  it('reopens the sidebar when navigating away from reopened Token Statistics', async () => {
    routeMock.query = { section: 'token-usage' }
    const wrapper = mountSettings()
    await flushPromises()

    await wrapper.get('[data-testid="settings-navigation-expand"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="settings-nav-display"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="section-display"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="settings-page-navigation"]').classes()).not.toContain('md:hidden')
    expect(wrapper.find('[data-testid="settings-collapsed-header"]').exists()).toBe(false)
  })


  it('treats legacy nodes section query as invalid and falls back to the default settings section', async () => {
    routeMock.query = { section: 'nodes' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('api-keys')
    expect(wrapper.find('[data-testid="section-nodes"]').exists()).toBe(false)
  })

  it('normalizes legacy server-status route query to server-settings in remote windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false
    routeMock.query = { section: 'server-status' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('server-settings')
    expect(setupState.serverSettingsMode).toBe('advanced')
    expect(setupState.isSettingsNavigationCollapsed).toBe(false)
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


  it('supports server settings migrations mode query', async () => {
    routeMock.query = { section: 'server-settings', mode: 'migrations' }
    const wrapper = mountSettings()
    await nextTick()

    expect(wrapper.get('[data-testid="section-server-settings"]').text()).toContain('mode=migrations')
    expect(wrapper.get('[data-testid="settings-nav-server-settings-migrations"]').attributes('aria-current')).toBe('page')
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

  it('supports application-packages section query and activates application-packages section', async () => {
    routeMock.query = { section: 'application-packages' }
    const wrapper = mountSettings()
    await nextTick()
    const setupState = (wrapper.vm as any).$?.setupState

    expect(setupState.activeSection).toBe('application-packages')
    expect(wrapper.find('[data-testid="section-application-packages"]').exists()).toBe(true)
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
