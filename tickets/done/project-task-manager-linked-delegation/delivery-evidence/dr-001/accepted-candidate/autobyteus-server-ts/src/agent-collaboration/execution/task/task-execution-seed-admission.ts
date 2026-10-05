import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";

/** The deferred callback is the acceptance boundary, not its enqueue operation. */
export const acceptTaskSeed = (
  assertOpen: () => void,
  accept: () => Promise<AgentOperationResult>,
): Promise<AgentOperationResult> => new Promise((resolve, reject) => {
  queueMicrotask(() => {
    try { assertOpen(); void accept().then(resolve, reject); }
    catch (error) { reject(error); }
  });
});
