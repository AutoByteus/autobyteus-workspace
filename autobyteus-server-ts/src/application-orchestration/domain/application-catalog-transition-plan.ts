import type {
  ApplicationBundleCatalogCandidate,
} from "../../application-bundles/services/application-bundle-service.js";

export type ApplicationCatalogTransitionPlan = Readonly<{
  oldApplicationIds: readonly string[];
  currentApplicationIds: readonly string[];
  removedApplicationIds: readonly string[];
  addedApplicationIds: readonly string[];
}>;

export const buildApplicationCatalogTransitionPlan = (input: Readonly<{
  oldApplicationIds: Iterable<string>;
  candidate: ApplicationBundleCatalogCandidate;
}>): ApplicationCatalogTransitionPlan => {
  const oldApplicationIds = [...new Set(input.oldApplicationIds)].sort();
  const currentApplicationIds = [...new Set(
    input.candidate.applications.map((application) => application.id),
  )].sort();
  const oldSet = new Set(oldApplicationIds);
  const currentSet = new Set(currentApplicationIds);
  return Object.freeze({
    oldApplicationIds: Object.freeze(oldApplicationIds),
    currentApplicationIds: Object.freeze(currentApplicationIds),
    removedApplicationIds: Object.freeze(oldApplicationIds.filter((id) => !currentSet.has(id))),
    addedApplicationIds: Object.freeze(currentApplicationIds.filter((id) => !oldSet.has(id))),
  });
};
