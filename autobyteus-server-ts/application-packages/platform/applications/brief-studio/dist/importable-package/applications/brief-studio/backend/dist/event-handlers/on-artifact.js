import { projectExecutionEvent } from "../services/brief-projection-service.js";
export const onArtifact = async (envelope, context) => {
    await projectExecutionEvent(envelope, context);
};
