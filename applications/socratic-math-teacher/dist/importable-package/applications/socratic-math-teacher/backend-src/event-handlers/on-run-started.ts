import type { ApplicationEventHandler } from "@autobyteus/application-backend-sdk";
import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";

export const onRunStarted: ApplicationEventHandler = async (event, context) => {
  await projectLessonExecutionEvent(event, context);
};
