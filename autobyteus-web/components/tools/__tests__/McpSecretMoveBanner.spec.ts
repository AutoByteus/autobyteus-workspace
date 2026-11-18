/**
 * The "Review and move to vault" banner: the user reviews the candidates (no values), unticks rows, moves the rest,
 * and is told where the backup is and that it holds the plain values. Dummy values only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpSecretMoveBanner from '../McpSecretMoveBanner.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'

const candidates = [
  { serverId: 'local', field: 'env:GITHUB_TOKEN', matchedBy: 'NAME' },
  { serverId: 'remote', field: 'token', matchedBy: 'ALWAYS_SECRET' },
]

const REVIEW_KEY = 'autobyteus.mcp.secretReview.embedded-local'
const servers = [{ serverId: 'local' }, { serverId: 'remote' }]

const mountBanner = (initial = candidates) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { toolManagement: { loading: false, secretMoveCandidates: initial, mcpServers: servers } } })
  setActivePinia(pinia)
  const wrapper = mount(McpSecretMoveBanner, {
    global: { plugins: [pinia], mocks: { $t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) } },
  })
  return { wrapper, store: useToolManagementStore() }
}

const flush = async () => { await nextTick(); await Promise.resolve(); await nextTick() }
const click = async (wrapper: VueWrapper, testId: string) => { await wrapper.get(`[data-testid="${testId}"]`).trigger('click'); await flush() }

describe('McpSecretMoveBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is hidden when no plain value looks like a secret', () => {
    expect(mountBanner([]).wrapper.find('[data-testid="mcp-secret-move-banner"]').exists()).toBe(false)
  })

  it('moves the ticked candidates and shows the backup path and its warning', async () => {
    const { wrapper, store } = mountBanner()
    store.moveMcpSecretsToVault = vi.fn().mockResolvedValue({
      backupPath: '/tmp/test/mcps.json.backup-before-vault-move-2026', moved: [{ serverId: 'remote', field: 'token' }], skipped: [], serversFailingAfterMove: [],
    }) as never
    expect(wrapper.get('[data-testid="mcp-secret-move-banner"]').text()).toContain('{"count":2}')

    await click(wrapper, 'mcp-secret-move-review')
    const boxes = wrapper.findAll('[data-testid="mcp-secret-move-candidate"]')
    expect(boxes).toHaveLength(2)
    expect(wrapper.text()).not.toMatch(/test-dummy/)
    await boxes[0]!.setValue(false)
    await click(wrapper, 'mcp-secret-move-confirm')

    expect(store.moveMcpSecretsToVault).toHaveBeenCalledWith([{ serverId: 'remote', field: 'token' }])
    const result = wrapper.get('[data-testid="mcp-secret-move-result"]').text()
    expect(result).toContain('/tmp/test/mcps.json.backup-before-vault-move-2026')
    expect(result).toContain('tools.components.tools.McpSecretMoveBanner.backup_holds_plain_values')
  })

  it('lists servers whose tools could not be registered after the move', async () => {
    const { wrapper, store } = mountBanner()
    store.moveMcpSecretsToVault = vi.fn().mockResolvedValue({
      backupPath: '/tmp/test/backup', moved: [{ serverId: 'local', field: 'env:GITHUB_TOKEN' }], skipped: [{ serverId: 'remote', field: 'token' }],
      serversFailingAfterMove: [{ serverId: 'local', reason: "MCP server 'local' needs secret: env:GITHUB_TOKEN (the vault is unavailable)." }],
    }) as never

    await click(wrapper, 'mcp-secret-move-review')
    await click(wrapper, 'mcp-secret-move-confirm')

    const result = wrapper.get('[data-testid="mcp-secret-move-result"]').text()
    expect(result).toContain("local: MCP server 'local' needs secret: env:GITHUB_TOKEN (the vault is unavailable).")
    expect(result).toContain('remote token')
  })

  it('shows only candidates the user has not reviewed (MDEC-006)', () => {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(['local|env:GITHUB_TOKEN']))
    const { wrapper } = mountBanner()
    expect(wrapper.get('[data-testid="mcp-secret-move-banner"]').text()).toContain('{"count":1}')
  })

  it('"Keep as they are" marks every shown candidate reviewed and hides the banner', async () => {
    const { wrapper, store } = mountBanner()
    await click(wrapper, 'mcp-secret-move-keep')

    expect(JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '[]')).toEqual(['local|env:GITHUB_TOKEN', 'remote|token'])
    expect(wrapper.find('[data-testid="mcp-secret-move-banner"]').exists()).toBe(false)
    expect(store.moveMcpSecretsToVault).not.toHaveBeenCalled()
  })

  it('marks the rows the user unticked as reviewed, and with nothing ticked closes without moving', async () => {
    const { wrapper, store } = mountBanner()
    await click(wrapper, 'mcp-secret-move-review')
    for (const box of wrapper.findAll('[data-testid="mcp-secret-move-candidate"]')) await box.setValue(false)
    expect(wrapper.get('[data-testid="mcp-secret-move-confirm"]').text()).toBe('tools.components.tools.McpSecretMoveBanner.keep_as_they_are')

    await click(wrapper, 'mcp-secret-move-confirm')

    expect(store.moveMcpSecretsToVault).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '[]')).toEqual(['local|env:GITHUB_TOKEN', 'remote|token'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
