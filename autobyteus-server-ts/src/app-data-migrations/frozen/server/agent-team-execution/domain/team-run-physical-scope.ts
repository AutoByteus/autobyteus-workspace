export type TeamRunPhysicalScope = Readonly<{
  rootTeamRunId: string;
  ancestorTeamRunIds: readonly string[];
}>;

const requiredId = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") throw new Error(`${fieldName} is required.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export const normalizeTeamRunPhysicalScope = (
  scope: TeamRunPhysicalScope,
): TeamRunPhysicalScope => {
  if (!scope || typeof scope !== "object") {
    throw new Error("physicalScope is required.");
  }
  if (!Array.isArray(scope.ancestorTeamRunIds)) {
    throw new Error("ancestorTeamRunIds is required.");
  }
  const rootTeamRunId = requiredId(scope.rootTeamRunId, "rootTeamRunId");
  const ancestorTeamRunIds = scope.ancestorTeamRunIds.map((teamRunId, index) =>
    requiredId(teamRunId, `ancestorTeamRunIds[${index}]`));
  const distinctIds = new Set(ancestorTeamRunIds);
  if (distinctIds.size !== ancestorTeamRunIds.length) {
    throw new Error("ancestorTeamRunIds must contain distinct TeamRun IDs.");
  }
  if (distinctIds.has(rootTeamRunId)) {
    throw new Error("ancestorTeamRunIds must exclude the root TeamRun ID.");
  }
  return Object.freeze({
    rootTeamRunId,
    ancestorTeamRunIds: Object.freeze(ancestorTeamRunIds),
  });
};

export const createRootTeamRunPhysicalScope = (
  rootTeamRunId: string,
): TeamRunPhysicalScope => normalizeTeamRunPhysicalScope({
  rootTeamRunId,
  ancestorTeamRunIds: [],
});

export const createChildTeamRunPhysicalScope = (
  parentScope: TeamRunPhysicalScope,
  childTeamRunId: string,
): TeamRunPhysicalScope => {
  const parent = normalizeTeamRunPhysicalScope(parentScope);
  return normalizeTeamRunPhysicalScope({
    rootTeamRunId: parent.rootTeamRunId,
    ancestorTeamRunIds: [...parent.ancestorTeamRunIds, requiredId(childTeamRunId, "childTeamRunId")],
  });
};
