import { describe, expect, it } from 'vitest'
import en from '~/localization/messages/en/modelRoutingSettings'
import zh from '~/localization/messages/zh-CN/modelRoutingSettings'
import type { ModelRoutingReasonCode, ModelRoutingStatus } from '~/types/modelRouting'
import { routerProblem } from '../modelRoutingPresentation'

/** autobyteus-32 supplement § 4: the problem line words each reason code the server gives (CR-002: signed out ≠ missing). */
const tOf = (messages: Record<string, string>) => (key: string, params: Record<string, unknown> = {}) =>
  (messages[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''))
const status = (reasonCode: ModelRoutingReasonCode, reasonParams: Record<string, string | null> = {}, reasonText: string | null = null): ModelRoutingStatus => ({
  enabled: true, active: false, routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol' }, reasonCode, reasonParams, reasonText, agentRunId: null,
})

describe('routerProblem (the page\'s problem line)', () => {
  const t = tOf(en as Record<string, string>)

  it('SIGNED_OUT says the runtime is signed out and where to sign in, not that it is missing', () => {
    expect(routerProblem(status('SIGNED_OUT', { runtime: 'codex_app_server' }), t, 'en')).toBe('Codex is signed out. Sign in under Agent Runtimes.')
    expect(routerProblem(status('SIGNED_OUT', { runtime: 'codex_app_server' }), tOf(zh as Record<string, string>), 'zh-CN')).toBe('Codex 已退出登录。请在“智能体运行时”中登录。')
  })

  it('every other code keeps its own text', () => {
    expect(routerProblem(status('RUNTIME_UNAVAILABLE', { runtime: 'codex_app_server' }), t, 'en')).toBe('Codex is not available on this node.')
    expect(routerProblem(status('ROUTER_NOT_SET'), t, 'en')).toBe('choose a runtime and model for the router.')
    expect(routerProblem(status('MODEL_NOT_OFFERED', { runtime: 'codex_app_server', model: 'gpt-sol' }), t, 'en')).toBe('Codex no longer offers gpt-sol.')
    expect(routerProblem(status('MODEL_BLOCKED', { runtime: 'codex_app_server', model: 'gpt-sol', limit: 'weekly' }), t, 'en')).toBe('Codex · gpt-sol is blocked (weekly).')
    expect(routerProblem(status('REPORT_UNREADABLE', { runtime: 'codex_app_server' }, 'timed out'), t, 'en')).toBe('Codex could not be read: timed out')
  })

  it('nothing while off or active', () => {
    expect(routerProblem({ ...status('SIGNED_OUT'), enabled: false }, t, 'en')).toBe('')
    expect(routerProblem({ ...status('SIGNED_OUT'), active: true }, t, 'en')).toBe('')
  })
})
