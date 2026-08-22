import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationLaunchSelectionPreview,
  ApplicationLaunchSlotView,
} from '@autobyteus/application-sdk-contracts'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useApplicationLaunchSelectionPreviews } from '../useApplicationLaunchSelectionPreviews'
import {
  MANIFEST_DEFAULT_SELECTION,
  buildResourceRefKey,
  type ApplicationSlotDraft,
} from '~/utils/application/applicationLaunchProfile'

const packageRef = {
  source: 'bundle',
  kind: 'AGENT_TEAM',
  localId: 'brief-team',
} as const
const alternateA = {
  source: 'shared',
  kind: 'AGENT_TEAM',
  definitionId: 'alternate-a',
} as const
const alternateB = {
  source: 'shared',
  kind: 'AGENT_TEAM',
  definitionId: 'alternate-b',
} as const

const view = {
  slot: {
    slotKey: 'draftingTeam',
    name: 'Drafting Team',
    allowedExecutionResourceKinds: ['AGENT_TEAM'],
    allowedExecutionResourceSources: ['bundle', 'shared'],
    required: true,
    defaultExecutionResourceRef: packageRef,
  },
  packageBaseline: null,
  selectedResourceBaseline: null,
  savedOverride: null,
  savedOverrideState: 'ABSENT',
  effectiveConfiguration: null,
  issues: [],
  canResetToPackageDefaults: false,
  updatedAt: null,
} satisfies ApplicationLaunchSlotView

const availableResources: ApplicationExecutionResourceSummary[] = [
  {
    source: 'shared',
    kind: 'AGENT_TEAM',
    localId: null,
    definitionId: alternateA.definitionId,
    name: 'Alternate A',
    applicationId: null,
  },
  {
    source: 'shared',
    kind: 'AGENT_TEAM',
    localId: null,
    definitionId: alternateB.definitionId,
    name: 'Alternate B',
    applicationId: null,
  },
]

const draftFor = (ref: ApplicationExecutionResourceRef): ApplicationSlotDraft => ({
  selection: buildResourceRefKey(ref),
  launchProfile: null,
})

const resolvedPreview = (
  executionResourceRef: ApplicationExecutionResourceRef,
  overrides: Partial<ApplicationLaunchSelectionPreview> = {},
): ApplicationLaunchSelectionPreview => ({
  status: 'RESOLVED',
  applicationId: 'brief-app',
  slotKey: 'draftingTeam',
  executionResourceRef,
  selectedResourceBaseline: {
    slotKey: 'draftingTeam',
    executionResourceRef,
    resourceDefinitionId: executionResourceRef.source === 'shared'
      ? executionResourceRef.definitionId
      : executionResourceRef.localId,
    resourceKind: executionResourceRef.kind,
    leaves: [],
  },
  issues: [],
  ...overrides,
} as ApplicationLaunchSelectionPreview)

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useApplicationLaunchSelectionPreviews', () => {
  it('binds results to the exact app/slot/ref and discards an older out-of-order response', async () => {
    const requestA = deferred<ApplicationLaunchSelectionPreview>()
    const requestB = deferred<ApplicationLaunchSelectionPreview>()
    const fetchPreview = vi.fn((
      _applicationId: string,
      _slotKey: string,
      executionResourceRef: ApplicationExecutionResourceRef,
    ) => executionResourceRef.source === 'shared'
      && executionResourceRef.definitionId === alternateA.definitionId
      ? requestA.promise
      : requestB.promise)
    const previews = useApplicationLaunchSelectionPreviews({
      applicationId: ref('brief-app'),
      fetchPreview,
    })

    const pendingA = previews.requestForSelection(view, draftFor(alternateA), availableResources)
    const pendingB = previews.requestForSelection(view, draftFor(alternateB), availableResources)
    expect(previews.stateBySlot.value.draftingTeam).toMatchObject({
      status: 'PENDING',
      identity: 'brief-app:draftingTeam:shared:AGENT_TEAM:alternate-b',
    })

    requestA.resolve(resolvedPreview(alternateA))
    await pendingA
    expect(previews.stateBySlot.value.draftingTeam).toMatchObject({
      status: 'PENDING',
      identity: 'brief-app:draftingTeam:shared:AGENT_TEAM:alternate-b',
    })

    requestB.resolve(resolvedPreview(alternateB))
    await pendingB
    expect(previews.stateBySlot.value.draftingTeam).toMatchObject({
      status: 'RESOLVED',
      identity: 'brief-app:draftingTeam:shared:AGENT_TEAM:alternate-b',
      preview: expect.objectContaining({
        applicationId: 'brief-app',
        slotKey: 'draftingTeam',
        executionResourceRef: alternateB,
      }),
    })
  })

  it('invalidates a pending response when selection returns to persisted package defaults', async () => {
    const request = deferred<ApplicationLaunchSelectionPreview>()
    const previews = useApplicationLaunchSelectionPreviews({
      applicationId: ref('brief-app'),
      fetchPreview: vi.fn(() => request.promise),
    })

    const pending = previews.requestForSelection(view, draftFor(alternateA), availableResources)
    await previews.requestForSelection(view, {
      selection: MANIFEST_DEFAULT_SELECTION,
      launchProfile: null,
    }, availableResources)
    expect(previews.stateBySlot.value.draftingTeam).toBeUndefined()

    request.resolve(resolvedPreview(alternateA))
    await pending
    expect(previews.stateBySlot.value.draftingTeam).toBeUndefined()
  })

  it('discards a response whose echoed exact identity does not match the request', async () => {
    const previews = useApplicationLaunchSelectionPreviews({
      applicationId: ref('brief-app'),
      fetchPreview: vi.fn(async () => resolvedPreview(alternateA, {
        applicationId: 'different-app',
      })),
    })

    await previews.requestForSelection(view, draftFor(alternateA), availableResources)

    expect(previews.stateBySlot.value.draftingTeam).toMatchObject({
      status: 'PENDING',
      identity: 'brief-app:draftingTeam:shared:AGENT_TEAM:alternate-a',
    })
  })
})
