import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";
import type { AgentDefinition } from "../../../../agent-definition/domain/models.js";
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import type { ApplicationAgentToolCapability } from "../../../../application-agent-tools/services/application-agent-tool-capability.js";
import { ApplicationAgentToolNativeSchemaProjector } from "./application-agent-tool-native-schema-projector.js";
import { ApplicationAgentTool } from "./application-agent-tool.js";
import {
  resolveAutoByteusAgentTools,
  type AutoByteusAgentToolResolution,
} from "../autobyteus-agent-tool-resolver.js";

export const resolveApplicationAwareAgentTools = (input: Readonly<{
  agentDefinition: AgentDefinition;
  runtimeToolExposure: RuntimeAgentToolExposure;
  senderRunId: string;
  runtimeKind?: string | null;
  memberTeamContext?: MemberTeamContext | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
  capability?: ApplicationAgentToolCapability | null;
  logger?: { warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
}>): AutoByteusAgentToolResolution => {
  if (!input.applicationExecutionContext || !input.capability) {
    return resolveAutoByteusAgentTools({
      agentDefinition: input.agentDefinition,
      runtimeToolExposure: input.runtimeToolExposure,
      senderRunId: input.senderRunId,
      senderName: input.agentDefinition.name,
      runtimeKind: input.runtimeKind,
      memberTeamContext: input.memberTeamContext,
      logger: input.logger,
    });
  }
  const sender = buildAgentRunMessageSenderContext({
    senderRunId: input.senderRunId,
    senderName: input.agentDefinition.name,
    runtimeKind: input.runtimeKind,
    memberTeamContext: input.memberTeamContext,
  });
  const routes = input.capability.resolveSelectedRoutes({
    executionContext: input.applicationExecutionContext,
    sender,
    requestedToolNames: input.runtimeToolExposure.requestedToolNames,
  });
  const ordinaryExposure: RuntimeAgentToolExposure = Object.freeze({
    ...input.runtimeToolExposure,
    requestedToolNames: input.runtimeToolExposure.requestedToolNames.filter(
      (name) => !routes.has(name),
    ),
  });
  const ordinary = resolveAutoByteusAgentTools({
    agentDefinition: input.agentDefinition,
    runtimeToolExposure: ordinaryExposure,
    senderRunId: input.senderRunId,
    senderName: input.agentDefinition.name,
    runtimeKind: input.runtimeKind,
    memberTeamContext: input.memberTeamContext,
    logger: input.logger,
  });
  const projector = new ApplicationAgentToolNativeSchemaProjector();
  const byName = new Map<string, BaseTool>();
  ordinary.actualToolNames.forEach((name, index) => {
    const tool = ordinary.tools[index];
    if (tool) byName.set(name, tool);
  });
  for (const [name, route] of routes) {
    byName.set(name, new ApplicationAgentTool(
      route,
      input.capability,
      projector.project(route.declarationSnapshot.declaration.inputSchema),
    ));
  }
  const actualToolNames = input.runtimeToolExposure.requestedToolNames.filter(
    (name, index, names) => names.indexOf(name) === index && byName.has(name),
  );
  return {
    tools: actualToolNames.map((name) => byName.get(name)!),
    actualToolNames,
  };
};
