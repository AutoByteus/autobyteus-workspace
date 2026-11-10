// Reproduction (API/E2E, autobyteus-9, case API-14): a saved run's (runtime-locked) model menu loses its options when the
// runtime's list cannot be read. The server does not throw for that: `RunModelSelectionService.listOptions*` answers
// `unavailableReason` with no replacements, `loadExistingRunModelOptions` maps it to a `ready` state, and `reloadModelOptions`
// treats any answer as a success, so the menu reads "No models available", the saved model is shown as "No longer offered" and
// no error/Retry is shown (REQ-011, QR-001: a failed refresh keeps the last list and shows the error with Retry).
// To run: copy to autobyteus-web/stores/__tests__/existingRunModelOptionsActions.unreadable.spec.ts, then
//   NUXT_TEST=true corepack pnpm -C autobyteus-web exec vitest run stores/__tests__/existingRunModelOptionsActions.unreadable.spec.ts
// Expected today: the first case FAILS (`expected true to be false`); the fix turns it green. Real-stack reproduction of the same
// defect: `node tickets/in-progress/model-settings-reality/probes/real-stack/model-list-journeys-probe.mjs --cases API-14 ...` (API-14).
import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ loadExistingRunModelOptions: vi.fn() }))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => client)
vi.mock('~/services/runConfigEditing/existingAgentOrgWorkspaceDraft', () => ({ existingAgentOrgWorkspacesValid: vi.fn(() => true) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindingRevision: 1 }) }))

import { existingRunModelOptionsActions } from '../existingRunModelOptionsActions'

const ready = (replacements: string[]) => ({ status: 'ready', options: { currentModelIdentifier: 'haiku', currentModel: null, unavailableReason: null,
  replacements: replacements.map((llmModelIdentifier) => ({ llmModelIdentifier })) } })
// What the server answers while the runtime's CLI cannot list its models (run-model-selection-service.ts `optionsWithEvidence`).
const unreadable = { status: 'ready', options: { currentModelIdentifier: 'haiku', currentModel: null, replacements: [],
  unavailableReason: 'Runtime model catalog is unavailable. Refresh this run to retry; saved model identity remains visible.' } }

const host = () => {
  const state: any = { draft: { kind: 'team', teamRunId: 'team' }, optionsRequestId: 0, modelOptionsByAddress: { '/': ready(['sonnet', 'opus']) }, deriveSchemaStates: vi.fn() }
  state.reloadModelOptions = existingRunModelOptionsActions.reloadModelOptions
  return state
}

beforeEach(() => client.loadExistingRunModelOptions.mockReset())

describe('reloadModelOptions when the runtime list cannot be read (the server answers, it does not throw)', () => {
  it('keeps the options that were shown and answers false, so the menu shows its error with Retry', async () => {
    const store = host()
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': unreadable })
    await expect(store.reloadModelOptions()).resolves.toBe(false)
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet', 'opus']))
  })

  it('still shows an unavailable state when nothing was loaded before (the first read of an edit)', async () => {
    const store = host()
    store.modelOptionsByAddress = { '/': { status: 'loading', options: null } }
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': unreadable })
    await store.reloadModelOptions()
    expect(store.modelOptionsByAddress['/'].options.unavailableReason).toContain('unavailable')
  })
})
