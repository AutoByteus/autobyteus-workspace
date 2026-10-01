import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { applicationsCapabilityStoreMock, projectsCapabilityStoreMock, navigateToMock } = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  projectsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  navigateToMock: vi.fn(),
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/stores/projectsCapabilityStore', () => ({
  useProjectsCapabilityStore: () => projectsCapabilityStoreMock,
}))

mockNuxtImport('navigateTo', () => navigateToMock)
vi.stubGlobal('defineNuxtRouteMiddleware', vi.fn((fn: any) => fn))

import middleware from '../feature-flags.global'

describe('feature-flags.global middleware', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    projectsCapabilityStoreMock.isEnabled = false
    projectsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it('redirects to / when accessing /applications and the capability is disabled', async () => {
    await middleware({ path: '/applications' } as any)

    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('redirects to / when capability resolution fails', async () => {
    applicationsCapabilityStoreMock.ensureResolved.mockRejectedValueOnce(new Error('boom'))

    await middleware({ path: '/applications/123' } as any)

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('does not redirect when accessing /applications and the capability is enabled', async () => {
    applicationsCapabilityStoreMock.isEnabled = true

    await middleware({ path: '/applications' } as any)

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not resolve the capability for non-application routes', async () => {
    await middleware({ path: '/agents' } as any)

    expect(applicationsCapabilityStoreMock.ensureResolved).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('redirects /projects routes to / when the projects capability is disabled', async () => {
    await middleware({ path: '/projects/project_1' } as any, {} as any)

    expect(projectsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
    expect(applicationsCapabilityStoreMock.ensureResolved).not.toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('redirects /projects to / when projects capability resolution fails', async () => {
    projectsCapabilityStoreMock.ensureResolved.mockRejectedValueOnce(new Error('boom'))

    await middleware({ path: '/projects' } as any, {} as any)

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('allows /projects when the projects capability is enabled', async () => {
    projectsCapabilityStoreMock.isEnabled = true

    await middleware({ path: '/projects' } as any, {} as any)

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not consult the projects capability for application routes', async () => {
    applicationsCapabilityStoreMock.isEnabled = true

    await middleware({ path: '/applications' } as any, {} as any)

    expect(projectsCapabilityStoreMock.ensureResolved).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
