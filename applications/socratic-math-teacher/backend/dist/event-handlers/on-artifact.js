import { createLessonArtifactReconciliationService } from "../services/lesson-artifact-reconciliation-service.js";
export const onArtifact = async (event, context) => {
    await createLessonArtifactReconciliationService(context).handlePersistedArtifact(event);
};
