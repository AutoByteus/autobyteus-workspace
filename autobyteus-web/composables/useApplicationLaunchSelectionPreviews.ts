import { ref, type Ref } from 'vue'
import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationLaunchSelectionPreview,
  ApplicationLaunchSlotView,
} from '@autobyteus/application-sdk-contracts'
import {
  buildResourceRefKey,
  isSameResourceRef,
  resolveEffectiveResourceRef,
  type ApplicationSlotDraft,
} from '~/utils/application/applicationLaunchProfile'

export type ApplicationSelectionPreviewState = {
  status: 'PENDING' | 'RESOLVED' | 'INVALID'
  identity: string
  preview: ApplicationLaunchSelectionPreview | null
  error: string | null
}

const persistedSelectionRef = (
  view: ApplicationLaunchSlotView,
): ApplicationExecutionResourceRef | null => (
  view.savedOverride?.executionResourceRef
    ?? view.slot.defaultExecutionResourceRef
    ?? null
)

const requestIdentity = (
  applicationId: string,
  slotKey: string,
  ref: ApplicationExecutionResourceRef,
): string => `${applicationId}:${slotKey}:${buildResourceRefKey(ref)}`

export const useApplicationLaunchSelectionPreviews = (input: {
  applicationId: Ref<string>
  fetchPreview: (
    applicationId: string,
    slotKey: string,
    executionResourceRef: ApplicationExecutionResourceRef,
  ) => Promise<ApplicationLaunchSelectionPreview>
}) => {
  const stateBySlot = ref<Record<string, ApplicationSelectionPreviewState>>({})
  const generationBySlot = new Map<string, number>()

  const clearSlot = (slotKey: string): void => {
    generationBySlot.set(slotKey, (generationBySlot.get(slotKey) ?? 0) + 1)
    const next = { ...stateBySlot.value }
    delete next[slotKey]
    stateBySlot.value = next
  }

  const clearAll = (): void => {
    for (const slotKey of Object.keys(stateBySlot.value)) {
      generationBySlot.set(slotKey, (generationBySlot.get(slotKey) ?? 0) + 1)
    }
    stateBySlot.value = {}
  }

  const requestForSelection = async (
    view: ApplicationLaunchSlotView,
    draft: ApplicationSlotDraft,
    availableResources: ApplicationExecutionResourceSummary[],
  ): Promise<void> => {
    const selectedRef = resolveEffectiveResourceRef(view, draft, availableResources)
    if (!selectedRef || isSameResourceRef(selectedRef, persistedSelectionRef(view))) {
      clearSlot(view.slot.slotKey)
      return
    }

    const applicationId = input.applicationId.value.trim()
    const slotKey = view.slot.slotKey
    const identity = requestIdentity(applicationId, slotKey, selectedRef)
    const generation = (generationBySlot.get(slotKey) ?? 0) + 1
    generationBySlot.set(slotKey, generation)
    stateBySlot.value = {
      ...stateBySlot.value,
      [slotKey]: { status: 'PENDING', identity, preview: null, error: null },
    }

    try {
      const preview = await input.fetchPreview(applicationId, slotKey, selectedRef)
      if (
        generationBySlot.get(slotKey) !== generation
        || requestIdentity(
          preview.applicationId,
          preview.slotKey,
          preview.executionResourceRef,
        ) !== identity
      ) {
        return
      }
      stateBySlot.value = {
        ...stateBySlot.value,
        [slotKey]: {
          status: preview.status === 'RESOLVED' ? 'RESOLVED' : 'INVALID',
          identity,
          preview,
          error: preview.issues[0]?.message ?? null,
        },
      }
    } catch (error) {
      if (generationBySlot.get(slotKey) !== generation) return
      stateBySlot.value = {
        ...stateBySlot.value,
        [slotKey]: {
          status: 'INVALID',
          identity,
          preview: null,
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  return {
    stateBySlot,
    clearAll,
    clearSlot,
    requestForSelection,
  }
}
