import { createBriefArtifactReconciliationService } from "../services/brief-artifact-reconciliation-service.js";
export const onArtifact = async (event, context) => {
    await createBriefArtifactReconciliationService(context).handlePersistedArtifact(event);
};
