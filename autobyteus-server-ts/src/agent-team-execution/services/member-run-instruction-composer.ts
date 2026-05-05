type MemberRunTeammate = {
  memberName: string;
  role: string | null;
  description: string | null;
};

type MemberRunInstructionComposerInput = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  currentMemberName: string | null;
  sendMessageToEnabled: boolean;
  teammates: MemberRunTeammate[];
};

export type MemberRunInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toLowerTrimmed = (value: string): string => value.trim().toLowerCase();

const formatTeammate = (member: MemberRunTeammate): string => {
  const detailParts = [member.role, member.description].filter(
    (value): value is string => Boolean(value),
  );
  if (detailParts.length === 0) {
    return `- ${member.memberName}`;
  }
  return `- ${member.memberName}: ${detailParts.join(" | ")}`;
};

export const composeMemberRunInstructions = (
  input: MemberRunInstructionComposerInput,
): MemberRunInstructionComposition => {
  const teammates = input.teammates.filter((member) => {
    const memberName = asTrimmedString(member.memberName);
    if (!memberName) {
      return false;
    }
    if (!input.currentMemberName) {
      return true;
    }
    return toLowerTrimmed(memberName) !== toLowerTrimmed(input.currentMemberName);
  });
  const sendMessageToAvailable = input.sendMessageToEnabled && teammates.length > 0;

  const runtimeLines: string[] = [];
  if (input.currentMemberName) {
    runtimeLines.push(`Current team member: ${input.currentMemberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, set `recipient_name` to exactly match one teammate name from the list below.",
    );
    runtimeLines.push(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    runtimeLines.push(
      "When sending files the teammate may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files` for Sent/Received Artifacts.",
    );
    runtimeLines.push(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
    runtimeLines.push("Do not claim teammate delivery unless the tool call succeeds.");
    runtimeLines.push("Teammates:");
    runtimeLines.push(...teammates.map((member) => formatTeammate(member)));
  } else if (input.teammates.length > 0) {
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
