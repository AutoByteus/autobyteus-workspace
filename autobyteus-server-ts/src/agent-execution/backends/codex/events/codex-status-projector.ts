import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import { normalizeAgentApiStatus } from "../../../domain/agent-status-payload.js";
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

const normalizeCodexAgentPhase = (
  value: unknown,
): AgentRuntimeLifecycleSnapshot["phase"] => {
  if (CODEX_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")) {
    return "initializing";
  }
  const status = normalizeAgentApiStatus(value, "idle");
  return status === "offline" ? "idle" : status;
};

export const projectCodexAgentLifecycleSnapshot = (
  source: CodexStatusSource,
): AgentRuntimeLifecycleSnapshot => {
  if (source.isActive === false) {
    return {
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    };
  }
  const turnId = typeof source.activeTurnId === "string"
    ? source.activeTurnId.trim()
    : "";
  const projectedPhase = normalizeCodexAgentPhase(source.currentStatus);
  return {
    availability: "active",
    phase: turnId ? "running" : projectedPhase === "running"
      ? "initializing"
      : projectedPhase,
    currentTurn: turnId
      ? { kind: "IDENTIFIED", turnId }
      : { kind: "NONE" },
  };
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
