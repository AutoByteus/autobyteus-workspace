/** Native Org records have no Team attribution in any persisted projection. */
export const isAgentOrgTokenAttributionReady = (record: {
  rootTeamRunId: unknown;
  rootAttributionStatus: unknown;
  identitySummary: { rootTeamRunIds?: unknown };
}): boolean => {
  const roots = record.identitySummary.rootTeamRunIds;
  return record.rootTeamRunId === null && record.rootAttributionStatus === "unknown"
    && typeof roots === "object" && roots !== null && !Array.isArray(roots)
    && Object.keys(roots).length === 1 && (roots as { status?: unknown }).status === "unknown";
};
