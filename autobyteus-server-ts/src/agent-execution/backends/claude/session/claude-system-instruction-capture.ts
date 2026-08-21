import type { SystemInstructionCaptureService } from "../../../../agent-memory/services/system-instruction-capture-service.js";
import { getSystemInstructionCaptureService } from "../../../../agent-memory/services/system-instruction-capture-service.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";

export const captureClaudeSystemInstructions = (input: {
  service?: SystemInstructionCaptureService;
  memoryDir: string | null;
  content: string;
  suppliedAt: number;
  emitEvent: (event: ClaudeSessionEvent) => void;
}): void => {
  if (!input.memoryDir) return;
  const capture = (input.service ?? getSystemInstructionCaptureService()).capture({
    memoryDir: input.memoryDir,
    content: input.content,
    suppliedAt: input.suppliedAt,
  });
  if (!capture.created) return;
  input.emitEvent({
    method: ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED,
    params: {
      trace_id: capture.trace.id,
      content: capture.trace.content,
      ts: capture.trace.ts,
    },
  });
};
