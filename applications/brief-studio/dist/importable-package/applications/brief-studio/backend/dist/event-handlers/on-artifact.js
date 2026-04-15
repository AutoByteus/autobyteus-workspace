import { projectArtifact } from "../services/brief-projection-service.js";
export const onArtifact = async (envelope, context) => {
    await projectArtifact(envelope, context);
};
