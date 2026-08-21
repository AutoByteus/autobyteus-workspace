import type { SystemInstructionTraceRecord } from 'autobyteus-ts';
import { AgentRunEventType, type AgentRunEvent } from './agent-run-event.js';

export type SystemInstructionsSuppliedPayload = {
  trace_id: string;
  content: string;
  ts: number;
};

export type SystemInstructionsSuppliedEvent = AgentRunEvent & {
  eventType: AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED;
  payload: SystemInstructionsSuppliedPayload;
  statusHint: null;
};

export const buildSystemInstructionsSuppliedEvent = (
  runId: string,
  trace: SystemInstructionTraceRecord,
): SystemInstructionsSuppliedEvent => ({
  eventType: AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED,
  runId,
  payload: {
    trace_id: trace.id,
    content: trace.content,
    ts: trace.ts,
  },
  statusHint: null,
});

export const parseSystemInstructionsSuppliedPayload = (
  value: Record<string, unknown>,
): SystemInstructionsSuppliedPayload | null => {
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 3
    || keys[0] !== 'content'
    || keys[1] !== 'trace_id'
    || keys[2] !== 'ts'
    || typeof value.trace_id !== 'string'
    || value.trace_id.trim().length === 0
    || typeof value.content !== 'string'
    || typeof value.ts !== 'number'
    || !Number.isFinite(value.ts)
    || value.ts <= 0
  ) {
    return null;
  }
  return { trace_id: value.trace_id, content: value.content, ts: value.ts };
};
