import type { ApplicationEventHandler } from "@autobyteus/application-backend-sdk";
import { projectExecutionEvent } from "../services/brief-projection-service.js";

export const onArtifact: ApplicationEventHandler = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};
