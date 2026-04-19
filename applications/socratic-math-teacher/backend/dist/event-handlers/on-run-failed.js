import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";
export const onRunFailed = async (event, context) => {
    await projectLessonExecutionEvent(event, context);
};
