export type ApplicationOwnedTeamIntegrityNode = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: "shared" | "team_local" | "application_owned" | null;
};

type ResolvedLocalAgentRef = {
  exists: boolean;
};

type ResolvedOwnedRef = {
  exists: boolean;
  ownerApplicationId: string | null;
};

export type ApplicationOwnedTeamIntegrityValidationInput = {
  owningApplicationId: string;
  teamId: string;
  nodes: ApplicationOwnedTeamIntegrityNode[];
  resolveLocalAgentRef: (ref: string) => Promise<ResolvedLocalAgentRef> | ResolvedLocalAgentRef;
  resolveNestedTeamRef: (ref: string) => Promise<ResolvedOwnedRef> | ResolvedOwnedRef;
};

export const validateApplicationOwnedTeamIntegrity = async (
  input: ApplicationOwnedTeamIntegrityValidationInput,
): Promise<string[]> => {
  const errors: string[] = [];

  for (const node of input.nodes) {
    if (node.refType === "agent") {
      if (node.refScope !== "team_local") {
        errors.push(
          `Application-owned team '${input.teamId}' member '${node.memberName}' must use refScope 'team_local'.`,
        );
        continue;
      }

      const resolved = await input.resolveLocalAgentRef(node.ref);
      if (!resolved.exists) {
        errors.push(
          `Application-owned team '${input.teamId}' member '${node.memberName}' must reference a local agent inside its own agents/ folder.`,
        );
      }
      continue;
    }

    if (node.refScope !== null && node.refScope !== undefined) {
      errors.push(
        `Application-owned team '${input.teamId}' member '${node.memberName}' must not include refScope for nested teams.`,
      );
      continue;
    }

    if (node.ref === input.teamId) {
      errors.push(
        `Application-owned team '${input.teamId}' cannot reference itself as a nested team member.`,
      );
      continue;
    }

    const resolved = await input.resolveNestedTeamRef(node.ref);
    if (!resolved.exists || resolved.ownerApplicationId !== input.owningApplicationId) {
      errors.push(
        `Application-owned team '${input.teamId}' member '${node.memberName}' must reference a team inside the same application bundle.`,
      );
    }
  }

  return errors;
};

export const assertApplicationOwnedTeamIntegrity = async (
  input: ApplicationOwnedTeamIntegrityValidationInput,
): Promise<void> => {
  const errors = await validateApplicationOwnedTeamIntegrity(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
};
