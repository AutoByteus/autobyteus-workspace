import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { applicationsCapabilityStoreMock, navigateToMock } = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  navigateToMock: vi.fn(),
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

mockNuxtImport('navigateTo', () => navigateToMock)
vi.stubGlobal('defineNuxtRouteMiddleware', vi.fn((fn: any) => fn))

import middleware from '../feature-flags.global'

describe('feature-flags.global middleware', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it('redirects to / when accessing /applications and the capability is disabled', async () => {
    await middleware({ path: '/applications' } as any, {} as any)

    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('redirects to / when capability resolution fails', async () => {
    applicationsCapabilityStoreMock.ensureResolved.mockRejectedValueOnce(new Error('boom'))

    await middleware({ path: '/applications/123' } as any, {} as any)

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('does not redirect when accessing /applications and the capability is enabled', async () => {
    applicationsCapabilityStoreMock.isEnabled = true

    await middleware({ path: '/applications' } as any, {} as any)

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not resolve the capability for non-application routes', async () => {
    await middleware({ path: '/agents' } as any, {} as any)

    expect(applicationsCapabilityStoreMock.ensureResolved).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  // projects-always-on (AC-001, AC-002): /projects is no longer gated; it opens without any capability check.
  it.each(['/projects', '/projects/project_1', '/projects/temp-tasks'])('never gates %s', async (path) => {
    await middleware({ path } as any, {} as any)

    expect(applicationsCapabilityStoreMock.ensureResolved).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
