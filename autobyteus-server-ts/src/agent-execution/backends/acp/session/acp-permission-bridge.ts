import type { PermissionOption, RequestPermissionResponse } from "@agentclientprotocol/sdk";

const CANCELLED: RequestPermissionResponse = { outcome: { outcome: "cancelled" } };

type PendingPermission = Readonly<{
  options: readonly PermissionOption[];
  resolve: (response: RequestPermissionResponse) => void;
}>;

export type AcpPermissionDecisionResult =
  | Readonly<{ kind: "answered" }>
  | Readonly<{ kind: "not_pending" }>
  | Readonly<{ kind: "option_unavailable" }>;

/**
 * Holds `session/request_permission` requests open by tool call id until AutoByteus decides.
 * Only one-shot options (`allow_once`, `reject_once`) are ever selected; every pending request
 * is answered, with `cancelled` on interrupt or close.
 */
export class AcpPermissionBridge {
  private readonly pending = new Map<string, PendingPermission>();

  has(toolCallId: string): boolean { return this.pending.has(toolCallId); }

  pend(toolCallId: string, options: readonly PermissionOption[]): Promise<RequestPermissionResponse> {
    this.pending.get(toolCallId)?.resolve(CANCELLED);
    return new Promise((resolve) => this.pending.set(toolCallId, { options, resolve }));
  }

  /** Immediate answer for a request that needs no user decision. */
  static selectOnce(options: readonly PermissionOption[], approved: boolean): RequestPermissionResponse | null {
    const option = options.find((candidate) => candidate.kind === (approved ? "allow_once" : "reject_once"));
    return option ? { outcome: { outcome: "selected", optionId: option.optionId } } : null;
  }

  decide(toolCallId: string, approved: boolean): AcpPermissionDecisionResult {
    const pending = this.pending.get(toolCallId);
    if (!pending) return { kind: "not_pending" };
    const response = AcpPermissionBridge.selectOnce(pending.options, approved) ?? (approved ? null : CANCELLED);
    if (!response) return { kind: "option_unavailable" };
    this.pending.delete(toolCallId);
    pending.resolve(response);
    return { kind: "answered" };
  }

  /** Answers every pending request `cancelled`; returns the affected tool call ids. */
  cancelAll(): string[] {
    const ids = [...this.pending.keys()];
    for (const pending of this.pending.values()) pending.resolve(CANCELLED);
    this.pending.clear();
    return ids;
  }
}
