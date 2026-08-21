export const SYSTEM_INSTRUCTION_TRACE_TYPE = 'system_instruction' as const;
export const SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT = 'SYSTEM_INSTRUCTIONS_SUPPLIED' as const;

export type SystemInstructionTraceRecord = {
  id: string;
  ts: number;
  trace_type: typeof SYSTEM_INSTRUCTION_TRACE_TYPE;
  content: string;
  source_event: typeof SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT;
};

export type SystemInstructionCaptureResult = {
  trace: SystemInstructionTraceRecord;
  created: boolean;
};

const SYSTEM_INSTRUCTION_KEYS = [
  'content',
  'id',
  'source_event',
  'trace_type',
  'ts',
] as const;

export const parseSystemInstructionTraceRecord = (
  value: Record<string, unknown>,
): SystemInstructionTraceRecord | null => {
  const keys = Object.keys(value).sort();
  if (
    keys.length !== SYSTEM_INSTRUCTION_KEYS.length
    || keys.some((key, index) => key !== SYSTEM_INSTRUCTION_KEYS[index])
    || typeof value.id !== 'string'
    || value.id.trim().length === 0
    || typeof value.ts !== 'number'
    || !Number.isFinite(value.ts)
    || value.ts <= 0
    || value.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE
    || typeof value.content !== 'string'
    || value.source_event !== SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT
  ) {
    return null;
  }

  return {
    id: value.id,
    ts: value.ts,
    trace_type: SYSTEM_INSTRUCTION_TRACE_TYPE,
    content: value.content,
    source_event: SYSTEM_INSTRUCTIONS_SUPPLIED_SOURCE_EVENT,
  };
};
