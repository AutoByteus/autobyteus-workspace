import { randomUUID } from "node:crypto";
import type { ClaudeSdkSessionBinding } from "../../../../runtime-management/claude/client/claude-sdk-session-binding.js";

export type ClaudeProviderSessionPhase =
  | "NEW_RESERVED"
  | "RESUME_REQUIRED_UNCONFIRMED"
  | "RESUMABLE_CONFIRMED";

const normalizeUuid = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    throw new Error("PLATFORM_AGENT_RUN_BINDING_INVALID: Claude provider identity must be a UUID.");
  }
  return normalized;
};

/** Store-free owner of one immutable Claude provider UUID and query mode. */
export class ClaudeProviderSessionLifecycle {
  readonly sessionId: string;
  private phase: ClaudeProviderSessionPhase;
  private currentBinding: ClaudeSdkSessionBinding | null = null;
  private currentQueryConfirmed = false;

  private constructor(sessionId: string, phase: ClaudeProviderSessionPhase) {
    this.sessionId = normalizeUuid(sessionId);
    this.phase = phase;
  }

  static reserveNew(uuidFactory: () => string = randomUUID): ClaudeProviderSessionLifecycle {
    return new ClaudeProviderSessionLifecycle(uuidFactory(), "NEW_RESERVED");
  }

  static restore(sessionId: string, localRunId: string): ClaudeProviderSessionLifecycle {
    const normalizedLocalRunId = localRunId.trim().toLowerCase();
    const normalizedSessionId = normalizeUuid(sessionId);
    if (normalizedSessionId === normalizedLocalRunId) {
      throw new Error("PLATFORM_AGENT_RUN_BINDING_INVALID: Claude provider identity cannot be the local run identity.");
    }
    return new ClaudeProviderSessionLifecycle(normalizedSessionId, "RESUME_REQUIRED_UNCONFIRMED");
  }

  get currentPhase(): ClaudeProviderSessionPhase { return this.phase; }

  buildNextQueryBinding(): ClaudeSdkSessionBinding {
    if (this.currentBinding) {
      throw new Error("Claude provider session already has an open query binding.");
    }
    return this.phase === "NEW_RESERVED"
      ? Object.freeze({ kind: "create", sessionId: this.sessionId })
      : Object.freeze({ kind: "resume", sessionId: this.sessionId });
  }

  noteQueryOpened(binding: ClaudeSdkSessionBinding): void {
    if (this.currentBinding || binding.sessionId !== this.sessionId) {
      throw new Error("CLAUDE_PROVIDER_SESSION_ID_CONFLICT: Claude query binding does not match its lifecycle.");
    }
    const expectedKind = this.phase === "NEW_RESERVED" ? "create" : "resume";
    if (binding.kind !== expectedKind) {
      throw new Error("Claude provider session query mode does not match its lifecycle phase.");
    }
    this.currentBinding = binding;
    this.currentQueryConfirmed = false;
    this.phase = "RESUME_REQUIRED_UNCONFIRMED";
  }

  confirmProviderSessionId(sessionId: string): void {
    let normalized: string;
    try {
      normalized = normalizeUuid(sessionId);
    } catch (error) {
      throw new Error("CLAUDE_PROVIDER_SESSION_ID_CONFLICT: Claude returned an invalid provider session identity.", { cause: error });
    }
    if (normalized !== this.sessionId) {
      throw new Error("CLAUDE_PROVIDER_SESSION_ID_CONFLICT: Claude returned a different provider session identity.");
    }
    if (!this.currentBinding) {
      throw new Error("Claude provider session identity was reported without an open query.");
    }
    this.currentQueryConfirmed = true;
    this.phase = "RESUMABLE_CONFIRMED";
  }

  assertCurrentQueryConfirmed(): void {
    if (!this.currentBinding || !this.currentQueryConfirmed) {
      throw new Error("CLAUDE_PROVIDER_SESSION_ID_UNCONFIRMED: Claude turn completed without provider identity confirmation.");
    }
  }

  closeCurrentQuery(): void {
    this.currentBinding = null;
    this.currentQueryConfirmed = false;
  }
}
