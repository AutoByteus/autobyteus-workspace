export type ApplicationOwnedTeamIntegrityNode = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: "shared" | "team_local" | "application_owned" | null;
};

type ResolvedLocalAgentRef = {
  exists: boolean;
};

type ResolvedApplicationOwnedRef = {
  exists: boolean;
  ownerApplicationId: string | null;
};

type ResolvedLocalTeamRef = {
  exists: boolean;
};

export type ApplicationOwnedTeamIntegrityValidationInput = {
  owningApplicationId: string;
  teamId: string;
  nodes: ApplicationOwnedTeamIntegrityNode[];
  resolveLocalAgentRef: (ref: string) => Promise<ResolvedLocalAgentRef> | ResolvedLocalAgentRef;
  resolveApplicationOwnedTeamRef: (ref: string) => Promise<ResolvedApplicationOwnedRef> | ResolvedApplicationOwnedRef;
  resolveLocalTeamRef: (ref: string) => Promise<ResolvedLocalTeamRef> | ResolvedLocalTeamRef;
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

    if (!node.refScope) {
      errors.push(
        `Application-owned team '${input.teamId}' member '${node.memberName}' must include explicit refScope 'application_owned' or 'team_local'.`,
      );
      continue;
    }

    if (node.refScope === "shared") {
      errors.push(
        `Application-owned team '${input.teamId}' member '${node.memberName}' cannot reference shared nested team '${node.ref}'.`,
      );
      continue;
    }

    if (node.ref === input.teamId) {
      errors.push(
        `Application-owned team '${input.teamId}' cannot reference itself as a nested team member.`,
      );
      continue;
    }

    if (node.refScope === "team_local") {
      const resolved = await input.resolveLocalTeamRef(node.ref);
      if (!resolved.exists) {
        errors.push(
          `Application-owned team '${input.teamId}' member '${node.memberName}' must reference a child team inside its own agent-teams/ folder.`,
        );
      }
      continue;
    }

    const resolved = await input.resolveApplicationOwnedTeamRef(node.ref);
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
