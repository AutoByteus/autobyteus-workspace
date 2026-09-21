import { describe, expect, it } from 'vitest'
import {
  agentOrgPlacementLaunchPatchesEqual,
  canonicalizeAgentOrgPlacementLaunchPatch,
  toAgentOrgPlacementLaunchConfiguration,
} from '../agentOrgLaunchPatch'

describe('agentOrgLaunchPatch', () => {
  it('preserves ordinary omission as inheritance', () => {
    expect(canonicalizeAgentOrgPlacementLaunchPatch({ autoExecuteTools: false })).toEqual({
      autoExecuteTools: false,
    })
    expect(toAgentOrgPlacementLaunchConfiguration({ autoExecuteTools: false })).toEqual({
      autoExecuteTools: false,
    })
  })

  it.each([
    [{ runtimeKind: 'codex_app_server' }, { runtimeKind: 'codex_app_server', llmConfig: null }],
    [{ llmModelIdentifier: 'gpt-next' }, { llmModelIdentifier: 'gpt-next', llmConfig: null }],
    [
      { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek', autoExecuteTools: true },
      { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek', autoExecuteTools: true, llmConfig: null },
    ],
  ])('materializes the dependent model-config clear for %o', (input, expected) => {
    expect(canonicalizeAgentOrgPlacementLaunchPatch(input)).toEqual(expected)
  })

  it('preserves explicit null and deep-clones sorted explicit configuration', () => {
    expect(canonicalizeAgentOrgPlacementLaunchPatch({ llmConfig: null })).toEqual({ llmConfig: null })

    const config = { z: [{ b: 2, a: 1 }], a: { value: true } }
    const canonical = canonicalizeAgentOrgPlacementLaunchPatch({
      runtimeKind: 'autobyteus',
      llmConfig: config,
    })
    expect(canonical).toEqual({
      runtimeKind: 'autobyteus',
      llmConfig: { a: { value: true }, z: [{ a: 1, b: 2 }] },
    })
    config.z[0]!.a = 99
    expect(canonical.llmConfig).toEqual({ a: { value: true }, z: [{ a: 1, b: 2 }] })
  })

  it('is idempotent and compares property-order-independent canonical values', () => {
    const once = canonicalizeAgentOrgPlacementLaunchPatch({
      llmModelIdentifier: 'gpt-next',
      runtimeKind: 'codex_app_server',
      llmConfig: { z: 1, a: 2 },
    })
    const twice = canonicalizeAgentOrgPlacementLaunchPatch(once)
    expect(twice).toEqual(once)
    expect(agentOrgPlacementLaunchPatchesEqual(
      { runtimeKind: 'codex_app_server', llmConfig: { z: 1, a: 2 } },
      { llmConfig: { a: 2, z: 1 }, runtimeKind: 'codex_app_server' },
    )).toBe(true)
    expect(agentOrgPlacementLaunchPatchesEqual(
      { runtimeKind: 'codex_app_server' },
      { runtimeKind: 'codex_app_server', llmConfig: null },
    )).toBe(false)
  })

  it('maps only owned wire fields and an exact Team workspace path', () => {
    expect(toAgentOrgPlacementLaunchConfiguration({
      runtimeKind: 'codex_app_server',
      autoExecuteTools: false,
      workspace: {
        workspaceId: 'ignored-by-wire-mapper',
        workspaceMetadata: {
          workspaceId: 'ignored-by-wire-mapper',
          workspaceRootPath: '/catalog/path',
          displayName: 'Catalog Workspace',
          kind: 'filesystem',
        },
      },
    }, ' /exact/team/path ')).toEqual({
      runtimeKind: 'codex_app_server',
      llmConfig: null,
      autoExecuteTools: false,
      workspaceRootPath: '/exact/team/path',
    })
  })
})
