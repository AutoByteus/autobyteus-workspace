import { composeMemberRunInstructions } from "../../../../agent-team-execution/services/member-run-instruction-composer.js";
import { buildSendMessageToDynamicToolRegistrations } from "./codex-send-message-dynamic-tool-registration.js";
import type {
  CodexThreadBootstrapPreparation,
  CodexThreadBootstrapStrategy,
} from "../backend/codex-thread-bootstrap-strategy.js";
import { renderMarkdownInstructionSections } from "../backend/codex-thread-bootstrap-strategy.js";
import type { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexAgentRunContext } from "../backend/codex-agent-run-context.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";

export class TeamMemberCodexThreadBootstrapStrategy implements CodexThreadBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
  ): boolean {
    return (
      runContext.config.runtimeKind === RuntimeKind.CODEX_APP_SERVER &&
      Boolean(runContext.config.memberTeamContext)
    );
  }

  prepare(input: {
    runContext: AgentRunContext<CodexAgentRunContext | null>;
    agentInstruction: string | null;
    configuredToolExposure: import("../../../shared/configured-agent-tool-exposure.js").ConfiguredAgentToolExposure;
  }): CodexThreadBootstrapPreparation {
    const memberTeamContext = input.runContext.config.memberTeamContext;
    if (!memberTeamContext) {
      return {
        baseInstructions: renderMarkdownInstructionSections([
          {
            title: "Agent Instruction",
            content: input.agentInstruction,
          },
        ]),
        developerInstructions: null,
        dynamicToolRegistrations: null,
      };
    }

    const sendMessageToEnabled =
      input.configuredToolExposure.sendMessageToConfigured &&
      memberTeamContext.sendMessageToEnabled &&
      Boolean(memberTeamContext.deliverInterAgentMessage);
    const instructionComposition = composeMemberRunInstructions({
      teamInstruction: memberTeamContext.teamInstruction,
      agentInstruction: input.agentInstruction,
      currentMemberName: memberTeamContext.memberName,
      sendMessageToEnabled,
      teammates: memberTeamContext.members,
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
        sendMessageToEnabled && memberTeamContext.deliverInterAgentMessage
          ? buildSendMessageToDynamicToolRegistrations({
              allowedRecipientNames: memberTeamContext.allowedRecipientNames,
              deliverInterAgentMessage: memberTeamContext.deliverInterAgentMessage,
              senderRunId: input.runContext.runId,
              teamRunId: memberTeamContext.teamRunId,
            })
          : null,
    };
  }
}

let cachedTeamMemberCodexThreadBootstrapStrategy: TeamMemberCodexThreadBootstrapStrategy | null = null;

export const getTeamMemberCodexThreadBootstrapStrategy = (): TeamMemberCodexThreadBootstrapStrategy => {
  if (!cachedTeamMemberCodexThreadBootstrapStrategy) {
    cachedTeamMemberCodexThreadBootstrapStrategy = new TeamMemberCodexThreadBootstrapStrategy();
  }
  return cachedTeamMemberCodexThreadBootstrapStrategy;
};
