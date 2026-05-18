import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildTeamMembershipRosterManifest,
  renderTeamMembershipRosterManifest,
} from "./member-team-roster-manifest.js";

type MemberRunInstructionComposerInput = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  sendMessageToEnabled: boolean;
};

export type MemberRunInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

export const composeMemberRunInstructions = (
  input: MemberRunInstructionComposerInput,
): MemberRunInstructionComposition => {
  const memberTeamContext = input.memberTeamContext;
  const communicationRecipients = memberTeamContext?.communicationRecipients ?? [];
  const sendMessageToAvailable = input.sendMessageToEnabled && communicationRecipients.length > 0;

  const runtimeLines: string[] = [];
  if (memberTeamContext?.memberName) {
    runtimeLines.push(`Current team member: ${memberTeamContext.memberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, set `recipient_name` to exactly match one allowed recipient name from the team membership roster below.",
    );
    runtimeLines.push(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    runtimeLines.push(
      "When sending files the teammate may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files` for Team Communication messages.",
    );
    runtimeLines.push(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
    runtimeLines.push("Do not claim teammate delivery unless the tool call succeeds.");
    const manifestText = renderTeamMembershipRosterManifest(
      buildTeamMembershipRosterManifest(memberTeamContext!),
    );
    if (manifestText) {
      runtimeLines.push("");
      runtimeLines.push(manifestText);
    }
  } else if (communicationRecipients.length > 0) {
    runtimeLines.push(
      "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
    );
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
