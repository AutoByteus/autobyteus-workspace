import { projectLessonExecutionEvent } from "../services/lesson-projection-service.js";
export const onArtifact = async (event, context) => {
    await projectLessonExecutionEvent(event, context);
};
