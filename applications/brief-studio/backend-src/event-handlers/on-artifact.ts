import type { ApplicationArtifactHandler } from "@autobyteus/application-backend-sdk";
import { createBriefArtifactReconciliationService } from "../services/brief-artifact-reconciliation-service.js";

export const onArtifact: ApplicationArtifactHandler = async (event, context) => {
  await createBriefArtifactReconciliationService(context).handlePersistedArtifact(event);
};
