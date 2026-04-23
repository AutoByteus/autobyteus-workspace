import readline from "node:readline";
import { ApplicationWorkerHostBridgeClient } from "./application-worker-host-bridge-client.js";
import { ApplicationWorkerRuntime } from "./application-worker-runtime.js";
import {
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
  APPLICATION_ENGINE_METHOD_GET_STATUS,
  APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_COMMAND,
  APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_QUERY,
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_ROUTE_REQUEST,
  APPLICATION_ENGINE_METHOD_STOP,
  APPLICATION_ENGINE_NOTIFICATION_METHOD,
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

const writeFrame = (frame: Record<string, unknown>): void => {
  process.stdout.write(`${JSON.stringify(frame)}\n`);
};

const hostBridgeClient = new ApplicationWorkerHostBridgeClient(writeFrame);
const runtime = new ApplicationWorkerRuntime(
  async (params: ApplicationWorkerNotificationParams) => {
    writeFrame({
      jsonrpc: "2.0",
      method: APPLICATION_ENGINE_NOTIFICATION_METHOD,
      params,
    });
  },
  async (input) => hostBridgeClient.invokeRuntimeControl(input),
);

const respondSuccess = (id: string | number | null, result: unknown): void => {
  writeFrame({ jsonrpc: "2.0", id, result });
};

const respondError = (id: string | number | null, message: string): void => {
  writeFrame({
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
    respondError(null, `Invalid JSON request: ${String(error)}`);
    return;
  }

  if (!request.method && hostBridgeClient.handleResponse(request as Record<string, unknown>)) {
    return;
  }

  const id = request.id ?? null;
  const method = request.method ?? "";
  const params = request.params ?? {};

  try {
    switch (method) {
      case APPLICATION_ENGINE_METHOD_LOAD_DEFINITION:
        respondSuccess(id, await runtime.loadDefinition(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_GET_STATUS:
        respondSuccess(id, runtime.getStatus());
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_QUERY:
        respondSuccess(id, await runtime.invokeQuery(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_COMMAND:
        respondSuccess(id, await runtime.invokeCommand(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_ROUTE_REQUEST:
        respondSuccess(id, await runtime.routeRequest(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL:
        respondSuccess(id, await runtime.executeGraphql(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER:
        respondSuccess(id, await runtime.invokeEventHandler(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER:
        respondSuccess(id, await runtime.invokeArtifactHandler(params as never));
        break;
      case APPLICATION_ENGINE_METHOD_STOP:
        await runtime.stop();
        respondSuccess(id, { stopped: true });
        process.exit(0);
        break;
      default:
        respondError(id, `Unsupported worker method '${method}'.`);
        break;
    }
  } catch (error) {
    respondError(id, error instanceof Error ? error.message : String(error));
  }
});

rl.on("close", () => {
  void runtime.stop().finally(() => {
    process.exit(0);
  });
});
