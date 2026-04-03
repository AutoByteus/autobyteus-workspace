import {
  getRuntimeMemberContexts,
  resolveRuntimeMemberContext,
} from "../../domain/team-run-context.js";
import { AgentTeamRunManager } from "../../services/agent-team-run-manager.js";
import { buildInterAgentMessageDeliveryHandler } from "../../services/inter-agent-message-delivery-handler-builder.js";
import { composeMemberRunInstructions } from "../../services/member-run-instruction-composer.js";
import { buildSendMessageToDynamicToolRegistrations } from "./codex-send-message-dynamic-tool-registration.js";
import type {
  CodexThreadBootstrapPreparation,
  CodexThreadBootstrapStrategy,
} from "../../../agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import { renderMarkdownInstructionSections } from "../../../agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import type {
  AgentRunContext,
} from "../../../agent-execution/domain/agent-run-context.js";
import type { CodexAgentRunContext } from "../../../agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export class TeamCodexThreadBootstrapStrategy implements CodexThreadBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
  ): boolean {
    return (
      runContext.config.runtimeKind === RuntimeKind.CODEX_APP_SERVER &&
      runContext.config.teamContext?.runtimeKind === RuntimeKind.CODEX_APP_SERVER
    );
  }

  prepare(input: {
    runContext: AgentRunContext<CodexAgentRunContext | null>;
    agentInstruction: string | null;
    configuredToolExposure: import("../../../agent-execution/shared/configured-agent-tool-exposure.js").ConfiguredAgentToolExposure;
  }): CodexThreadBootstrapPreparation {
    const teamContext = input.runContext.config.teamContext;
    const currentMemberContext = resolveRuntimeMemberContext(teamContext, input.runContext.runId);
    const teammates = getRuntimeMemberContexts(teamContext?.runtimeContext ?? null).map(
      (memberContext) => ({
        memberName: memberContext.memberName,
        role: null,
        description: null,
      }),
    );
    const currentMemberName = currentMemberContext?.memberName ?? null;
    const allowedRecipientNames = teammates
      .map((teammate) => teammate.memberName)
      .filter((memberName) => memberName !== currentMemberName);
    const deliveryHandler = buildInterAgentMessageDeliveryHandler(
      teamContext?.runId ?? null,
      AgentTeamRunManager.getInstance(),
    );
    const sendMessageToEnabled =
      input.configuredToolExposure.sendMessageToConfigured &&
      allowedRecipientNames.length > 0 &&
      Boolean(deliveryHandler);
    const instructionComposition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: input.agentInstruction,
      currentMemberName,
      sendMessageToEnabled,
      teammates,
    });

    return {
      baseInstructions: renderMarkdownInstructionSections([
        {
          title: "Team Instruction",
          content: instructionComposition.teamInstruction,
        },
        {
          title: "Agent Instruction",
          content: instructionComposition.agentInstruction,
        },
      ]),
      developerInstructions: instructionComposition.runtimeInstruction,
      dynamicToolRegistrations:
        sendMessageToEnabled && deliveryHandler
          ? buildSendMessageToDynamicToolRegistrations({
              allowedRecipientNames,
              deliverInterAgentMessage: deliveryHandler,
              senderRunId: input.runContext.runId,
              teamRunId: teamContext?.runId ?? "",
            })
          : null,
    };
  }
}

let cachedTeamCodexThreadBootstrapStrategy: TeamCodexThreadBootstrapStrategy | null = null;

export const getTeamCodexThreadBootstrapStrategy = (): TeamCodexThreadBootstrapStrategy => {
  if (!cachedTeamCodexThreadBootstrapStrategy) {
    cachedTeamCodexThreadBootstrapStrategy = new TeamCodexThreadBootstrapStrategy();
  }
  return cachedTeamCodexThreadBootstrapStrategy;
};
