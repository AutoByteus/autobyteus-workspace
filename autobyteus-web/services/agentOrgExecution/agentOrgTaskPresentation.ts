import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import type { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress'
import type {
  CollaborationTaskParticipantLink,
  DelegatedTaskDirection,
  DelegatedTaskEntry,
  DelegatedTaskLifecycleItem,
  DelegatedTaskParticipant,
} from '~/types/workspace/collaborationTaskPresentation'
import { projectAgentOrgReference } from './agentOrgReferenceProjection'

type TaskRecord = AgentOrgExecutionViewDto['task_records']['records'][number]

const agentLink = (agent: Readonly<{ agentRunId: string; address: string }>): CollaborationTaskParticipantLink => ({
  agentRunId: agent.agentRunId, address: agent.address, label: memberAddressBasename(agent.address),
})
const namedAgent = (link: CollaborationTaskParticipantLink): DelegatedTaskParticipant => ({
  kind: 'named', label: link.label, targetKind: 'agent', link,
})
const directed = (from: DelegatedTaskParticipant, to: DelegatedTaskParticipant): DelegatedTaskDirection => ({
  kind: 'directed',
  from,
  to,
})
const displayStatus = (task: TaskRecord): DelegatedTaskEntry['displayStatus'] => {
  if (task.status === 'active') {
    const latest = task.updates.at(-1)
    return latest && 'decision' in latest && latest.decision === 'request_revision'
      ? 'revision_requested'
      : 'in_progress'
  }
  return task.status
}

const lifecycle = (
  task: TaskRecord,
  delegator: DelegatedTaskParticipant,
  recipient: DelegatedTaskParticipant,
): readonly [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]] => {
  const assignment = directed(delegator, recipient)
  const response = directed(recipient, delegator)
  const items: DelegatedTaskLifecycleItem[] = [{
    kind: 'assignment',
    itemKey: `task:${task.taskId}:assignment`,
    createdAt: task.createdAt,
    content: task.description,
    direction: assignment,
    referenceFiles: task.referenceFiles.map((filePath) =>
      projectAgentOrgReference(task.taskId, filePath, task.createdAt)),
  }]
  const ordinals = new Map<string, number>()
  let ordinal = 0
  let revisionPending = false
  for (const update of task.updates) {
    if ('submissionId' in update) {
      ordinal += 1
      ordinals.set(update.submissionId, ordinal)
      items.push({
        kind: 'submission',
        itemKey: `task:${task.taskId}:submission:${update.submissionId}`,
        createdAt: update.createdAt,
        content: update.message,
        direction: response,
        referenceFiles: update.referenceFiles.map((filePath) =>
          projectAgentOrgReference(update.submissionId, filePath, update.createdAt)),
        resultOrdinal: ordinal,
        revised: revisionPending,
      })
      revisionPending = false
      continue
    }
    if ('reviewId' in update) {
      const reviewedResultOrdinal = ordinals.get(update.reviewedSubmissionId)
      if (reviewedResultOrdinal === undefined) throw new Error(`Unknown reviewed submission '${update.reviewedSubmissionId}'.`)
      if (update.decision === 'request_revision') {
        if (!update.comment) throw new Error(`Revision '${update.reviewId}' has no recorded comment.`)
        items.push({
          kind: 'review',
          decision: 'request_revision',
          itemKey: `task:${task.taskId}:review:${update.reviewId}`,
          createdAt: update.createdAt,
          content: update.comment,
          direction: assignment,
          referenceFiles: update.referenceFiles.map((filePath) =>
            projectAgentOrgReference(update.reviewId, filePath, update.createdAt)),
          reviewedResultOrdinal,
        })
        revisionPending = true
      } else {
        items.push({
          kind: 'review',
          decision: 'accept',
          itemKey: `task:${task.taskId}:review:${update.reviewId}`,
          createdAt: update.createdAt,
          content: update.comment,
          direction: assignment,
          referenceFiles: update.referenceFiles.map((filePath) =>
            projectAgentOrgReference(update.reviewId, filePath, update.createdAt)),
          reviewedResultOrdinal,
        })
        revisionPending = false
      }
      continue
    }
    items.push({
      kind: 'interruption',
      itemKey: `task:${task.taskId}:interruption:${update.interruptionId}`,
      createdAt: update.createdAt,
      content: update.reason,
      direction: { kind: 'system', assignment: { from: delegator, to: recipient } },
      referenceFiles: [],
    })
  }
  return items as [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]]
}

export const projectAgentOrgTasks = (input: Readonly<{
  orgRunId: string
  view: AgentOrgExecutionViewDto
  index: AgentOrgExecutionViewIndex
  focusedAgentRunId: string
}>): readonly DelegatedTaskEntry[] => {
  return input.view.task_records.records.flatMap((task): DelegatedTaskEntry[] => {
    const targetAgentRunId = 'agentRunId' in task.taskExecution ? task.taskExecution.agentRunId : null
    if (!input.index.isRelevant(task, input.focusedAgentRunId)) return []
    const delegator = namedAgent(agentLink(input.index.requireAgent(task.delegatorAgentRunId)))
    const recipient: DelegatedTaskParticipant = 'agentRunId' in task.taskExecution
      ? namedAgent(agentLink(input.index.requireAgent(task.taskExecution.agentRunId)))
      : { kind: 'named', label: memberAddressBasename(task.recipientAddress), targetKind: 'task_team',
        teamRunId: task.taskExecution.teamRunId, participants: input.index.taskParticipants(task).map(agentLink) }
    const runId = targetAgentRunId
      ?? ('teamRunId' in task.taskExecution ? task.taskExecution.teamRunId : '')
    if (!runId) return []
    return [{
      kind: targetAgentRunId ? 'task_agent' : 'task_team',
      entryKey: `task:${task.taskId}`,
      root: { kind: 'agent_org', runId: input.orgRunId },
      taskId: task.taskId,
      runId,
      displayStatus: displayStatus(task),
      lastActivityAt: task.updates.at(-1)?.createdAt ?? task.createdAt,
      lifecycleItems: lifecycle(task, delegator, recipient),
    }]
  })
}
