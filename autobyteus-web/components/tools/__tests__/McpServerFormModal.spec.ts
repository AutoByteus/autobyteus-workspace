/**
 * The MCP server form: JSON View actions, and secret values (autobyteus-244): lock toggles on env and header rows,
 * stored secrets that are never shown and are kept unless replaced, keep markers in the JSON View, the review step for
 * new values the rule locks, the token's states, and the per-row "Move to vault". Dummy values only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpServerFormModal from '../McpServerFormModal.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'
import type { McpServer } from '~/types/mcpServer'

// Vitest runs from autobyteus-web; the shared vectors carry the server's rule.
const { rule } = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../test-support/fixtures/mcp-secret-suggestion-vectors.json'), 'utf8'))

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const clickByText = async (wrapper: VueWrapper, text: string) => {
  const button = wrapper.findAll('button').find(item => item.text().includes(text))
  expect(button, `button containing '${text}'`).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}

const mountComponent = (server: McpServer | null = null, withRule = true) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      toolManagement: {
        loading: false,
        previewResult: null,
        secretSuggestionRule: withRule ? rule : null,
      },
    },
  })
  setActivePinia(pinia)

  const wrapper = mount(McpServerFormModal, {
    props: { server },
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

  const store = useToolManagementStore()
  store.previewMcpServer = vi.fn().mockResolvedValue(undefined) as any
  store.configureMcpServer = vi.fn().mockResolvedValue({}) as any
  store.discoverAndRegisterMcpServerTools = vi.fn().mockResolvedValue({ success: true, message: 'Synced' }) as any
  store.moveMcpSecretsToVault = vi.fn().mockResolvedValue({ backupPath: '/tmp/test/mcps.json.backup-before-vault-move-x', moved: [], skipped: [], serversFailingAfterMove: [] }) as any
  return { wrapper, store }
}

const setJsonInput = async (wrapper: VueWrapper, value: unknown) => {
  await clickByText(wrapper, 'JSON View')
  await wrapper.get('#json-input').setValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

const readJson = (wrapper: VueWrapper) => JSON.parse((wrapper.get('#json-input').element as HTMLTextAreaElement).value)

const rows = (wrapper: VueWrapper, kind: 'env' | 'header') => wrapper.findAll(`[data-testid="mcp-row-${kind}"]`)

const stdioServer = (env: McpServer['env']): McpServer => ({
  __typename: 'StdioMcpServerConfig',
  serverId: 'local',
  transportType: 'STDIO',
  enabled: true,
  toolNamePrefix: '',
  command: 'node',
  args: ['server.js'],
  env,
  cwd: '',
})

const httpServer = (headers: McpServer['headers'], tokenState: McpServer['tokenState'] = null): McpServer => ({
  __typename: 'StreamableHttpMcpServerConfig',
  serverId: 'remote',
  transportType: 'STREAMABLE_HTTP',
  enabled: true,
  toolNamePrefix: '',
  url: 'http://127.0.0.1:9000/mcp',
  tokenState,
  headers,
})

describe('McpServerFormModal JSON View actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('previews a pasted standard STDIO mcpServers JSON without applying it to the form first', async () => {
    const { wrapper, store } = mountComponent()
    await setJsonInput(wrapper, {
      mcpServers: {
        VideoAudioServer: {
          command: 'uv',
          args: ['--directory', '/tmp/video-audio-mcp', 'run', 'server.py'],
        },
      },
    })

    await clickByText(wrapper, 'Preview Tools')

    expect(store.previewMcpServer).toHaveBeenCalledWith({
      serverId: 'VideoAudioServer',
      transportType: 'STDIO',
      toolNamePrefix: null,
      enabled: true,
      stdioConfig: {
        command: 'uv',
        args: ['--directory', '/tmp/video-audio-mcp', 'run', 'server.py'],
        env: [],
        cwd: null,
      },
      streamableHttpConfig: null,
    })
  })

  it('saves a pasted HTTP mcpServers JSON with aliases, storing its Authorization header as a secret', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#sync-on-save').setValue(false)
    await setJsonInput(wrapper, {
      mcpServers: {
        httpServer: {
          transport_type: 'streamable_http',
          tool_name_prefix: 'video_editing',
          url: 'http://localhost:8000/mcp',
          headers: { Authorization: 'Bearer test-dummy-header-secret', 'X-Toolsets': 'repos' },
        },
      },
    })

    await clickByText(wrapper, 'Save Configuration')

    expect(store.configureMcpServer).toHaveBeenCalledWith({
      serverId: 'httpServer',
      transportType: 'STREAMABLE_HTTP',
      toolNamePrefix: 'video_editing',
      enabled: true,
      stdioConfig: null,
      streamableHttpConfig: {
        url: 'http://localhost:8000/mcp',
        token: null,
        headers: [
          { name: 'Authorization', secret: true, value: 'Bearer test-dummy-header-secret' },
          { name: 'X-Toolsets', secret: false, value: 'repos' },
        ],
      },
    })
    expect(store.discoverAndRegisterMcpServerTools).not.toHaveBeenCalled()
  })

  it('blocks invalid JSON preview without falling back to stale form state', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#serverId').setValue('stale-form-server')
    await setJsonInput(wrapper, '{ invalid json')

    await clickByText(wrapper, 'Preview Tools')

    expect(store.previewMcpServer).not.toHaveBeenCalled()
    expect(store.getPreviewResult?.isError).toBe(true)
    expect(store.getPreviewResult?.message).toContain('Invalid JSON syntax')
  })

  it('blocks multi-server JSON save and emits a recoverable toast', async () => {
    const { wrapper, store } = mountComponent()
    await setJsonInput(wrapper, {
      mcpServers: {
        one: { command: 'uv' },
        two: { command: 'node' },
      },
    })

    await clickByText(wrapper, 'Save Configuration')

    expect(store.configureMcpServer).not.toHaveBeenCalled()
    const toastEvents = wrapper.emitted('show-toast') ?? []
    expect(toastEvents.at(-1)?.[0]).toMatchObject({ type: 'error' })
    expect(JSON.stringify(toastEvents.at(-1)?.[0])).toContain('exactly one server')
  })

  it('preserves the existing server ID in edit mode even when JSON uses a different key', async () => {
    const { wrapper, store } = mountComponent(stdioServer([]))
    await setJsonInput(wrapper, {
      mcpServers: {
        'pasted-server': { command: 'uv' },
      },
    })

    await clickByText(wrapper, 'Preview Tools')

    expect(store.previewMcpServer).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'local' }))
  })

  it('keeps Apply JSON to Form as an optional conversion action, locking a value the rule matches', async () => {
    const { wrapper, store } = mountComponent()
    await setJsonInput(wrapper, {
      mcpServers: {
        appliedServer: {
          command: 'uv',
          args: ['run', 'server.py'],
          env: { API_KEY: 'test-dummy-env-secret', LOG_LEVEL: 'debug' },
        },
      },
    })

    await clickByText(wrapper, 'apply_json_to_form')
    await clickByText(wrapper, 'Preview Tools')

    expect((wrapper.get('#serverId').element as HTMLInputElement).value).toBe('appliedServer')
    expect(store.previewMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      serverId: 'appliedServer',
      transportType: 'STDIO',
      stdioConfig: expect.objectContaining({
        env: [
          { name: 'API_KEY', secret: true, value: 'test-dummy-env-secret' },
          { name: 'LOG_LEVEL', secret: false, value: 'debug' },
        ],
      }),
    }))
    expect(rows(wrapper, 'env')[0]!.get('[data-testid="mcp-row-value"]').attributes('type')).toBe('password')
  })

  it('explains under the Token field how the token is sent', async () => {
    const { wrapper } = mountComponent()
    await wrapper.get('#transportType').setValue('STREAMABLE_HTTP')

    const hint = wrapper.get('#http_token_hint')
    expect(hint.text()).toBe('tools.components.tools.McpServerFormModal.token_hint')
    expect(wrapper.get('#http_token').attributes('aria-describedby')).toBe('http_token_hint')
  })

  it('continues to preview Form View fields without parsing JSON', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#serverId').setValue('form-server')
    await wrapper.get('#stdio_command').setValue('uv')

    await clickByText(wrapper, 'Preview Tools')

    expect(store.previewMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      serverId: 'form-server',
      transportType: 'STDIO',
      stdioConfig: expect.objectContaining({ command: 'uv' }),
    }))
  })
})

describe('McpServerFormModal secret values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a stored secret as an empty locked row, keeps it when left empty and replaces it when typed', async () => {
    const { wrapper, store } = mountComponent(stdioServer([
      { name: 'API_KEY', value: null, state: 'CONFIGURED' },
      { name: 'LOG_LEVEL', value: 'debug', state: 'PLAIN' },
    ]))
    await wrapper.get('#sync-on-save').setValue(false)

    const [secretRow, plainRow] = rows(wrapper, 'env')
    expect((secretRow!.get('[data-testid="mcp-row-value"]').element as HTMLInputElement).value).toBe('')
    expect(secretRow!.get('[data-testid="mcp-row-value"]').attributes('type')).toBe('password')
    expect(secretRow!.get('[data-testid="mcp-row-name"]').attributes('readonly')).toBeDefined()
    expect(secretRow!.get('[data-testid="mcp-row-note"]').text()).toContain('Stored in the vault. Leave empty to keep it')
    expect((plainRow!.get('[data-testid="mcp-row-value"]').element as HTMLInputElement).value).toBe('debug')

    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenLastCalledWith(expect.objectContaining({
      stdioConfig: expect.objectContaining({
        env: [{ name: 'API_KEY', secret: true, value: null }, { name: 'LOG_LEVEL', secret: false, value: 'debug' }],
      }),
    }))

    await secretRow!.get('[data-testid="mcp-row-value"]').setValue('test-dummy-env-secret-2')
    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenLastCalledWith(expect.objectContaining({
      stdioConfig: expect.objectContaining({
        env: [{ name: 'API_KEY', secret: true, value: 'test-dummy-env-secret-2' }, { name: 'LOG_LEVEL', secret: false, value: 'debug' }],
      }),
    }))
  })

  it('pre-locks a new row the rule matches while typing, and keeps a lock set by hand', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#serverId').setValue('local')
    await wrapper.get('#stdio_command').setValue('node')
    await clickByText(wrapper, 'Add Variable')
    await clickByText(wrapper, 'Add Variable')
    await clickByText(wrapper, 'Add Variable')
    const [tokenRow, levelRow, limitRow] = rows(wrapper, 'env')
    await tokenRow!.get('[data-testid="mcp-row-name"]').setValue('GITHUB_TOKEN')
    await tokenRow!.get('[data-testid="mcp-row-value"]').setValue('test-dummy-env-secret')
    await levelRow!.get('[data-testid="mcp-row-name"]').setValue('LOG_LEVEL')
    await levelRow!.get('[data-testid="mcp-row-value"]').setValue('debug')
    await limitRow!.get('[data-testid="mcp-row-name"]').setValue('TOKEN_LIMIT')
    await limitRow!.get('[data-testid="mcp-row-lock"]').trigger('click')
    await limitRow!.get('[data-testid="mcp-row-value"]').setValue('4096')

    expect(tokenRow!.get('[data-testid="mcp-row-lock"]').attributes('aria-pressed')).toBe('true')
    expect(levelRow!.get('[data-testid="mcp-row-lock"]').attributes('aria-pressed')).toBe('false')
    expect(limitRow!.get('[data-testid="mcp-row-lock"]').attributes('aria-pressed')).toBe('false')

    await wrapper.get('#sync-on-save').setValue(false)
    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      stdioConfig: expect.objectContaining({
        env: [
          { name: 'GITHUB_TOKEN', secret: true, value: 'test-dummy-env-secret' },
          { name: 'LOG_LEVEL', secret: false, value: 'debug' },
          { name: 'TOKEN_LIMIT', secret: false, value: '4096' },
        ],
      }),
    }))
  })

  it('shows kept stored values as keep markers in the JSON View and keeps them when saved from it', async () => {
    const { wrapper, store } = mountComponent(httpServer([
      { name: 'Authorization', value: null, state: 'PLAIN' },
      { name: 'X-Api-Key', value: null, state: 'MISSING' },
      { name: 'X-Toolsets', value: 'repos', state: 'PLAIN' },
    ], 'CONFIGURED'))
    await wrapper.get('#sync-on-save').setValue(false)

    await clickByText(wrapper, 'JSON View')
    expect(readJson(wrapper)).toEqual({
      mcpServers: {
        remote: {
          transportType: 'streamable_http',
          enabled: true,
          url: 'http://127.0.0.1:9000/mcp',
          token: { stored: 'vault' },
          headers: { Authorization: { stored: 'plain' }, 'X-Api-Key': { stored: 'vault' }, 'X-Toolsets': 'repos' },
        },
      },
    })

    // A missing secret cannot be kept: give it a value in the JSON, keep the others.
    const json = readJson(wrapper)
    json.mcpServers.remote.headers['X-Api-Key'] = 'test-dummy-header-secret'
    await wrapper.get('#json-input').setValue(JSON.stringify(json))
    await clickByText(wrapper, 'Save Configuration')

    expect(store.configureMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      streamableHttpConfig: {
        url: 'http://127.0.0.1:9000/mcp',
        token: { keep: true },
        headers: [
          { name: 'Authorization', secret: true, value: null },
          { name: 'X-Api-Key', secret: true, value: 'test-dummy-header-secret' },
          { name: 'X-Toolsets', secret: false, value: 'repos' },
        ],
      },
    }))
  })

  it('refuses a keep marker for a value that is not stored', async () => {
    const { wrapper, store } = mountComponent(stdioServer([]))
    await setJsonInput(wrapper, { mcpServers: { local: { command: 'node', env: { API_KEY: { stored: 'vault' } } } } })

    await clickByText(wrapper, 'Save Configuration')

    expect(store.configureMcpServer).not.toHaveBeenCalled()
    expect(JSON.stringify((wrapper.emitted('show-toast') ?? []).at(-1)?.[0])).toContain('env:API_KEY has no stored value to keep.')
  })

  it('asks for a review on the Form View when the JSON adds a value the rule locks, then saves it as a secret', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#sync-on-save').setValue(false)
    await setJsonInput(wrapper, { mcpServers: { local: { command: 'node', env: { GITHUB_TOKEN: 'test-dummy-env-secret' } } } })

    await clickByText(wrapper, 'Save Configuration')

    expect(store.configureMcpServer).not.toHaveBeenCalled()
    expect((wrapper.emitted('show-toast') ?? []).at(-1)?.[0]).toMatchObject({ type: 'info' })
    expect(wrapper.get('#serverId').isVisible()).toBe(true)
    expect(rows(wrapper, 'env')[0]!.get('[data-testid="mcp-row-lock"]').attributes('aria-pressed')).toBe('true')

    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      stdioConfig: expect.objectContaining({ env: [{ name: 'GITHUB_TOKEN', secret: true, value: 'test-dummy-env-secret' }] }),
    }))
  })

  it('keeps, replaces or removes a stored token, and never shows its value', async () => {
    const { wrapper, store } = mountComponent(httpServer([], 'CONFIGURED'))
    await wrapper.get('#sync-on-save').setValue(false)
    expect((wrapper.get('#http_token').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('[data-testid="mcp-token-note"]').text()).toContain('Stored in the vault')

    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenLastCalledWith(expect.objectContaining({ streamableHttpConfig: expect.objectContaining({ token: { keep: true } }) }))

    await wrapper.get('[data-testid="mcp-token-remove"]').setValue(true)
    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenLastCalledWith(expect.objectContaining({ streamableHttpConfig: expect.objectContaining({ token: null }) }))

    await wrapper.get('[data-testid="mcp-token-remove"]').setValue(false)
    await wrapper.get('#http_token').setValue('test-dummy-token-secret')
    await clickByText(wrapper, 'Save Configuration')
    expect(store.configureMcpServer).toHaveBeenLastCalledWith(expect.objectContaining({ streamableHttpConfig: expect.objectContaining({ token: { value: 'test-dummy-token-secret' } }) }))
  })

  it('shows "needs secret" for a missing value or an unavailable vault', async () => {
    const { wrapper } = mountComponent(stdioServer([
      { name: 'API_KEY', value: null, state: 'MISSING' },
      { name: 'OTHER_KEY', value: null, state: 'VAULT_UNAVAILABLE' },
    ]))

    const notes = rows(wrapper, 'env').map(row => row.get('[data-testid="mcp-row-note"]').text())
    expect(notes).toEqual([
      'Needs secret: no value is stored. Type a value to store one.',
      'Needs secret: the vault is unavailable, so the stored value cannot be read.',
    ])
  })

  it('offers "Move to vault" on a stored plain value the rule matches, and then shows it as stored in the vault', async () => {
    const { wrapper, store } = mountComponent(stdioServer([
      { name: 'GITHUB_TOKEN', value: 'test-dummy-env-secret', state: 'PLAIN' },
      { name: 'LOG_LEVEL', value: 'debug', state: 'PLAIN' },
    ]))
    store.moveMcpSecretsToVault = vi.fn().mockResolvedValue({
      backupPath: '/tmp/test/mcps.json.backup-before-vault-move-x', moved: [{ serverId: 'local', field: 'env:GITHUB_TOKEN' }], skipped: [], serversFailingAfterMove: [],
    }) as any
    const [tokenRow, levelRow] = rows(wrapper, 'env')
    expect(tokenRow!.get('[data-testid="mcp-row-note"]').text()).toContain('Looks like a secret')
    expect(levelRow!.find('[data-testid="mcp-row-note"]').exists()).toBe(false)

    await tokenRow!.get('[data-testid="mcp-row-move"]').trigger('click')
    await flushPromises()

    expect(store.moveMcpSecretsToVault).toHaveBeenCalledWith([{ serverId: 'local', field: 'env:GITHUB_TOKEN' }])
    const moved = rows(wrapper, 'env')[0]!
    expect((moved.get('[data-testid="mcp-row-value"]').element as HTMLInputElement).value).toBe('')
    expect(moved.get('[data-testid="mcp-row-note"]').text()).toContain('Stored in the vault. Leave empty to keep it')
    expect(JSON.stringify((wrapper.emitted('show-toast') ?? []).at(-1)?.[0])).toContain('mcps.json.backup-before-vault-move-x')
  })

  it('offers "Move to vault" for an always-secret field stored as plain text, which it never shows', async () => {
    const { wrapper } = mountComponent(httpServer([{ name: 'Authorization', value: null, state: 'PLAIN' }], 'PLAIN'))

    const row = rows(wrapper, 'header')[0]!
    expect((row.get('[data-testid="mcp-row-value"]').element as HTMLInputElement).value).toBe('')
    expect(row.get('[data-testid="mcp-row-lock"]').attributes('disabled')).toBeDefined()
    expect(row.get('[data-testid="mcp-row-note"]').text()).toContain('Stored as plain text')
    expect(row.find('[data-testid="mcp-row-move"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mcp-token-move"]').exists()).toBe(true)
  })
})
