import { projectExecutionEvent } from "../services/brief-projection-service.js";
export const onRunTerminated = async (envelope, context) => {
    await projectExecutionEvent(envelope, context);
};
