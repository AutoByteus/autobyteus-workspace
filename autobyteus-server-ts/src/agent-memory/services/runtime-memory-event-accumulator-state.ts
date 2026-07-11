import type { ToolCallIdentity } from "autobyteus-ts/memory/models/tool-call-identity.js";

export type SegmentState = {
  id: string;
  type: "text" | "reasoning";
  turnId: string;
  parts: string[];
  sourceEvent: string;
  ts: number | null;
};

export type RuntimeToolState = {
  identity: ToolCallIdentity;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  callObserved?: boolean;
  callRawTraceId?: string;
  resultRawTraceId?: string;
};
