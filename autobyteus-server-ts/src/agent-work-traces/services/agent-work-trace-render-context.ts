import crypto from "node:crypto";
import type { AgentWorkTraceRenderContext } from "../domain/work-traces.js";

export const AGENT_WORK_TRACE_RENDERER_VERSION = "agent-work-trace-renderer-v2";

export const normalizeAgentWorkTraceSubjectLabel = (agentName: string): string => {
  const normalized = agentName.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "Agent";
};

export const buildAgentWorkTraceRenderContext = (
  agentName: string,
): AgentWorkTraceRenderContext => {
  const subjectLabel = normalizeAgentWorkTraceSubjectLabel(agentName);
  const rendererVersion = AGENT_WORK_TRACE_RENDERER_VERSION;
  const fingerprint = crypto.createHash("sha256")
    .update(JSON.stringify({ rendererVersion, subjectLabel }))
    .digest("hex");
  return {
    subjectLabel,
    rendererVersion,
    fingerprint,
  };
};
