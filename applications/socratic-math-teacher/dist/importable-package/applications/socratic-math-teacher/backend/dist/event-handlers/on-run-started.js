import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";
export const onRunStarted = async (event, context) => {
    await projectLessonExecutionEvent(event, context);
};
