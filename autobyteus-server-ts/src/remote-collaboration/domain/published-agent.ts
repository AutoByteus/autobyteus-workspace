import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/**
 * An Agent definition this node's owner offers to peers (DEC-102), with the launch settings a remote run of
 * it starts with here. Field names and meanings are those of `run_metadata.json`. The published address is
 * not stored: it is derived from the published set (`PublishedAgentService`).
 * `<data>/remote-collaboration/published-agents.json` holds them (owner: `PublishedAgentService`).
 */
export type PublishedAgent = Readonly<{
  agentDefinitionId: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  workspaceRootPath: string;
  autoExecuteTools: boolean;
  publishedAt: string;
}>;

/** The launch settings an owner chooses when publishing or updating a published Agent. */
export type PublishedAgentLaunchSettings = Omit<PublishedAgent, "agentDefinitionId" | "publishedAt">;
