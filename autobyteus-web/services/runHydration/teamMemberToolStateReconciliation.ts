import type { Conversation } from '~/types/conversation';
import type { RunActivity, ToolActivity } from '~/types/activity/RunActivity';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';
import { isProjectableToolSegment, type ProjectableToolSegment } from '~/services/agentStreaming/handlers/toolActivityProjection';
import { isTerminalToolInvocationStatus } from '~/utils/toolInvocationStatus';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { enforceRecentConversationWindow } from '~/services/eventMonitor/recentEventMonitorWindow';
import { buildActivitiesFromProjection } from './runProjectionActivityHydration';

// Model data may be Vue proxies. Copy plain values without invoking handlers or
// structuredClone on proxies; candidates must never alias mutable live state.
const copy = <T>(value: T): T => {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(copy) as T;
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, copy(item)]),
  ) as T;
  return value;
};
const stable = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return JSON.stringify(Object.keys(value).sort().map(
    key => [key, stable((value as Record<string, unknown>)[key])],
  ));
  return JSON.stringify(value) ?? 'undefined';
};
const advanced = (status: ToolInvocationStatus) => status !== 'parsing' && status !== 'parsed';
type Evidence = { segment: ProjectableToolSegment; timestamp: Date; activity?: ToolActivity };

const segmentFromActivity = (activity: ToolActivity): ProjectableToolSegment => {
  const base = { invocationId: activity.invocationId, toolName: activity.toolName,
    arguments: activity.arguments, status: activity.status, approvalTarget: activity.approvalTarget,
    logs: activity.logs, result: activity.result, error: activity.error };
  const args = activity.arguments;
  if (activity.type === 'terminal_command') return { ...base, type: 'terminal_command', command: String(args.command ?? ''), description: '' };
  if (activity.type === 'write_file' || activity.type === 'edit_file') return {
    ...base, type: activity.type, path: String(args.path ?? ''), language: '',
    originalContent: String(activity.type === 'write_file' ? args.content ?? '' : args.patch ?? args.diff ?? ''),
  };
  return { ...base, type: 'tool_call' };
};

const collect = (conversation: Conversation, activities: readonly RunActivity[]): Map<string, Evidence[]> => {
  const entries = new Map<string, Evidence[]>();
  const segments = new Map<string, string>();
  const activityKeys = new Map<string, string>();
  const add = (entry: Evidence, keys: Map<string, string>, identity: unknown) => {
    const id = entry.segment.invocationId;
    if (!id.trim()) throw new Error('Tool reconciliation requires an exact invocation.');
    const fingerprint = stable(identity);
    if (keys.has(id)) {
      if (keys.get(id) !== fingerprint) throw new Error(`Ambiguous duplicate tool invocation '${id}'.`);
      return;
    }
    keys.set(id, fingerprint);
    entries.set(id, [...(entries.get(id) ?? []), entry]);
  };
  for (const message of conversation.messages) {
    if (message.type !== 'ai') continue;
    for (const segment of message.segments) if (isProjectableToolSegment(segment)) {
      add({ segment, timestamp: message.timestamp }, segments, segment);
    }
  }
  for (const activity of activities) if (activity.kind === 'tool') {
    add({ segment: segmentFromActivity(activity), timestamp: activity.timestamp, activity }, activityKeys, activity);
  }
  return entries;
};

const decide = (id: string, current: Evidence[], projected: Evidence[]): Evidence => {
  const all = [...current, ...projected];
  const names = new Set(all.map(e => e.segment.toolName).filter(name => name !== 'tool' && !isPlaceholderToolName(name)));
  if (names.size > 1) throw new Error(`Conflicting tool identity for '${id}'.`);
  if (new Set(all.map(e => e.segment.type).filter(type => type !== 'tool_call')).size > 1) {
    throw new Error(`Conflicting concrete tool type for '${id}'.`);
  }
  const terminals = all.filter(e => isTerminalToolInvocationStatus(e.segment.status));
  if (new Set(terminals.map(e => e.segment.status)).size > 1) {
    throw new Error(`Conflicting terminal tool outcomes for '${id}'.`);
  }
  // No max-rank policy: a concrete live executing -> awaiting transition is valid.
  const winner = terminals[0] ?? current.find(e => advanced(e.segment.status)) ?? projected[0]!;
  const sameOutcome = all.filter(e => e.segment.status === winner.segment.status);
  const selected = copy(winner);
  // Terminal evidence wins lifecycle, not the live call's concrete args/type/metadata.
  if (current.length) selected.segment = { ...copy(current[0]!.segment),
    status: winner.segment.status, result: copy(winner.segment.result), error: winner.segment.error };
  const routing = all.find(e => e.segment.approvalTarget)?.segment.approvalTarget;
  if (selected.segment.approvalTarget == null && routing) selected.segment.approvalTarget = copy(routing);
  selected.segment.toolName = [...names][0] ?? selected.segment.toolName;
  selected.segment.logs = [...new Set(all.flatMap(e => e.segment.logs))];
  selected.segment.result ??= copy(sameOutcome.find(e => e.segment.result != null)?.segment.result ?? null);
  selected.segment.error ??= sameOutcome.find(e => e.segment.error != null)?.segment.error ?? null;
  return selected;
};

/** Historical content base + actual same-live-run tool evidence, no publication. */
export const reconcileTeamMemberToolState = (input: {
  agentRunId: string;
  currentConversation: Conversation;
  currentActivities: readonly RunActivity[];
  projectedConversation: Conversation;
  projectedActivities: readonly RunActivity[];
}): { conversation: Conversation; activities: RunActivity[] } => {
  if (input.currentConversation.id !== input.agentRunId || input.projectedConversation.id !== input.agentRunId) {
    throw new Error('Tool reconciliation conversation run mismatch.');
  }
  const current = collect(input.currentConversation, input.currentActivities);
  const projected = collect(input.projectedConversation, input.projectedActivities);
  const ids = new Set([...projected.keys(), ...[...current].filter(([, entries]) => entries.some(e => advanced(e.segment.status))).map(([id]) => id)]);
  const decisions = new Map<string, Evidence>();
  for (const id of ids) {
    const retained = (current.get(id) ?? []).filter(e => advanced(e.segment.status));
    const observed = [...retained, ...(projected.get(id) ?? [])];
    for (const entry of observed) {
      if (entry.segment.approvalTarget && entry.segment.approvalTarget.agentRunId !== input.agentRunId) {
        throw new Error(`Foreign tool approval target for '${id}'.`);
      }
    }
    decisions.set(id, decide(id, retained, projected.get(id) ?? []));
  }
  const conversation = copy(input.projectedConversation);
  const emitted = new Set<string>();
  conversation.messages = conversation.messages.flatMap<Conversation['messages'][number]>(message => {
    if (message.type !== 'ai') return [message];
    message.segments = message.segments.flatMap<AIResponseSegment>(segment => {
      if (!isProjectableToolSegment(segment)) return [segment];
      if (emitted.has(segment.invocationId)) return [];
      emitted.add(segment.invocationId);
      return [copy(decisions.get(segment.invocationId)!.segment)];
    });
    return message.segments.length || message.text ? [message] : [];
  });
  for (const [id, chosen] of decisions) if (!emitted.has(id)) {
    conversation.messages.push({ type: 'ai', text: '', isComplete: true,
      timestamp: copy(chosen.timestamp), segments: [copy(chosen.segment)] });
  }
  const activities: RunActivity[] = [];
  const activityEmitted = new Set<string>();
  const toActivity = (id: string): ToolActivity => {
    const chosen = decisions.get(id)!;
    const segment = chosen.segment;
    const descriptive = current.get(id)?.find(e => e.activity)?.activity
      ?? projected.get(id)?.find(e => e.activity)?.activity;
    const built = buildActivitiesFromProjection([{ kind: 'tool', invocationId: id,
      toolName: segment.toolName, type: segment.type, status: segment.status,
      arguments: segment.arguments, logs: segment.logs, result: segment.result, error: segment.error,
      contextText: descriptive?.contextText, ts: chosen.timestamp.getTime() / 1000 }])[0] as ToolActivity;
    return { ...built, approvalTarget: copy(segment.approvalTarget) };
  };
  for (const activity of input.projectedActivities) {
    if (activity.kind !== 'tool') activities.push(copy(activity));
    else if (!activityEmitted.has(activity.invocationId)) {
      activities.push(toActivity(activity.invocationId)); activityEmitted.add(activity.invocationId);
    }
  }
  for (const id of decisions.keys()) if (!activityEmitted.has(id)) activities.push(toActivity(id));
  enforceRecentConversationWindow(conversation);
  return { conversation, activities };
};
