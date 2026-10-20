import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToolManagementStore } from '../toolManagementStore'

const { mutateMock } = vi.hoisted(() => ({ mutateMock: vi.fn() }))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ mutate: mutateMock }),
}))

const importResult = (importedCount: number, failedCount: number) => ({
  __typename: 'ImportMcpServerConfigsResult',
  success: failedCount === 0,
  message: `Import complete. Imported: ${importedCount}, Failed: ${failedCount}`,
  importedCount,
  failedCount,
  failures: failedCount ? [{ __typename: 'ImportMcpServerConfigFailure', serverId: 'bad', reason: 'dummy reason' }] : [],
})

describe('toolManagementStore MCP bulk import', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mutateMock.mockReset()
  })

  it('refreshes the server list when at least one entry was imported, and returns the failures', async () => {
    mutateMock.mockResolvedValue({ data: { importMcpServerConfigs: importResult(1, 1) }, errors: undefined })
    const store = useToolManagementStore()
    const fetchMcpServers = vi.spyOn(store, 'fetchMcpServers').mockResolvedValue(undefined as never)

    const result = await store.importMcpServerConfigs('{"mcpServers":{}}')

    expect(fetchMcpServers).toHaveBeenCalledTimes(1)
    expect(result.failures).toEqual([{ __typename: 'ImportMcpServerConfigFailure', serverId: 'bad', reason: 'dummy reason' }])
  })

  it('does not refresh when nothing was imported', async () => {
    mutateMock.mockResolvedValue({ data: { importMcpServerConfigs: importResult(0, 2) }, errors: undefined })
    const store = useToolManagementStore()
    const fetchMcpServers = vi.spyOn(store, 'fetchMcpServers').mockResolvedValue(undefined as never)

    await store.importMcpServerConfigs('{"mcpServers":{}}')

    expect(fetchMcpServers).not.toHaveBeenCalled()
  })
})
