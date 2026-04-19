import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";
export const onRunOrphaned = async (event, context) => {
    await projectLessonExecutionEvent(event, context);
};
