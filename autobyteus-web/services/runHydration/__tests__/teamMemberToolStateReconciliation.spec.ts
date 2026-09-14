import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import type { Conversation } from '~/types/conversation'
import type { ToolActivity } from '~/types/activity/RunActivity'
import type { ToolCallSegment, ToolInvocationStatus } from '~/types/segments'
import { reconcileTeamMemberToolState as reconcile } from '../teamMemberToolStateReconciliation'
const tool = (status: ToolInvocationStatus, extra = {}): ToolCallSegment => ({ type: 'tool_call', invocationId: 'inv', toolName: 'submit_task_result',
  status, arguments: { message: 'actual' }, logs: ['live log'], result: null, error: null, ...extra })
const conversation = (segment?: ToolCallSegment): Conversation => ({ id: 'task', createdAt: '', updatedAt: '', messages: [
  { type: 'user', text: 'history text', timestamp: new Date(1000), contextFilePaths: [{ kind: 'workspace_path', id: 'file', locator: '/note', displayName: 'note', type: 'Text' }] },
  ...(segment ? [{ type: 'ai' as const, text: '', segments: [segment], timestamp: new Date(2000), isComplete: true }] : []),
] })
const activity = (segment: ToolCallSegment): ToolActivity => ({ ...segment, kind: 'tool', activityId: 'inv', contextText: 'description', timestamp: new Date(2000) })
const input = (current: ToolCallSegment, projected = tool('parsed', { arguments: { message: 'old' }, logs: [] })) => ({ agentRunId: 'task',
  currentConversation: conversation(current), currentActivities: [activity(current)], projectedConversation: conversation(projected), projectedActivities: [activity(projected)] })
const selected = (result: ReturnType<typeof reconcile>) => (result.conversation.messages.find(m => m.type === 'ai') as any).segments[0]

it.each(['awaiting-approval', 'approved', 'executing', 'success', 'error', 'denied', 'interrupted'] as ToolInvocationStatus[])('TASK-03: actual %s survives parsed history in both surfaces', status => {
  const current = tool(status, { result: status === 'success' ? { ok: true } : null, error: status === 'error' ? 'failure' : null })
  const result = reconcile(input(current))
  expect(selected(result)).toEqual(current)
  expect(result.activities[0]).toMatchObject({ status, arguments: current.arguments, result: current.result, error: current.error })
  expect(result.conversation.messages[0]).toEqual(conversation().messages[0])
})
it('TASK-03: history terminal wins without losing actual live args, specialized type or routing metadata', () => {
  const current = { ...tool('awaiting-approval'), type: 'terminal_command', command: 'actual command', description: 'safe', toolName: 'run_bash',
    approvalTarget: { agentRunId: 'task' }, _streamSegmentIdentity: { turnId: 'turn', id: 'seg', segmentType: 'run_bash', presentationComplete: false } } as any
  const projected = tool('success', { toolName: 'run_bash', result: 'done' })
  const result = reconcile(input(current, projected))
  expect(selected(result)).toMatchObject({ ...current, status: 'success', result: 'done' })
  expect(result.activities[0]).toMatchObject({ type: 'terminal_command', status: 'success', result: 'done', arguments: current.arguments })
})
it.each(['conversation', 'activity'])('TASK-02: retains current %s-only advanced evidence missing from projection without copying live text', surface => {
  const data = input(tool('awaiting-approval'))
  data.projectedConversation = conversation(); data.projectedActivities = []
  if (surface === 'activity') data.currentConversation = conversation()
  else data.currentActivities = []
  const result = reconcile(data)
  expect(result.conversation.messages.filter(m => m.type === 'user')).toHaveLength(1)
  expect(selected(result).status).toBe('awaiting-approval')
  expect(result.activities).toHaveLength(1)
})
it('TASK-03: late current awaiting remains pending even when history inferred executing; parsed alone cannot invent permission', () => {
  expect(selected(reconcile(input(tool('awaiting-approval'), tool('executing')))).status).toBe('awaiting-approval')
  expect(selected(reconcile(input(tool('parsed')))).status).toBe('parsed')
})
it('TASK-04: prepares detached proxy-safe candidates and preserves all actual metadata without touching sources', () => {
  const data = reactive(input(tool('awaiting-approval', { approvalTarget: null })))
  const before = JSON.stringify(data)
  const result = reconcile(data)
  selected(result).arguments.message = 'mutated candidate'
  expect(JSON.stringify(data)).toBe(before)
})
it.each(['terminal', 'tool', 'target', 'run', 'duplicate'])('TASK-04: rejects conflicting %s evidence before publication', conflict => {
  const data = input(tool('success'))
  if (conflict === 'terminal') data.projectedActivities[0]!.status = 'denied'
  if (conflict === 'tool') data.projectedActivities[0]!.toolName = 'different_tool'
  if (conflict === 'target') data.currentActivities[0]!.approvalTarget = { agentRunId: 'foreign' }
  if (conflict === 'run') data.projectedConversation.id = 'foreign'
  if (conflict === 'duplicate') (data.projectedConversation.messages[1] as any).segments.push(tool('parsed', { arguments: { conflicting: true } }))
  const before = JSON.stringify(data)
  expect(() => reconcile(data)).toThrow()
  expect(JSON.stringify(data)).toBe(before)
})
it('TASK-04: equivalent duplicates normalize to one exact tool and Activity; projected placeholder name is completed', () => {
  const data = input(tool('awaiting-approval'), tool('parsed', { toolName: 'tool' }))
  ;(data.projectedConversation.messages[1] as any).segments.push({ ...(data.projectedConversation.messages[1] as any).segments[0] })
  data.projectedActivities.push({ ...data.projectedActivities[0]! })
  const result = reconcile(data)
  expect((result.conversation.messages[1] as any).segments).toHaveLength(1)
  expect(result.activities).toHaveLength(1)
  expect(selected(result).toolName).toBe('submit_task_result')
})
it('TASK-04: actual optional routing retained only in Activity fills the copied invocation', () => {
  const data = input(tool('awaiting-approval', { approvalTarget: null }))
  data.currentActivities = [{ ...data.currentActivities[0]!, approvalTarget: { agentRunId: 'task' } }]
  const result = reconcile(data)
  expect(selected(result).approvalTarget).toEqual({ agentRunId: 'task' })
  expect((result.activities[0] as ToolActivity).approvalTarget).toEqual({ agentRunId: 'task' })
})
