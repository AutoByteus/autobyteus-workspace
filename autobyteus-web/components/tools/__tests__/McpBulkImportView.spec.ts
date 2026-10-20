import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpBulkImportView from '../McpBulkImportView.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'

type Failure = { serverId: string; reason: string }

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mountView = (result: { success: boolean; message: string; importedCount: number; failedCount: number; failures: Failure[] }) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { toolManagement: { loading: false } } })
  setActivePinia(pinia)
  const wrapper = mount(McpBulkImportView, { global: { plugins: [pinia], mocks: { $t: (key: string) => key } } })
  const store = useToolManagementStore()
  store.importMcpServerConfigs = vi.fn().mockResolvedValue(result) as never
  return wrapper
}

const runImport = async (wrapper: VueWrapper) => {
  await wrapper.get('#bulk-json-input').setValue('{"mcpServers": {}}')
  const button = wrapper.findAll('button').find((item) => item.text().includes('Import Configurations'))
  await button!.trigger('click')
  await flushPromises()
}

const lastToast = (wrapper: VueWrapper) => (wrapper.emitted('show-toast') ?? []).at(-1)?.[0]

describe('McpBulkImportView results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists the failed entries, stays open and shows an info toast after a partial import', async () => {
    const wrapper = mountView({
      success: false, message: 'Import complete. Imported: 1, Failed: 1', importedCount: 1, failedCount: 1,
      failures: [{ serverId: 'bad', reason: "Invalid 'transport_type' string 'websocket' for server 'bad'." }],
    })
    await runImport(wrapper)

    const list = wrapper.get('#bulk-import-failures')
    expect(list.text()).toContain('These entries were not imported:')
    expect(list.text()).toContain("bad: Invalid 'transport_type' string 'websocket' for server 'bad'.")
    expect(lastToast(wrapper)).toEqual({ message: 'Imported 1; 1 failed. See the entries below.', type: 'info' })
    expect(wrapper.emitted('save-complete')).toBeUndefined()
  })

  it('shows an error toast and the list when nothing was imported', async () => {
    const wrapper = mountView({
      success: false, message: 'Import complete. Imported: 0, Failed: 2', importedCount: 0, failedCount: 2,
      failures: [{ serverId: 'a', reason: 'reason a' }, { serverId: 'b', reason: 'reason b' }],
    })
    await runImport(wrapper)

    expect(wrapper.get('#bulk-import-failures').findAll('li')).toHaveLength(2)
    expect(lastToast(wrapper)).toEqual({ message: 'No servers were imported; 2 failed. See the entries below.', type: 'error' })
    expect(wrapper.emitted('save-complete')).toBeUndefined()
  })

  it('returns to the server list after a full import', async () => {
    const wrapper = mountView({ success: true, message: 'Import complete. Imported: 2, Failed: 0', importedCount: 2, failedCount: 0, failures: [] })
    await runImport(wrapper)

    expect(wrapper.find('#bulk-import-failures').exists()).toBe(false)
    expect(lastToast(wrapper)).toEqual({ message: 'MCP server configurations imported: 2.', type: 'success' })
    expect(wrapper.emitted('save-complete')).toHaveLength(1)
  })

  it('shows the server message when the input itself is rejected', async () => {
    const wrapper = mountView({ success: false, message: "Error: JSON must contain a top-level 'mcpServers' object.", importedCount: 0, failedCount: 0, failures: [] })
    await runImport(wrapper)

    expect(wrapper.find('#bulk-import-failures').exists()).toBe(false)
    expect(lastToast(wrapper)).toEqual({ message: "Error: JSON must contain a top-level 'mcpServers' object.", type: 'error' })
    expect(wrapper.emitted('save-complete')).toBeUndefined()
  })
})
