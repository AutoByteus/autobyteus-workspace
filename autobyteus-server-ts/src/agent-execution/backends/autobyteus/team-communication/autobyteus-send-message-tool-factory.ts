import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-team-execution/services/send-message-to-tool-contract.js";
import { createBoundAutoByteusSendMessageToTool } from "../../../../agent-tools/team-communication/send-message-to.js";

export const isSendMessageToToolName = (toolName: string | null | undefined): boolean =>
  toolName?.trim() === SEND_MESSAGE_TO_TOOL_NAME;

export const canCreateBoundAutoByteusSendMessageToTool = (
  memberTeamContext: MemberTeamContext | null | undefined,
): memberTeamContext is MemberTeamContext =>
  Boolean(
    memberTeamContext?.sendMessageToEnabled &&
      memberTeamContext.deliverInterAgentMessage,
  );

export const createAutoByteusSendMessageToToolForMember = (
  memberTeamContext: MemberTeamContext,
): BaseTool => createBoundAutoByteusSendMessageToTool(memberTeamContext);
