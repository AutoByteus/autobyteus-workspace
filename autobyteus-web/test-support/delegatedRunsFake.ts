import { vi } from 'vitest'

type Subject = Readonly<{ kind: 'agent' | 'team_member'; agentRunId: string; teamRunId?: string; memberAddress?: string }>

/**
 * A fake of the delegated runs' owner (autobyteus-461 rule 2) for specs of a delegator's view: it records the opens, and
 * a run is open once its context is set here (or every run, with `openAll`). Use it with
 * `vi.mock('~/stores/delegatedRunsStore', async () => ({ useDelegatedRunsStore: (await import('~/test-support/delegatedRunsFake')).fakeDelegatedRunsStore }))`.
 */
export const ownRuns = {
  ensureOpen: vi.fn((_subject: Subject) => undefined),
  send: vi.fn(async () => undefined),
  stop: vi.fn(async () => true),
  contexts: new Map<string, unknown>(),
  openAll: false,
  /** With `openAll`: the context a run opens with (a spec may give the view's own context object for it). */
  contextOf: null as ((agentRunId: string) => unknown) | null,
  reset() { this.ensureOpen.mockClear(); this.send.mockClear(); this.stop.mockClear(); this.contexts.clear(); this.openAll = false; this.contextOf = null },
}

export const fakeDelegatedRunsStore = () => ({
  ensureOpen: ownRuns.ensureOpen,
  errorFor: () => null,
  stop: ownRuns.stop,
  bindingOf: (subject: Subject) => {
    const context = ownRuns.contexts.get(subject.agentRunId)
      ?? (ownRuns.openAll ? ownRuns.contextOf?.(subject.agentRunId) ?? { own: subject.agentRunId } : null)
    if (!context) return null
    return {
      context,
      workspaceRootPath: '/own-ws',
      browse: subject.kind === 'agent' ? { kind: 'run', runId: subject.agentRunId }
        : { kind: 'teamMember', teamRunId: subject.teamRunId, memberAddress: subject.memberAddress, agentRunId: subject.agentRunId },
      interaction: { send: ownRuns.send, interrupt: vi.fn(async () => ({ kind: 'accepted' as const })), decideTool: vi.fn(async () => undefined) },
    }
  },
})
