import { projectExecutionEvent } from "../services/brief-projection-service.js";
export const onRunOrphaned = async (envelope, context) => {
    await projectExecutionEvent(envelope, context);
};
