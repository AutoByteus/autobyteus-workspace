import type { AgentRunCollaborationViewDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { agentRow, teamRows } from '~/test-support/runTreeFixtures'

export const created = '2026-09-30T00:00:00.000Z'
export const launch = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/ws' }

type MutableView = { -readonly [K in keyof AgentRunCollaborationViewDto]: AgentRunCollaborationViewDto[K] }
/** An agent run's view (autobyteus-461 SR-084): its host only; the runs it delegated are its tree's rows (`agentRootTreeRows`). */
export const agentRootView = (): MutableView => ({
  base_change_sequence: 4, live_sequence_id: 'live-1', last_message_change_sequence: 0,
  is_active: true,
  execution_tree: {
    subjectKind: 'agent', createdAt: created,
    agent: { address: '/research_assistant', agentRunId: 'host-run', agentDefinitionId: 'research-assistant' },
  },
} as MutableView)

/** The host's tree as the server builds it: the host, an Agent it delegated and a Team it delegated with two members. */
export const agentRootTreeRows = (): RunTreeRowDto[] => [
  agentRow('host-run', null, 0, 'research assistant'),
  { ...agentRow('cua-run', 'agent:host-run', 1, 'computer use agent'), address: '/computer_use_agent' },
  ...teamRows('team-run', 'agent:host-run', 1, ['pp-run', 'pb-run'])
    .map((row) => row.kind === 'team' ? { ...row, name: 'product team', address: '/product_team' }
      : { ...row, address: row.openTarget?.agentRunId === 'pp-run' ? '/product_team/prototyper' : '/product_team/bootstrapper',
        name: row.openTarget?.agentRunId === 'pp-run' ? 'prototyper' : 'bootstrapper' }),
]

/** The hub's stored messages (autobyteus-358: the Team tab loads them per participant; the view carries none). */
export const agentRootMessages = Object.freeze([{
  messageId: 'm1', senderAgentRunId: 'cua-run', receiverAgentRunId: 'host-run', content: 'Done, research assistant.',
  messageType: 'direct_message', referenceFiles: [], createdAt: created,
}])
