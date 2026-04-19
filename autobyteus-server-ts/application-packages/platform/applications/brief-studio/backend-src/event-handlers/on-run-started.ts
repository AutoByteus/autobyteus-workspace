import type { ApplicationEventHandler } from "@autobyteus/application-backend-sdk";
import { projectExecutionEvent } from "../services/brief-projection-service.js";

export const onRunStarted: ApplicationEventHandler = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};
