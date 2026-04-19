import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";
export const onRunTerminated = async (event, context) => {
    await projectLessonExecutionEvent(event, context);
};
