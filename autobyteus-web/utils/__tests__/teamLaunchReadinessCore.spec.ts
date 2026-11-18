import { describe, expect, it } from 'vitest'
import { evaluateTeamLaunchProfileReadiness } from '../teamLaunchReadinessCore'

// BEH-032 (b) of autobyteus-294: a team launch profile member without a runtime is named by its display name in the
// blocking issue, like every other issue (the member input field is `displayName` since 3927e878db).
describe('evaluateTeamLaunchProfileReadiness', () => {
  it('names a member without a runtime by its display name', () => {
    const readiness = evaluateTeamLaunchProfileReadiness({
      defaultRuntimeKind: null,
      defaultLlmModelIdentifier: null,
      memberProfiles: [{ displayName: 'Research Lead', runtimeKind: null, llmModelIdentifier: 'model-a' }],
      runtimeModelCatalogs: {},
      requireModel: true,
    })

    expect(readiness).toEqual({
      canSave: false,
      blockingIssues: [{
        code: 'RUNTIME_REQUIRED',
        displayName: 'Research Lead',
        runtimeKind: '',
        message: 'Research Lead needs a runtime before this team setup can be saved.',
      }],
    })
  })
})
