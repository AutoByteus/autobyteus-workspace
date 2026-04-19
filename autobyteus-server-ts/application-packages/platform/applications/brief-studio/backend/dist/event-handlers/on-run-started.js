import { projectExecutionEvent } from "../services/brief-projection-service.js";
export const onRunStarted = async (envelope, context) => {
    await projectExecutionEvent(envelope, context);
};
