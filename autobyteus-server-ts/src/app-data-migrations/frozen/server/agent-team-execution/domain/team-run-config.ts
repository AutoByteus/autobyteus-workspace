import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type AgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  workspaceRootPath: string | null;
}>;
