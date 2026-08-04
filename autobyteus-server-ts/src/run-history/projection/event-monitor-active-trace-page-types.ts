export type EventMonitorToolCardKind = "tool_call" | "write_file" | "edit_file" | "terminal_command";
export type EventMonitorToolStatusKey =
  | "running" | "success" | "error" | "approved" | "awaiting-approval" | "denied" | "default";
export type EventMonitorMediaType = "image" | "audio" | "video";

export interface EventMonitorActiveTraceAttachment {
  attachmentId: string;
  mediaType: EventMonitorMediaType;
  locator: string;
}

export interface EventMonitorToolSummaryArgs {
  path?: string | null;
  file_path?: string | null;
  filepath?: string | null;
  filename?: string | null;
  target_path?: string | null;
  command?: string | null;
  cmd?: string | null;
  script?: string | null;
  query?: string | null;
  prompt?: string | null;
  url?: string | null;
  message?: string | null;
  text?: string | null;
  title?: string | null;
  name?: string | null;
  raw?: string | null;
}

export interface EventMonitorApprovalTarget {
  executionAddress: import("../../agent-team-execution/domain/team-execution-address.js").TeamExecutionAddress;
}

interface VisualBase { visualId: string; eventId: string; kindOrdinal: number }
export interface EventMonitorUserVisual extends VisualBase {
  kind: "user"; text: string; attachments: EventMonitorActiveTraceAttachment[];
}
export interface EventMonitorAssistantTextVisual extends VisualBase { kind: "assistant_text"; content: string }
export interface EventMonitorThinkingVisual extends VisualBase { kind: "thinking"; content: string }
export interface EventMonitorToolCardVisual extends VisualBase {
  kind: "tool_card";
  invocationId: string;
  cardKind: EventMonitorToolCardKind;
  toolName: string;
  statusKey: EventMonitorToolStatusKey;
  summaryArgs: EventMonitorToolSummaryArgs;
  errorMessage: string | null;
  approvalTarget: EventMonitorApprovalTarget | null;
}
export interface EventMonitorMediaVisual extends VisualBase {
  kind: "media"; mediaType: EventMonitorMediaType; urls: string[];
}
export interface EventMonitorCompactionVisual extends VisualBase {
  kind: "compaction";
  activityId: string;
  phase: "requested" | "started" | "completed" | "failed";
  message: string;
  turnId: string | null;
  rawTraceCount: number | null;
  semanticFactCount: number | null;
  provider: string | null;
}
export type EventMonitorActiveTracePageVisual =
  | EventMonitorUserVisual | EventMonitorAssistantTextVisual | EventMonitorThinkingVisual
  | EventMonitorToolCardVisual | EventMonitorMediaVisual | EventMonitorCompactionVisual;

export interface EventMonitorActiveTracePageEvent {
  eventId: string;
  turnGroupId: string;
  occurredAtMs: number | null;
  visuals: EventMonitorActiveTracePageVisual[];
}

export interface EventMonitorActiveTracePage {
  events: EventMonitorActiveTracePageEvent[];
  beforeCursor: string | null;
  hasEarlier: boolean;
  loadedEarlierCount: number;
  activeGeneration: string;
  cursorStatus: "VALID" | "EXPIRED";
}
