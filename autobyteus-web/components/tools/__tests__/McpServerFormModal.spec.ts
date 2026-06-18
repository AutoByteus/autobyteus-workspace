import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpServerFormModal from '../McpServerFormModal.vue'
import { useToolManagementStore, type McpServer } from '~/stores/toolManagementStore'

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
}

const clickByText = async (wrapper: VueWrapper, text: string) => {
  const button = wrapper.findAll('button').find(item => item.text().includes(text))
  expect(button, `button containing '${text}'`).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}

const mountComponent = (server: McpServer | null = null) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      toolManagement: {
        loading: false,
        previewResult: null,
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
  return { wrapper, store }
}

const setJsonInput = async (wrapper: VueWrapper, value: unknown) => {
  await clickByText(wrapper, 'JSON View')
  await wrapper.get('#json-input').setValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

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
        env: {},
        cwd: null,
      },
      streamableHttpConfig: null,
    })
  })

  it('saves a pasted HTTP mcpServers JSON with aliases and headers as the active input', async () => {
    const { wrapper, store } = mountComponent()
    await wrapper.get('#sync-on-save').setValue(false)
    await setJsonInput(wrapper, {
      mcpServers: {
        httpServer: {
          transport_type: 'streamable_http',
          tool_name_prefix: 'video_editing',
          url: 'http://localhost:8000/mcp',
          headers: { Authorization: 'Bearer token' },
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
        headers: { Authorization: 'Bearer token' },
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
    const existingServer: McpServer = {
      __typename: 'StdioMcpServerConfig',
      serverId: 'existing-server',
      transportType: 'STDIO',
      enabled: true,
      toolNamePrefix: '',
      command: 'node',
      args: [],
      env: {},
      cwd: '',
    }
    const { wrapper, store } = mountComponent(existingServer)
    await setJsonInput(wrapper, {
      mcpServers: {
        'pasted-server': { command: 'uv' },
      },
    })

    await clickByText(wrapper, 'Preview Tools')

    expect(store.previewMcpServer).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'existing-server' }))
  })

  it('keeps Apply JSON to Form as an optional conversion action', async () => {
    const { wrapper, store } = mountComponent()
    await setJsonInput(wrapper, {
      mcpServers: {
        appliedServer: {
          command: 'uv',
          args: ['run', 'server.py'],
          env: { API_KEY: 'abc' },
        },
      },
    })

    await clickByText(wrapper, 'apply_json_to_form')
    await clickByText(wrapper, 'Preview Tools')

    expect((wrapper.get('#serverId').element as HTMLInputElement).value).toBe('appliedServer')
    expect(store.previewMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      serverId: 'appliedServer',
      transportType: 'STDIO',
    }))
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
