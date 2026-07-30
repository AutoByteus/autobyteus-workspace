import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

export type CodexStatusSource = {
  currentStatus?: unknown;
  activeTurnId?: string | null;
  isActive?: boolean;
};

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") || null
    : null;

const CODEX_STARTUP_STATUS_TOKENS = new Set([
  "bootstrapping",
  "starting",
  "startup",
  "uninitialized",
]);

const normalizeCodexAgentStatus = (value: unknown): AgentStatusPayload["status"] =>
  CODEX_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")
    ? "initializing"
    : normalizeAgentApiStatus(value, "idle");

export const projectCodexAgentStatus = (source: CodexStatusSource): AgentStatusPayload => {
  const status =
    source.isActive === false
      ? "offline"
      : normalizeCodexAgentStatus(source.currentStatus);
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId),
  });
};

export const deriveCodexAgentRunStatusHint = (
  codexEventName: string,
): AgentRunEvent["statusHint"] => {
  if (codexEventName === CodexThreadEventName.TURN_STARTED) return "ACTIVE";
  if (codexEventName === CodexThreadEventName.TURN_COMPLETED) return "IDLE";
  if (codexEventName === CodexThreadEventName.ERROR) return "ERROR";
  return null;
};

export const resolveCodexAgentRunEventStatusHint = (
  event: AgentRunEvent,
  nonErrorHint: AgentRunEvent["statusHint"],
): AgentRunEvent["statusHint"] => {
  if (event.eventType !== AgentRunEventType.ERROR) return nonErrorHint;
  const evidence = resolveAgentRunErrorEvidence(event);
  return evidence?.kind === "TURN_TERMINAL" || evidence?.kind === "RUNTIME_GLOBAL"
    ? "ERROR"
    : null;
};
