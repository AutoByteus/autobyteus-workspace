import { describe, expect, it } from 'vitest'
import {
  buildUnavailableInheritedModelMessage,
  hasExplicitMemberLlmConfigOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  resolveEffectiveMemberLlmConfig,
  resolveEffectiveMemberLlmModelIdentifier,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'

describe('teamRunConfigUtils', () => {
  it('treats only property presence as an explicit member llmConfig override', () => {
    expect(hasExplicitMemberLlmConfigOverride(undefined)).toBe(false)
    expect(hasExplicitMemberLlmConfigOverride({})).toBe(false)
    expect(hasExplicitMemberLlmConfigOverride({ llmConfig: null })).toBe(true)
  })

  it('resolves effective member config from explicit override or global fallback', () => {
    expect(resolveEffectiveMemberLlmConfig(
      {},
      { reasoning_effort: 'high' },
    )).toEqual({ reasoning_effort: 'high' })
    expect(resolveEffectiveMemberLlmConfig(
      { llmConfig: null },
      { reasoning_effort: 'high' },
    )).toBeNull()
  })

  it('resolves exact current runtime and model overrides without a metadata reconstruction path', () => {
    const override = {
      runtimeKind: 'claude_agent_sdk' as const,
      llmModelIdentifier: ' claude-sonnet ',
    }
    expect(resolveEffectiveMemberRuntimeKind(override, 'autobyteus')).toBe('claude_agent_sdk')
    expect(resolveEffectiveMemberLlmModelIdentifier(override, 'gpt-5.4')).toBe('claude-sonnet')
    expect(resolveEffectiveMemberRuntimeKind(undefined, 'codex_app_server')).toBe('codex_app_server')
  })

  it('compares nested model configs independent of key order', () => {
    expect(modelConfigsEqual(
      { reasoning: { effort: 'high', tools: { plan: true, search: false } } },
      { reasoning: { tools: { search: false, plan: true }, effort: 'high' } },
    )).toBe(true)
  })

  it('treats explicit null llmConfig as a meaningful member override', () => {
    expect(hasMeaningfulMemberOverride({ llmConfig: null })).toBe(true)
  })

  it('renders the blocking inherited-model mismatch against the effective runtime', () => {
    expect(buildUnavailableInheritedModelMessage({
      globalLlmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'claude_agent_sdk',
      memberName: 'Reviewer',
    })).toBe('Inherited model gpt-5.4 is unavailable for Claude Agent SDK; choose a compatible Reviewer model or reset the runtime override.')
  })
})
