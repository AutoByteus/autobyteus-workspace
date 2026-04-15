import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { openWorkspaceExecutionLinkMock } = vi.hoisted(() => ({
  openWorkspaceExecutionLinkMock: vi.fn(),
}))

const routeMock = reactive({
  path: '/workspace',
  query: {} as Record<string, string>,
})

const routerReplaceMock = vi.fn(async (location: { path: string; query: Record<string, string> }) => {
  routeMock.path = location.path
  routeMock.query = { ...(location.query ?? {}) }
})

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}))

vi.mock('~/services/workspace/workspaceNavigationService', async () => {
  const actual = await vi.importActual<typeof import('~/services/workspace/workspaceNavigationService')>('~/services/workspace/workspaceNavigationService')
  return {
    ...actual,
    openWorkspaceExecutionLink: openWorkspaceExecutionLinkMock,
  }
})

import { useWorkspaceRouteSelection } from '../useWorkspaceRouteSelection'

const Harness = {
  template: '<div />',
  setup() {
    useWorkspaceRouteSelection()
    return {}
  },
}

describe('useWorkspaceRouteSelection', () => {
  afterEach(() => {
    routeMock.path = '/workspace'
    routeMock.query = {}
    openWorkspaceExecutionLinkMock.mockReset()
    routerReplaceMock.mockClear()
  })

  it('opens a team execution link from the workspace route and clears the query', async () => {
    routeMock.query = {
      workspaceExecutionKind: 'team',
      workspaceExecutionRunId: 'team-run-1',
      workspaceExecutionMemberRouteKey: 'writer',
    }

    mount(Harness)
    await flushPromises()

    expect(openWorkspaceExecutionLinkMock).toHaveBeenCalledWith({
      kind: 'team',
      teamRunId: 'team-run-1',
      memberRouteKey: 'writer',
    })
    expect(routerReplaceMock).toHaveBeenCalledWith({
      path: '/workspace',
      query: {},
    })
  })
})
