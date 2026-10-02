import { describe, expect, it } from 'vitest'
import {
  autoExecuteForNewRuntimeSelection,
  effectiveAutoExecuteTools,
  isAutoApproveLockedForRuntime,
  withNewRuntimeOverridePolicy,
} from '../agentRunRuntimeDraftPolicy'

describe('AGY auto-approve lock', () => {
  it('locks auto-approve only for Antigravity', () => {
    expect(isAutoApproveLockedForRuntime('antigravity_cli')).toBe(true)
    for (const runtimeKind of ['autobyteus', 'codex_app_server', 'claude_agent_sdk', '', null, undefined])
      expect(isAutoApproveLockedForRuntime(runtimeKind)).toBe(false)
  })

  it('shows and submits AGY auto-approve on regardless of the stored value, and other runtimes as stored', () => {
    expect(effectiveAutoExecuteTools('antigravity_cli', false)).toBe(true)
    expect(effectiveAutoExecuteTools('antigravity_cli', true)).toBe(true)
    expect(effectiveAutoExecuteTools('codex_app_server', false)).toBe(false)
    expect(effectiveAutoExecuteTools('codex_app_server', true)).toBe(true)
  })
})

describe('AGY editable launch defaults', () => {
  it('defaults a newly selected AGY runtime on without changing other runtimes', () => {
    expect(autoExecuteForNewRuntimeSelection('antigravity_cli', false)).toBe(true)
    expect(autoExecuteForNewRuntimeSelection('codex_app_server', false)).toBe(false)
    expect(autoExecuteForNewRuntimeSelection('claude_agent_sdk', true)).toBe(true)
  })

  it('defaults only new AGY overrides, preserving explicit off and saved edits', () => {
    expect(withNewRuntimeOverridePolicy(null, { runtimeKind: 'antigravity_cli', autoExecuteTools: false }))
      .toEqual({ runtimeKind: 'antigravity_cli', autoExecuteTools: true })
    expect(withNewRuntimeOverridePolicy({ runtimeKind: 'antigravity_cli', autoExecuteTools: false },
      { runtimeKind: 'antigravity_cli', autoExecuteTools: false }))
      .toEqual({ runtimeKind: 'antigravity_cli', autoExecuteTools: false })
    expect(withNewRuntimeOverridePolicy(null, { runtimeKind: 'codex_app_server', autoExecuteTools: false }))
      .toEqual({ runtimeKind: 'codex_app_server', autoExecuteTools: false })
  })
})
