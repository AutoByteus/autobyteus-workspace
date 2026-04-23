import type { ApplicationArtifactHandler } from "@autobyteus/application-backend-sdk";
import { createLessonArtifactReconciliationService } from "../services/lesson-artifact-reconciliation-service.js";

export const onArtifact: ApplicationArtifactHandler = async (event, context) => {
  await createLessonArtifactReconciliationService(context).handlePersistedArtifact(event);
};
