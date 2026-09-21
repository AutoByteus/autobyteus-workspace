import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export type ConfiguredAgentExecutionSpec = Readonly<{
  agentDefinitionId: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  runtimeKind: RuntimeKind;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
}>;

export type ConfiguredAgentActivationMode = "fresh" | "restore";

export class CollaborationAgentActivationError extends Error {
  readonly indeterminate: boolean;
  constructor(
    readonly code: string,
    message: string,
    options: { cause?: unknown; indeterminate?: boolean } = {},
  ) {
    super(message);
    this.name = "CollaborationAgentActivationError";
    this.indeterminate = options.indeterminate ?? false;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}
