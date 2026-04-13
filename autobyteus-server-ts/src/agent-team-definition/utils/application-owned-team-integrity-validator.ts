export type ApplicationOwnedTeamIntegrityNode = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: "shared" | "team_local" | "application_owned" | null;
};

type ResolvedOwnedRef = {
  exists: boolean;
  ownerApplicationId: string | null;
};

export type ApplicationOwnedTeamIntegrityValidationInput = {
  owningApplicationId: string;
  teamId: string;
  nodes: ApplicationOwnedTeamIntegrityNode[];
  resolveAgentRef: (ref: string) => ResolvedOwnedRef;
  resolveTeamRef: (ref: string) => ResolvedOwnedRef;
};

export const validateApplicationOwnedTeamIntegrity = (
  input: ApplicationOwnedTeamIntegrityValidationInput,
): string[] => {
  const errors: string[] = [];

  for (const node of input.nodes) {
    if (node.refType === "agent") {
      if (node.refScope !== "application_owned") {
        errors.push(
          `Application-owned team '${input.teamId}' member '${node.memberName}' must use refScope 'application_owned'.`,
        );
        continue;
      }

      const resolved = input.resolveAgentRef(node.ref);
      if (!resolved.exists || resolved.ownerApplicationId !== input.owningApplicationId) {
        errors.push(
          `Application-owned team '${input.teamId}' member '${node.memberName}' must reference an agent inside the same application bundle.`,
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

    const resolved = input.resolveTeamRef(node.ref);
    if (!resolved.exists || resolved.ownerApplicationId !== input.owningApplicationId) {
      errors.push(
        `Application-owned team '${input.teamId}' member '${node.memberName}' must reference a team inside the same application bundle.`,
      );
    }
  }

  return errors;
};

export const assertApplicationOwnedTeamIntegrity = (
  input: ApplicationOwnedTeamIntegrityValidationInput,
): void => {
  const errors = validateApplicationOwnedTeamIntegrity(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
};
