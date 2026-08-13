import type { JsonObject } from "../codex-app-server-json.js";
import type { CodexLocalDerivedEventInput } from "./codex-app-server-message.js";
import {
  handleCodexToolApprovalRequest,
} from "./codex-tool-approval-coordinator.js";
import type { CodexThread } from "./codex-thread.js";

type AppServerRequest = {
  codexThread: CodexThread;
  requestId: string | number;
  method: string;
  params: JsonObject;
  emitEvent: (codexThread: CodexThread, event: CodexLocalDerivedEventInput) => void;
};

export const handleAppServerRequest = async ({
  codexThread,
  requestId,
  method,
  params,
  emitEvent,
}: AppServerRequest): Promise<void> => {
  const eventMethod = method.trim();
  const handled = await handleCodexToolApprovalRequest({
    codexThread,
    requestId,
    method: eventMethod,
    params,
    emitEvent,
  });

  if (handled) {
    return;
  }

  codexThread.client.respondError(
    requestId,
    -32601,
    `Unsupported server request method '${eventMethod}'.`,
  );
};
