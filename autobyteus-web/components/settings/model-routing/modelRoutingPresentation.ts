import type { DecisionLaunchSource, ModelRoutingStatus } from '~/types/modelRouting'

type T = (key: any, params?: Record<string, string | number>) => string

/** Runtime display names (the product's words). */
export const RUNTIME_NAMES: Readonly<Record<string, string>> = {
  codex_app_server: 'Codex', claude_agent_sdk: 'Claude', antigravity_cli: 'Antigravity', grok_build: 'Grok', autobyteus: 'AutoByteus',
}
export const runtimeName = (runtimeKind: string): string => RUNTIME_NAMES[runtimeKind] ?? runtimeKind

/** One fixed colour per runtime (UI/UX specification § Visual Language), in Decisions and Overview alike. */
export const RUNTIME_COLORS: Readonly<Record<string, string>> = {
  codex_app_server: '#2a78d6', claude_agent_sdk: '#eb6834', antigravity_cli: '#1baf7a', grok_build: '#e87ba4', autobyteus: '#eda100',
}
export const runtimeColor = (runtimeKind: string): string => RUNTIME_COLORS[runtimeKind] ?? '#64748b'

/** The source bar's colours: the router is the emphasis, defaults quiet, an inherited launch the warm exception. */
export const SOURCE_COLORS: Readonly<Record<DecisionLaunchSource, string>> = {
  model_router: '#1e293b', agent_default: '#94a3b8', team_default: '#cbd5e1', inherited: '#f59e0b',
}

export const SOURCE_KEY: Readonly<Record<DecisionLaunchSource, string>> = {
  model_router: 'settings.modelRouting.source.router',
  agent_default: 'settings.modelRouting.source.agent_default',
  team_default: 'settings.modelRouting.source.team_default',
  inherited: 'settings.modelRouting.source.inherited',
}

export const shortDate = (ms: number, locale: string): string =>
  new Intl.DateTimeFormat(locale || 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))

const clock = (ms: number, locale: string): string =>
  new Intl.DateTimeFormat(locale || 'en', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))

/** "Today, 09:12", "Yesterday, 18:30", "Oct 24, 18:30". */
export const decisionTime = (iso: string, locale: string, t: T, now: number = Date.now()): string => {
  const ms = Date.parse(iso)
  const dayOf = (value: number) => new Date(value).toDateString()
  if (dayOf(ms) === dayOf(now)) return t('settings.modelRouting.time.today', { time: clock(ms, locale) })
  if (dayOf(ms) === dayOf(now - 86_400_000)) return t('settings.modelRouting.time.yesterday', { time: clock(ms, locale) })
  return shortDate(ms, locale)
}

/** The problem line while Model Routing is on but the router cannot answer, from the server's reason code (D6); '' otherwise. */
export const routerProblem = (status: ModelRoutingStatus | null, t: T, locale: string): string => {
  if (!status || !status.enabled || status.active || !status.reasonCode) return ''
  const params = status.reasonParams
  const runtime = runtimeName(params.runtime ?? status.routerLaunch?.runtimeKind ?? '')
  const model = params.model ?? status.routerLaunch?.llmModelIdentifier ?? ''
  switch (status.reasonCode) {
    case 'ROUTER_NOT_SET': return t('settings.modelRouting.problem.notSet')
    case 'MODEL_BLOCKED': return params.until
      ? t('settings.modelRouting.problem.blockedUntil', { runtime, model, time: shortDate(Date.parse(params.until), locale), by: params.limit ?? '' })
      : t('settings.modelRouting.problem.blocked', { runtime, model, by: params.limit ?? '' })
    case 'MODEL_NOT_OFFERED': return t('settings.modelRouting.problem.modelMissing', { runtime, model })
    case 'RUNTIME_UNAVAILABLE': return t('settings.modelRouting.problem.runtimeMissing', { runtime })
    case 'SIGNED_OUT': return t('settings.modelRouting.problem.signedOut', { runtime })
    case 'REPORT_UNREADABLE': return t('settings.modelRouting.problem.unknown', { runtime, reason: status.reasonText ?? '' })
    default: return ''
  }
}

/** The router's own label for the kind of Task ("implementation" → "Implementation"); there is no list to manage. */
export const kindLabel = (kind: string | null, t: T): string => kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : t('settings.modelRouting.kind.none')

/** An address's last segment ("/set/code_reviewer" → "code_reviewer"), as the delegation result names agents. */
export const agentName = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address
