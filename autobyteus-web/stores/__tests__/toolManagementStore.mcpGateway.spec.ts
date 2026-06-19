import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GET_TOOLS } from '~/graphql/queries/toolQueries'
import { useToolManagementStore } from '../toolManagementStore'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: queryMock }),
}))

describe('toolManagementStore MCP gateway tools', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    queryMock.mockReset()
  })

  it('fetches gateway tools from the GraphQL tools query scoped to MCP origin', async () => {
    queryMock.mockResolvedValue({
      data: {
        tools: [
          {
            name: 'db_query',
            description: 'Query database',
            origin: 'MCP',
            category: 'sqlite',
            argumentSchema: null,
          },
        ],
      },
      errors: undefined,
    })

    const store = useToolManagementStore()
    await store.fetchMcpGatewayTools()

    expect(queryMock).toHaveBeenCalledWith({
      query: GET_TOOLS,
      variables: { origin: 'MCP' },
      fetchPolicy: 'network-only',
    })
    expect(store.getMcpGatewayTools).toEqual([
      {
        name: 'db_query',
        description: 'Query database',
        origin: 'MCP',
        category: 'sqlite',
        argumentSchema: null,
      },
    ])
    expect(store.getLoading).toBe(false)
  })
})
