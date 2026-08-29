import readline from "node:readline";
import { ApplicationWorkerHostBridgeClient } from "./application-worker-host-bridge-client.js";
import { ApplicationBackendHost } from "./application-backend-host.js";
import { JsonLineFrameWriter } from "../runtime/json-line-frame-writer.js";
import {
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
  APPLICATION_ENGINE_METHOD_GET_STATUS,
  APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_COMMAND,
  APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_QUERY,
  APPLICATION_ENGINE_METHOD_INVOKE_AGENT_TOOL,
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_ROUTE_REQUEST,
  APPLICATION_ENGINE_METHOD_STOP,
  APPLICATION_ENGINE_NOTIFICATION_METHOD,
  APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE,
  APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET,
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT,
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR,
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED,
  type ApplicationWorkerNotificationParams,
} from "../runtime/protocol.js";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string };
};

const frameWriter = new JsonLineFrameWriter(process.stdout);
const writeFrame = (frame: Record<string, unknown>): Promise<void> => frameWriter.write(frame);

const hostBridgeClient = new ApplicationWorkerHostBridgeClient(writeFrame);
const runtime = new ApplicationBackendHost(
  async (params: ApplicationWorkerNotificationParams) => {
    await writeFrame({
      jsonrpc: "2.0",
      method: APPLICATION_ENGINE_NOTIFICATION_METHOD,
      params,
    });
  },
  async (input) => hostBridgeClient.invokeContextCapability(input),
  async (input) => hostBridgeClient.invokeWebSocketAction(input),
);

const respondSuccess = async (id: string | number | null, result: unknown): Promise<void> => {
  await writeFrame({ jsonrpc: "2.0", id, result });
};

const respondError = async (id: string | number | null, message: string): Promise<void> => {
  await writeFrame({
    jsonrpc: "2.0",
    id,
    error: { message },
  });
};

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  if (!line.trim()) {
    return;
  }

  let request: JsonRpcRequest;
  try {
    request = JSON.parse(line) as JsonRpcRequest;
  } catch (error) {
    await respondError(null, `Invalid JSON request: ${String(error)}`);
    return;
  }

  if (!request.method && hostBridgeClient.handleResponse(request as Record<string, unknown>)) {
    return;
  }

  const id = request.id ?? null;
  const method = request.method ?? "";
  const params = request.params ?? {};

  if (id === null) {
    if (method === APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT) runtime.dispatchAgentStreamEvent(params);
    if (method === APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR) runtime.dispatchAgentStreamError(params);
    if (method === APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED) runtime.dispatchAgentStreamClosed(params);
    return;
  }

  try {
    switch (method) {
      case APPLICATION_ENGINE_METHOD_LOAD_DEFINITION:
        await respondSuccess(id, await runtime.loadDefinition(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_GET_STATUS:
        await respondSuccess(id, runtime.getStatus());
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_QUERY:
        await respondSuccess(id, await runtime.invokeQuery(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_COMMAND:
        await respondSuccess(id, await runtime.invokeCommand(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_ROUTE_REQUEST:
        await respondSuccess(id, await runtime.routeRequest(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL:
        await respondSuccess(id, await runtime.executeGraphql(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER:
        await respondSuccess(id, await runtime.invokeEventHandler(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER:
        await respondSuccess(id, await runtime.invokeArtifactHandler(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_AGENT_TOOL:
        await respondSuccess(id, await runtime.invokeAgentTool(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET:
        await runtime.openWebSocket(params as never);
        await respondSuccess(id, { opened: true });
        break;
      case APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE:
        await runtime.deliverWebSocketMessage(params as never);
        await respondSuccess(id, { delivered: true });
        break;
      case APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET:
        await runtime.closeWebSocket(params as never);
        await respondSuccess(id, { closed: true });
        break;
      case APPLICATION_ENGINE_METHOD_STOP:
        await runtime.stop();
        await respondSuccess(id, { stopped: true });
        process.exit(0);
        break;
      default:
        await respondError(id, `Unsupported worker method '${method}'.`);
        break;
    }
  } catch (error) {
    await respondError(id, error instanceof Error ? error.message : String(error));
  }
});

rl.on("close", () => {
  hostBridgeClient.close(new Error("Application worker host input closed."));
  void runtime.stop().catch(() => {
    // The host bridge is intentionally unavailable during best-effort teardown.
  }).finally(() => {
    process.exit(0);
  });
});
