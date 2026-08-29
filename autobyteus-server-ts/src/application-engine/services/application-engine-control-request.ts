import type { ApplicationEngineRuntimeHandle } from "./application-engine-state-registry.js";
import {
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_STOP,
} from "../runtime/protocol.js";

const APPLICATION_ENGINE_CONTROL_REQUEST_DEADLINE_MS = 30_000;

type ApplicationEngineControlMethod =
  | typeof APPLICATION_ENGINE_METHOD_LOAD_DEFINITION
  | typeof APPLICATION_ENGINE_METHOD_STOP;

export class ApplicationEngineControlRequestTimeoutError extends Error {
  readonly cleanupErrors: readonly unknown[];

  constructor(method: ApplicationEngineControlMethod, cleanupErrors: readonly unknown[]) {
    const retainedCleanupErrors = Object.freeze([...cleanupErrors]);
    super(
      `Application engine control request timed out: ${method}`,
      retainedCleanupErrors.length > 0
        ? { cause: new AggregateError(retainedCleanupErrors, "Application engine control cleanup failed.") }
        : undefined,
    );
    this.name = "ApplicationEngineControlRequestTimeoutError";
    this.cleanupErrors = retainedCleanupErrors;
  }
}

export const runApplicationEngineControlRequest = <T>(
  handle: ApplicationEngineRuntimeHandle,
  method: ApplicationEngineControlMethod,
  params: Record<string, unknown>,
): Promise<T> => new Promise<T>((resolve, reject) => {
  let settled = false;
  let deadlineFired = false;

  const deadline = setTimeout(() => {
    if (settled) return;
    deadlineFired = true;
    const abort = async (): Promise<void> => {
      const cleanupErrors: unknown[] = [];
      try {
        await handle.client.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await handle.supervisor.stop();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (settled) return;
      settled = true;
      reject(new ApplicationEngineControlRequestTimeoutError(method, cleanupErrors));
    };
    void abort();
  }, APPLICATION_ENGINE_CONTROL_REQUEST_DEADLINE_MS);

  void handle.client.request<T>(method, params).then(
    (result) => {
      if (settled || deadlineFired) return;
      settled = true;
      clearTimeout(deadline);
      resolve(result);
    },
    (error) => {
      if (settled || deadlineFired) return;
      settled = true;
      clearTimeout(deadline);
      reject(error);
    },
  );
});
