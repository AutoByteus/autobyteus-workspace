import type { Conversation } from '~/types/conversation'

/** A collaborator the focused agent tried to bring in, whose delegation started nothing. */
export type CollaboratorAddFailure = Readonly<{
  invocationId: string
  address: string
  name: string
  reason: string
}>

type DelegateResult = Readonly<{ target_agent_run_id: string | null; message?: string }>

const isDelegateTool = (toolName: string): boolean => toolName === 'delegate_task' || toolName.endsWith('__delegate_task')

/** Runtimes report the tool result as an object, a JSON string or text content parts. */
export const parseDelegateTaskResult = (result: unknown): DelegateResult | null => {
  if (typeof result === 'string') {
    try { return parseDelegateTaskResult(JSON.parse(result)) } catch { return null }
  }
  if (Array.isArray(result)) {
    for (const part of result) {
      const text = part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text : null
      const parsed = text ? parseDelegateTaskResult(text) : null
      if (parsed) return parsed
    }
    return null
  }
  if (!result || typeof result !== 'object') return null
  const record = result as Record<string, unknown>
  if ('target_agent_run_id' in record) {
    const id = record.target_agent_run_id
    return Object.freeze({
      target_agent_run_id: typeof id === 'string' && id ? id : null,
      message: typeof record.message === 'string' ? record.message : undefined,
    })
  }
  for (const key of ['structuredContent', 'result', 'content']) {
    if (key in record) {
      const nested = parseDelegateTaskResult(record[key])
      if (nested) return nested
    }
  }
  return null
}

/**
 * The failed adds of the current turn: `delegate_task` calls after the latest user message that
 * target a collaborator of the run and returned no run ID. The next send starts a new turn, so
 * it replaces the notice.
 */
export const deriveCollaboratorAddFailures = (input: Readonly<{
  conversation: Pick<Conversation, 'messages'>
  /** Root-level collaborator entry addresses of the run, with their display names. */
  collaboratorNames: ReadonlyMap<string, string>
}>): CollaboratorAddFailure[] => {
  const messages = input.conversation.messages
  let start = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]!.type === 'user') { start = index + 1; break }
  }
  const failures: CollaboratorAddFailure[] = []
  for (const message of messages.slice(start)) {
    if (message.type !== 'ai') continue
    for (const segment of message.segments ?? []) {
      if (!('toolName' in segment) || !isDelegateTool(segment.toolName)) continue
      const address = typeof segment.arguments?.recipient_address === 'string' ? segment.arguments.recipient_address.trim() : ''
      const name = input.collaboratorNames.get(address)
      if (!name) continue
      const result = parseDelegateTaskResult(segment.result)
      if (!result || result.target_agent_run_id !== null) continue
      failures.push(Object.freeze({ invocationId: segment.invocationId, address, name, reason: result.message?.trim() ?? '' }))
    }
  }
  return failures
}
