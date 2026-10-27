import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { ModelRoutingReasonCode, ModelRoutingStatus } from '~/types/modelRouting'
import { routerProblem } from '../modelRoutingPresentation'

/** autobyteus-32 supplement § 4: the problem line words each reason code the server gives (CR-002: signed out ≠ missing). */
const t = (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key as never, params)
const status = (reasonCode: ModelRoutingReasonCode, reasonParams: Record<string, string | null> = {}, reasonText: string | null = null): ModelRoutingStatus => ({
  enabled: true, active: false, routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol' }, reasonCode, reasonParams, reasonText, agentRunId: null,
})

describe('routerProblem (the page\'s problem line)', () => {
  beforeEach(async () => { await localizationRuntime.setPreference('en') })
  afterEach(async () => { await localizationRuntime.setPreference('en') })

  it('SIGNED_OUT says the runtime is signed out and where to sign in, not that it is missing', async () => {
    expect(routerProblem(status('SIGNED_OUT', { runtime: 'codex_app_server' }), t, 'en')).toBe('Codex App Server is signed out. Sign in under Agent Runtimes.')
    await localizationRuntime.setPreference('zh-CN')
    expect(routerProblem(status('SIGNED_OUT', { runtime: 'codex_app_server' }), t, 'zh-CN')).toBe('Codex App Server 已退出登录。请在“智能体运行时”中登录。')
  })

  it('every other code keeps its own text', () => {
    expect(routerProblem(status('RUNTIME_UNAVAILABLE', { runtime: 'codex_app_server' }), t, 'en')).toBe('Codex App Server is not available on this node.')
    expect(routerProblem(status('ROUTER_NOT_SET'), t, 'en')).toBe('choose a runtime and model for the router.')
    expect(routerProblem(status('MODEL_NOT_OFFERED', { runtime: 'codex_app_server', model: 'gpt-sol' }), t, 'en')).toBe('Codex App Server no longer offers gpt-sol.')
    expect(routerProblem(status('MODEL_BLOCKED', { runtime: 'codex_app_server', model: 'gpt-sol', limit: 'weekly' }), t, 'en')).toBe('gpt-sol Codex is blocked (weekly).')
    expect(routerProblem(status('REPORT_UNREADABLE', { runtime: 'codex_app_server' }, 'timed out'), t, 'en')).toBe('Codex App Server could not be read: timed out')
  })

  it('autobyteus-313 AC-004: a runtime on its own has the app\'s full name, a model is named as the model menu names it', async () => {
    const label = (runtimeKind: string, id: string) => (runtimeKind === 'claude_agent_sdk' && id === 'claude-sonnet-5-5' ? 'claude-sonnet-5-5 (1M)' : id)
    const blocked = status('MODEL_BLOCKED', { runtime: 'claude_agent_sdk', model: 'claude-sonnet-5-5', limit: '5-hour' })
    expect(routerProblem(blocked, t, 'en', label)).toBe('claude-sonnet-5-5 (1M) Claude SDK is blocked (5-hour).')
    expect(routerProblem(status('MODEL_NOT_OFFERED', { runtime: 'claude_agent_sdk', model: 'claude-sonnet-5-5' }), t, 'en', label))
      .toBe('Claude Agent SDK no longer offers claude-sonnet-5-5 (1M).')
    await localizationRuntime.setPreference('zh-CN')
    expect(routerProblem(blocked, t, 'zh-CN', label)).toBe('claude-sonnet-5-5 (1M) Claude SDK 已被限制（5-hour）。')
  })

  it('nothing while off or active', () => {
    expect(routerProblem({ ...status('SIGNED_OUT'), enabled: false }, t, 'en')).toBe('')
    expect(routerProblem({ ...status('SIGNED_OUT'), active: true }, t, 'en')).toBe('')
  })
})
