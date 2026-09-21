import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import type { MemberExecutionContext } from "../../../agent-collaboration/execution/domain/member-execution-context.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../built-in-agents/built-in-agent-registry.js";
import {
  buildRuntimeAgentToolExposure,
  type RuntimeAgentToolExposure,
} from "../../shared/runtime-agent-tool-exposure.js";

export const AUTOBYTEUS_DEFAULT_TOOL_NAMES = [
  "run_bash",
  "read_file",
  "edit_file",
  "write_file",
] as const;

/**
 * Resolves the native runtime's effective exposure without changing persisted
 * agent configuration. Common normalization and team-tool composition remain
 * owned by the runtime-neutral exposure builder.
 */
export const resolveAutoByteusRuntimeAgentToolExposure = (
  agentDefinition: Pick<AgentDefinition, "id" | "toolNames"> | null,
  memberExecutionContext?: MemberExecutionContext | null,
): RuntimeAgentToolExposure => {
  if (agentDefinition?.id === MEMORY_COMPACTOR_AGENT_DEFINITION_ID) {
    return buildRuntimeAgentToolExposure([], null);
  }
  return buildRuntimeAgentToolExposure(
    [
      ...AUTOBYTEUS_DEFAULT_TOOL_NAMES,
      ...(agentDefinition?.toolNames ?? []),
    ],
    memberExecutionContext,
  );
};
