import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import McpBulkImportView from '../McpBulkImportView.vue'
import { useToolManagementStore } from '~/stores/toolManagementStore'

type Failure = { serverId: string; reason: string }
type StoredSecret = { serverId: string; field: string }

const flushPromises = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mountView = (input: { success: boolean; message: string; importedCount: number; failedCount: number; failures: Failure[]; storedSecrets?: StoredSecret[]; needsSecret?: StoredSecret[] }) => {
  const result = { storedSecrets: [], needsSecret: [], ...input }
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

  it('names the values stored in the vault in the success toast (the view then closes)', async () => {
    const wrapper = mountView({
      success: true, message: 'Import complete. Imported: 1, Failed: 0', importedCount: 1, failedCount: 0, failures: [],
      storedSecrets: [{ serverId: 'local', field: 'env:API_KEY' }, { serverId: 'remote', field: 'header:Authorization' }],
    })
    await runImport(wrapper)

    expect(lastToast(wrapper)).toEqual({
      message: 'MCP server configurations imported: 1. Stored in the vault: local env:API_KEY, remote header:Authorization.',
      type: 'success',
    })
    expect(wrapper.emitted('save-complete')).toHaveLength(1)
  })

  it('lists the values stored in the vault next to the failures after a partial import', async () => {
    const wrapper = mountView({
      success: false, message: 'Import complete. Imported: 1, Failed: 1', importedCount: 1, failedCount: 1,
      failures: [{ serverId: 'bad', reason: 'reason' }],
      storedSecrets: [{ serverId: 'local', field: 'env:GITHUB_TOKEN' }],
    })
    await runImport(wrapper)

    const stored = wrapper.get('#bulk-import-stored-secrets')
    expect(stored.text()).toContain('These values were stored in the vault:')
    expect(stored.findAll('li').map(item => item.text())).toEqual(['local · env:GITHUB_TOKEN'])
  })

  it('lists imported secrets this node does not hold, and names them in the toast so they are entered again', async () => {
    const wrapper = mountView({
      success: true, message: 'Import complete. Imported: 1, Failed: 0', importedCount: 1, failedCount: 0, failures: [],
      needsSecret: [{ serverId: 'copied', field: 'env:API_KEY' }],
    })
    await runImport(wrapper)

    expect(wrapper.get('#bulk-import-needs-secret').findAll('li').map(item => item.text())).toEqual(['copied · env:API_KEY'])
    expect(lastToast(wrapper)).toEqual({
      message: 'MCP server configurations imported: 1. Enter these secrets again on this node: copied env:API_KEY.',
      type: 'info',
    })
  })
})
