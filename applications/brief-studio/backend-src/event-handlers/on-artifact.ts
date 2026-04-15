import type { ApplicationEventHandler } from "@autobyteus/application-backend-sdk";
import { projectArtifact } from "../services/brief-projection-service.js";

export const onArtifact: ApplicationEventHandler = async (envelope, context) => {
  await projectArtifact(envelope, context);
};
