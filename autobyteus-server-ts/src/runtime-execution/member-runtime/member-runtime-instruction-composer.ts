type MemberRuntimeTeammate = {
  memberName: string;
  role: string | null;
  description: string | null;
};

type MemberRuntimeInstructionComposerInput = {
  teamInstructions: string | null;
  agentInstructions: string | null;
  currentMemberName: string | null;
  sendMessageToEnabled: boolean;
  teammates: MemberRuntimeTeammate[];
};

export type MemberRuntimeInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toLowerTrimmed = (value: string): string => value.trim().toLowerCase();

const formatTeammate = (member: MemberRuntimeTeammate): string => {
  const detailParts = [member.role, member.description].filter((value): value is string => Boolean(value));
  if (detailParts.length === 0) {
    return `- ${member.memberName}`;
  }
  return `- ${member.memberName}: ${detailParts.join(" | ")}`;
};

export const resolveMemberRuntimeInstructionSourcesFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): { teamInstructions: string | null; agentInstructions: string | null } => {
  const sourceRecord = asObject(
    metadata?.memberInstructionSources ?? metadata?.member_instruction_sources,
  );
  return {
    teamInstructions: asTrimmedString(
      sourceRecord?.teamInstructions ??
        sourceRecord?.team_instructions ??
        metadata?.teamInstructions ??
        metadata?.team_instructions,
    ),
    agentInstructions: asTrimmedString(
      sourceRecord?.agentInstructions ??
        sourceRecord?.agent_instructions ??
        metadata?.agentInstructions ??
        metadata?.agent_instructions,
    ),
  };
};

export const composeMemberRuntimeInstructions = (
  input: MemberRuntimeInstructionComposerInput,
): MemberRuntimeInstructionComposition => {
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

  const runtimeLines: string[] = [];
  if (input.currentMemberName) {
    runtimeLines.push(`Current team member: ${input.currentMemberName}`);
  }

  if (teammates.length > 0) {
    if (input.sendMessageToEnabled) {
      runtimeLines.push(
        "If you use `send_message_to`, set `recipient_name` to exactly match one teammate name from the list below.",
      );
      runtimeLines.push(
        "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
      );
      runtimeLines.push("Do not claim teammate delivery unless the tool call succeeds.");
    } else {
      runtimeLines.push("Do not attempt `send_message_to`; this run does not expose that tool.");
    }
    runtimeLines.push("Teammates:");
    runtimeLines.push(...teammates.map((member) => formatTeammate(member)));
  } else if (!input.sendMessageToEnabled && input.currentMemberName) {
    runtimeLines.push("Do not attempt `send_message_to`; this run does not expose that tool.");
  }

  return {
    teamInstruction: input.teamInstructions,
    agentInstruction: input.agentInstructions,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};

export const renderMarkdownInstructionSection = (
  title: string,
  content: string | null,
): string | null => {
  if (!content) {
    return null;
  }
  return `## ${title}\n${content}`;
};

export const renderMarkdownInstructionSections = (
  sections: Array<{ title: string; content: string | null }>,
): string | null => {
  const rendered = sections
    .map((section) => renderMarkdownInstructionSection(section.title, section.content))
    .filter((section): section is string => Boolean(section));
  return rendered.length > 0 ? rendered.join("\n\n") : null;
};

export const resolveMemberRuntimeTeammatesFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): MemberRuntimeTeammate[] => {
  const source = metadata?.teamMemberManifest ?? metadata?.team_member_manifest;
  const members: MemberRuntimeTeammate[] = [];
  const seen = new Set<string>();

  for (const row of asArray(source)) {
    const payload = asObject(row);
    if (!payload) {
      continue;
    }
    const memberName =
      asTrimmedString(payload.memberName ?? payload.member_name ?? payload.name) ?? null;
    if (!memberName) {
      continue;
    }
    const dedupeKey = toLowerTrimmed(memberName);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    members.push({
      memberName,
      role: asTrimmedString(payload.role),
      description: asTrimmedString(payload.description ?? payload.summary),
    });
  }

  return members;
};
