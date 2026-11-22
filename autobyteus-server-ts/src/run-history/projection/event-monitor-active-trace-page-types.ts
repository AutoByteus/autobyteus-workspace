import type { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import type { ToolSummaryArgumentKey } from "@autobyteus/agent-presentation-contracts";

export type EventMonitorToolCardKind = "tool_call" | "write_file" | "edit_file" | "terminal_command";
export type EventMonitorToolStatusKey =
  | "running" | "success" | "error" | "approved" | "awaiting-approval" | "denied" | "interrupted" | "default";
export type EventMonitorMediaType = "image" | "audio" | "video";

export interface EventMonitorActiveTraceAttachment {
  attachmentId: string;
  fileType: ContextFileType;
  fileName: string | null;
  locator: string;
}

/** A page card's summary inputs: the string values of the call's summary argument keys (`TOOL_SUMMARY_ARGUMENT_KEYS`). */
export type EventMonitorToolSummaryArgs = Partial<Record<ToolSummaryArgumentKey, string>>;

export interface EventMonitorApprovalTarget {
  agentRunId: string;
}

interface VisualBase { visualId: string; eventId: string; kindOrdinal: number }
export interface EventMonitorUserVisual extends VisualBase {
  kind: "user"; text: string; attachments: EventMonitorActiveTraceAttachment[];
}
/**
 * An agent-to-agent delivery (a user trace with a recorded sender), shown as "From <Sender>:" as
 * in the conversation replay (RD-004). `senderAddress` is filled when the root resolves it.
 */
export interface EventMonitorInterAgentVisual extends VisualBase {
  kind: "inter_agent"; senderAgentRunId: string; senderAddress: string | null;
  text: string; attachments: EventMonitorActiveTraceAttachment[];
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
  | EventMonitorUserVisual | EventMonitorInterAgentVisual | EventMonitorAssistantTextVisual | EventMonitorThinkingVisual
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
