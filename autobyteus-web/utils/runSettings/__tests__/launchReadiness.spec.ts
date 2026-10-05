import { describe, expect, it } from 'vitest'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import { resolveScopesReadiness, type LaunchReadinessInput } from '../launchReadiness'

const values = (overrides: Partial<RunSettingsValues> = {}): RunSettingsValues => ({
  workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true, ...overrides,
})
const node = (key: string, nodeValues: RunSettingsValues, children: RunMemberNode[] = []): RunMemberNode => ({
  key, kind: children.length ? 'team' : 'agent', name: key, isCoordinator: false, values: nodeValues, parentValues: values(),
  fields: ['model', 'thinking', 'approval'], customized: {}, customizedOptionKeys: [], modelRequired: false, children,
})
const copy = {
  targetUnavailable: 'unavailable',
  runtimeUnavailable: (runtimeKind: string) => `runtime ${runtimeKind}`,
  chooseModel: 'choose a model',
}
const input = (overrides: Partial<LaunchReadinessInput> = {}): LaunchReadinessInput => ({
  targetAvailable: true,
  scopes: { status: 'ready', root: values(), members: [] },
  isRuntimeEnabled: () => true,
  ...overrides,
})

describe('resolveScopesReadiness (DI-004, AC-002)', () => {
  it('is ready when the target exists and every scope has an enabled runtime and a model', () => {
    expect(resolveScopesReadiness(input(), copy)).toEqual({ ready: true })
  })

  it('blocks in order: target unavailable → a disabled runtime → a missing model', () => {
    const everything = input({
      targetAvailable: false,
      scopes: { status: 'ready', root: values({ runtimeKind: 'off', llmModelIdentifier: '' }), members: [] },
      isRuntimeEnabled: (kind) => kind !== 'off',
    })
    expect(resolveScopesReadiness(everything, copy)).toEqual({ ready: false, reason: 'unavailable' })
    expect(resolveScopesReadiness({ ...everything, targetAvailable: true }, copy)).toEqual({ ready: false, reason: 'runtime off' })
    expect(resolveScopesReadiness({ ...everything, targetAvailable: true, isRuntimeEnabled: () => true }, copy))
      .toEqual({ ready: false, reason: 'choose a model' })
  })

  it('checks every effective scope, nested members included', () => {
    const nested = node('/team', values(), [node('/team/writer', values({ runtimeKind: 'claude_agent_sdk' }))])
    const scopes = { status: 'ready' as const, root: values(), members: [nested] }
    expect(resolveScopesReadiness(input({ scopes, isRuntimeEnabled: (kind) => kind !== 'claude_agent_sdk' }), copy))
      .toEqual({ ready: false, reason: 'runtime claude_agent_sdk' })
    const noModel = { ...scopes, members: [node('/team', values(), [node('/team/writer', values({ llmModelIdentifier: '  ' }))])] }
    expect(resolveScopesReadiness(input({ scopes: noModel }), copy)).toEqual({ ready: false, reason: 'choose a model' })
  })

  it('an Org with a blocked topology shows the unavailable reason', () => {
    expect(resolveScopesReadiness(input({ scopes: { status: 'blocked' } }), copy)).toEqual({ ready: false, reason: 'unavailable' })
  })

  it('does not block on runtimes while their availability is unknown', () => {
    const scopes = { status: 'ready' as const, root: values({ runtimeKind: 'off' }), members: [] }
    expect(resolveScopesReadiness(input({ scopes, isRuntimeEnabled: null }), copy)).toEqual({ ready: true })
  })
})
