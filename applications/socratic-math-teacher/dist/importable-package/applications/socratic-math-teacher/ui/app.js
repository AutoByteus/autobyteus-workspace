// ../../autobyteus-application-frontend-sdk/dist/application-client.js
var createApplicationClient = (options) => {
  const getRequestContext = () => options.requestContext ?? { applicationId: options.applicationId };
  return {
    getApplicationInfo: () => ({
      applicationId: options.applicationId,
      requestContext: getRequestContext()
    }),
    agentCommunication: {
      connect: (address, connectOptions) => options.transport.connectAgentCommunication(address, connectOptions)
    },
    notifications: {
      subscribe: (listener) => options.transport.subscribeNotifications?.({ applicationId: options.applicationId, listener }) ?? { close: () => void 0 }
    },
    backend: {
      query: (queryName, input) => options.transport.invokeQuery({
        applicationId: options.applicationId,
        queryName,
        requestContext: getRequestContext(),
        input: input ?? null
      }),
      command: (commandName, input) => options.transport.invokeCommand({
        applicationId: options.applicationId,
        commandName,
        requestContext: getRequestContext(),
        input: input ?? null
      }),
      graphql: (request) => options.transport.executeGraphql({
        applicationId: options.applicationId,
        requestContext: getRequestContext(),
        request
      }),
      route: (request) => {
        if (!options.transport.invokeRoute)
          throw new Error("The application transport does not support route invocation.");
        return options.transport.invokeRoute({ applicationId: options.applicationId, requestContext: getRequestContext(), request });
      },
      connectWebSocket: (path, connectOptions) => {
        if (!options.transport.connectWebSocket)
          throw new Error("The application transport does not support WebSocket connections.");
        return options.transport.connectWebSocket(path, connectOptions);
      }
    }
  };
};

// ../../autobyteus-application-sdk-contracts/dist/application-iframe-contract.js
var APPLICATION_IFRAME_CHANNEL = "autobyteus.application.host";
var APPLICATION_IFRAME_CONTRACT_VERSION = "4";
var APPLICATION_IFRAME_READY_EVENT = "autobyteus.application.ui.ready";
var APPLICATION_IFRAME_BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap";
var APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = "autobyteusContractVersion";
var APPLICATION_IFRAME_QUERY_APPLICATION_ID = "autobyteusApplicationId";
var APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID = "autobyteusIframeLaunchId";
var APPLICATION_IFRAME_QUERY_HOST_ORIGIN = "autobyteusHostOrigin";
var PACKAGED_HOST_ORIGIN = "file://";
var isObjectRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var isNullableString = (value) => value === null || typeof value === "string";
var hasOnlyKeys = (record, keys) => {
  const recordKeys = Object.keys(record);
  return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
var doesApplicationHostOriginMatch = (expectedNormalizedHostOrigin, actualOrigin) => {
  const normalizedActualOrigin = (actualOrigin ?? "").trim();
  if (expectedNormalizedHostOrigin === PACKAGED_HOST_ORIGIN) {
    return normalizedActualOrigin === PACKAGED_HOST_ORIGIN || normalizedActualOrigin === "null";
  }
  return normalizedActualOrigin === expectedNormalizedHostOrigin;
};
var isApplicationIframeEnvelope = (value) => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return value.channel === APPLICATION_IFRAME_CHANNEL && typeof value.contractVersion === "string" && typeof value.eventName === "string" && isObjectRecord(value.payload);
};
var isApplicationHostTransport = (value) => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, ["backendBaseUrl", "backendNotificationsUrl", "backendWebSocketBaseUrl", "agentCommunicationWebSocketBaseUrl"]) && isNullableString(value.backendBaseUrl) && isNullableString(value.backendNotificationsUrl) && isNullableString(value.backendWebSocketBaseUrl) && isNullableString(value.agentCommunicationWebSocketBaseUrl);
};
var isApplicationBootstrapPayload = (value) => {
  if (!isObjectRecord(value)) {
    return false;
  }
  const host = value.host;
  const application = value.application;
  const requestContext = value.requestContext;
  const transport = value.transport;
  return hasOnlyKeys(value, ["host", "application", "iframeLaunchId", "requestContext", "transport"]) && isObjectRecord(host) && hasOnlyKeys(host, ["origin"]) && isNonEmptyString(host.origin) && isObjectRecord(application) && hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"]) && isNonEmptyString(application.applicationId) && isNonEmptyString(application.localApplicationId) && isNonEmptyString(application.packageId) && isNonEmptyString(application.name) && isNonEmptyString(value.iframeLaunchId) && isObjectRecord(requestContext) && hasOnlyKeys(requestContext, ["applicationId"]) && isNonEmptyString(requestContext.applicationId) && isApplicationHostTransport(transport);
};
var isApplicationHostBootstrapEnvelope = (value) => isApplicationIframeEnvelope(value) && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION && value.eventName === APPLICATION_IFRAME_BOOTSTRAP_EVENT && isApplicationBootstrapPayload(value.payload);
var createApplicationUiReadyEnvelope = (payload) => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload
});
var readApplicationIframeLaunchHints = (search) => {
  const searchParams = new URLSearchParams(search);
  const contractVersion = searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)?.trim() ?? "";
  const applicationId = searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_ID)?.trim() ?? "";
  const iframeLaunchId = searchParams.get(APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID)?.trim() ?? "";
  const hostOrigin = searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)?.trim() ?? "";
  if (contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION || !applicationId || !iframeLaunchId || !hostOrigin) {
    return null;
  }
  return {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
    applicationId,
    iframeLaunchId,
    hostOrigin
  };
};

// ../../autobyteus-application-sdk-contracts/dist/application-agent-communication.js
var APPLICATION_AGENT_COMMUNICATION_PROTOCOL = "autobyteus.application-agent-communication.v1";
var ApplicationAgentConnectionError = class extends Error {
  code;
  recoverable;
  constructor(input) {
    super(input.message);
    this.name = "ApplicationAgentConnectionError";
    this.code = input.code;
    this.recoverable = input.recoverable;
  }
};

// ../../autobyteus-application-sdk-contracts/dist/application-agent-target-path.js
var getApplicationAgentTargetPathSegments = (address) => {
  const bindingId = address.bindingId.trim();
  if (!bindingId)
    throw new Error("Application agent bindingId is required.");
  if (address.target.kind === "AGENT_RUN")
    return [bindingId, "targets", "agent-run"];
  if (address.target.kind === "AGENT_TEAM_RUN")
    return [bindingId, "targets", "agent-team-run"];
  const memberRouteKey = address.target.memberRouteKey.trim();
  if (!memberRouteKey)
    throw new Error("Application agent memberRouteKey is required.");
  return [bindingId, "targets", "agent-team-member", memberRouteKey];
};

// ../../autobyteus-application-sdk-contracts/dist/application-runtime-bootstrap.js
var isObjectRecord2 = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var hasOnlyKeys2 = (record, keys) => {
  const recordKeys = Object.keys(record);
  return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var isNullableAbsoluteUrl = (value, allowedProtocols) => {
  if (value === null) {
    return true;
  }
  if (!isNonEmptyString2(value)) {
    return false;
  }
  try {
    return allowedProtocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
};
var isApplicationRuntimeBootstrap = (value) => {
  if (!isObjectRecord2(value) || !hasOnlyKeys2(value, ["contractVersion", "application", "transport"])) {
    return false;
  }
  if (value.contractVersion !== "1") {
    return false;
  }
  const application = value.application;
  const transport = value.transport;
  if (!isObjectRecord2(application) || !hasOnlyKeys2(application, ["applicationId", "localApplicationId", "packageId", "name"]) || !isNonEmptyString2(application.applicationId) || !isNonEmptyString2(application.localApplicationId) || !isNonEmptyString2(application.packageId) || !isNonEmptyString2(application.name)) {
    return false;
  }
  return isObjectRecord2(transport) && hasOnlyKeys2(transport, [
    "backendBaseUrl",
    "backendNotificationsUrl",
    "backendWebSocketBaseUrl",
    "agentCommunicationWebSocketBaseUrl"
  ]) && isNullableAbsoluteUrl(transport.backendBaseUrl, /* @__PURE__ */ new Set(["http:", "https:"])) && transport.backendBaseUrl !== null && isNullableAbsoluteUrl(transport.backendNotificationsUrl, /* @__PURE__ */ new Set(["ws:", "wss:"])) && isNullableAbsoluteUrl(transport.backendWebSocketBaseUrl, /* @__PURE__ */ new Set(["ws:", "wss:"])) && isNullableAbsoluteUrl(transport.agentCommunicationWebSocketBaseUrl, /* @__PURE__ */ new Set(["ws:", "wss:"]));
};
var normalizeStudioIframeBootstrap = (payload) => {
  const runtimeBootstrap = {
    contractVersion: "1",
    application: structuredClone(payload.application),
    transport: {
      backendBaseUrl: payload.transport.backendBaseUrl?.trim() ?? "",
      backendNotificationsUrl: payload.transport.backendNotificationsUrl,
      backendWebSocketBaseUrl: payload.transport.backendWebSocketBaseUrl,
      agentCommunicationWebSocketBaseUrl: payload.transport.agentCommunicationWebSocketBaseUrl
    }
  };
  if (!isApplicationRuntimeBootstrap(runtimeBootstrap)) {
    throw new Error("The Studio host supplied invalid application runtime endpoints.");
  }
  return runtimeBootstrap;
};

// ../../autobyteus-application-sdk-contracts/dist/standalone-application-bootstrap.js
var STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION = "1";
var STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX = "/_autobyteus/";
var isObjectRecord3 = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var hasOnlyKeys3 = (record, keys) => {
  const recordKeys = Object.keys(record);
  return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
var isNonEmptyString3 = (value) => typeof value === "string" && value.trim().length > 0;
var isConfinedStandalonePlatformPath = (value) => {
  if (!isNonEmptyString3(value) || !value.startsWith(STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX)) {
    return false;
  }
  if (value.includes("\\") || value.includes("?") || value.includes("#") || value.includes("\0")) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith(STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX)) {
      return false;
    }
    const segments = decoded.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  } catch {
    return false;
  }
};
var isNullablePlatformPath = (value) => value === null || isConfinedStandalonePlatformPath(value);
var isStandaloneApplicationBootstrapPayload = (value) => {
  if (!isObjectRecord3(value) || !hasOnlyKeys3(value, ["contractVersion", "application", "transportPaths"])) {
    return false;
  }
  if (value.contractVersion !== STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION) {
    return false;
  }
  const application = value.application;
  const transportPaths = value.transportPaths;
  return isObjectRecord3(application) && hasOnlyKeys3(application, ["applicationId", "localApplicationId", "packageId", "name"]) && isNonEmptyString3(application.applicationId) && isNonEmptyString3(application.localApplicationId) && isNonEmptyString3(application.packageId) && isNonEmptyString3(application.name) && isObjectRecord3(transportPaths) && hasOnlyKeys3(transportPaths, [
    "backendBasePath",
    "backendNotificationsPath",
    "backendWebSocketBasePath",
    "agentCommunicationWebSocketBasePath"
  ]) && isConfinedStandalonePlatformPath(transportPaths.backendBasePath) && isNullablePlatformPath(transportPaths.backendNotificationsPath) && isNullablePlatformPath(transportPaths.backendWebSocketBasePath) && isNullablePlatformPath(transportPaths.agentCommunicationWebSocketBasePath);
};
var validateStandaloneApplicationBootstrapPayload = (value) => {
  if (!isStandaloneApplicationBootstrapPayload(value)) {
    throw new Error("The standalone application bootstrap response is invalid.");
  }
  return value;
};

// ../../autobyteus-application-frontend-sdk/dist/application-backend-websocket-connection.js
var APPLICATION_BACKEND_WEBSOCKET_FRAME_BYTES_LIMIT = 1024 * 1024;
var ERROR_DETAILS = {
  CONNECTION_NOT_READY: { message: "The application backend WebSocket connection is not ready.", recoverable: true },
  CONNECTION_CLOSED: { message: "The application backend WebSocket connection is closed.", recoverable: true },
  CONNECTION_ABORTED: { message: "The application backend WebSocket connection was aborted.", recoverable: true },
  CONNECTION_REJECTED: { message: "The application backend WebSocket connection was rejected.", recoverable: true },
  PROTOCOL_ERROR: { message: "The application backend WebSocket readiness protocol was invalid.", recoverable: false },
  FRAME_TOO_LARGE: { message: "The application backend WebSocket frame exceeds the delivery limit.", recoverable: false },
  BACKPRESSURE_LIMIT: { message: "The application backend WebSocket exceeded its delivery limit.", recoverable: true },
  BACKEND_UNAVAILABLE: { message: "The application backend WebSocket handler is unavailable.", recoverable: true },
  TRANSPORT_FAILED: { message: "The application backend WebSocket transport failed.", recoverable: true },
  SEND_FAILED: { message: "The application backend WebSocket frame could not be sent.", recoverable: true }
};
var ApplicationBackendWebSocketConnectionError = class extends Error {
  code;
  recoverable;
  constructor(code) {
    super(ERROR_DETAILS[code].message);
    this.code = code;
    this.name = "ApplicationBackendWebSocketConnectionError";
    this.recoverable = ERROR_DETAILS[code].recoverable;
  }
};
var READY_PROTOCOL = "autobyteus.application-backend.websocket.v1";
var exactReady = (frame) => {
  if (frame.kind !== "text")
    return false;
  try {
    const value = JSON.parse(frame.text);
    return Object.keys(value).length === 2 && value.protocol === READY_PROTOCOL && value.type === "CONNECTION_READY";
  } catch {
    return false;
  }
};
var normalizeFrame = (frame) => {
  if (typeof frame === "string")
    return { kind: "text", text: frame };
  if (frame instanceof Uint8Array)
    return { kind: "binary", data: new Uint8Array(frame) };
  return frame.kind === "binary" ? { kind: "binary", data: new Uint8Array(frame.data) } : { kind: "text", text: frame.text };
};
var frameBytes = (frame) => frame.kind === "text" ? new TextEncoder().encode(frame.text).byteLength : frame.data.byteLength;
var codeForClose = (code, wasOpen) => {
  if (code === 1e3)
    return null;
  if (code === 1002)
    return "PROTOCOL_ERROR";
  if (code === 1009)
    return "FRAME_TOO_LARGE";
  if (code === 1012)
    return "BACKEND_UNAVAILABLE";
  if (code === 1013)
    return "BACKPRESSURE_LIMIT";
  if (code === 1011)
    return wasOpen ? "BACKEND_UNAVAILABLE" : "CONNECTION_REJECTED";
  return "TRANSPORT_FAILED";
};
var createApplicationBackendWebSocketConnection = (input) => {
  let state = "connecting";
  let readySettled = false;
  let closed = false;
  let everOpened = false;
  let errorDispatched = false;
  const messages = /* @__PURE__ */ new Set();
  const errors = /* @__PURE__ */ new Set();
  const closes = /* @__PURE__ */ new Set();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void ready.catch(() => void 0);
  let releases = [];
  const dispatchError = (error) => {
    errorDispatched = true;
    for (const listener of errors)
      queueMicrotask(() => {
        try {
          listener(error);
        } catch {
        }
      });
  };
  const rejectEstablishment = (code, emit) => {
    if (readySettled)
      return;
    readySettled = true;
    const error = new ApplicationBackendWebSocketConnectionError(code);
    rejectReady(error);
    if (emit)
      dispatchError(error);
  };
  const finalize = (event) => {
    if (closed)
      return;
    closed = true;
    state = "closed";
    const code = codeForClose(event.code, everOpened);
    if (!readySettled)
      rejectEstablishment(code ?? "CONNECTION_REJECTED", code !== null);
    else if (code && !errorDispatched)
      dispatchError(new ApplicationBackendWebSocketConnectionError(code));
    input.signal?.removeEventListener("abort", abort);
    for (const release of releases.splice(0))
      release();
    for (const listener of closes)
      queueMicrotask(() => {
        try {
          listener(event);
        } catch {
        }
      });
  };
  const protocolFailure = () => {
    if (state !== "connecting")
      return;
    state = "closing";
    rejectEstablishment("PROTOCOL_ERROR", true);
    try {
      input.transport.close(1002, "Invalid readiness protocol");
    } catch {
      finalize({ code: 1002, reason: "Invalid readiness protocol", wasClean: false });
    }
  };
  const abort = () => {
    if (state === "closed" || state === "closing")
      return;
    const wasConnecting = state === "connecting";
    state = "closing";
    if (wasConnecting)
      rejectEstablishment("CONNECTION_ABORTED", false);
    try {
      input.transport.close(1e3, "Aborted");
    } catch {
      finalize({ code: 1e3, reason: "Aborted", wasClean: true });
    }
  };
  releases = [
    input.transport.onMessage((frame) => {
      if (state === "connecting") {
        if (!exactReady(frame)) {
          protocolFailure();
          return;
        }
        state = "open";
        everOpened = true;
        readySettled = true;
        resolveReady();
        return;
      }
      if (state !== "open")
        return;
      for (const listener of messages)
        queueMicrotask(() => {
          try {
            listener(frame);
          } catch {
          }
        });
    }),
    input.transport.onError(() => {
      if (state === "connecting") {
        state = "closing";
        rejectEstablishment("TRANSPORT_FAILED", true);
      } else if (state === "open")
        dispatchError(new ApplicationBackendWebSocketConnectionError("TRANSPORT_FAILED"));
    }),
    input.transport.onClose(finalize)
  ];
  input.signal?.addEventListener("abort", abort, { once: true });
  if (input.signal?.aborted)
    abort();
  return {
    get state() {
      return state;
    },
    ready,
    send: async (value) => {
      if (state === "connecting")
        throw new ApplicationBackendWebSocketConnectionError("CONNECTION_NOT_READY");
      if (state !== "open")
        throw new ApplicationBackendWebSocketConnectionError("CONNECTION_CLOSED");
      const frame = normalizeFrame(value);
      if (frameBytes(frame) > APPLICATION_BACKEND_WEBSOCKET_FRAME_BYTES_LIMIT) {
        throw new ApplicationBackendWebSocketConnectionError("FRAME_TOO_LARGE");
      }
      try {
        input.transport.send(frame);
      } catch {
        const error = new ApplicationBackendWebSocketConnectionError("SEND_FAILED");
        dispatchError(error);
        state = "closing";
        try {
          input.transport.close(1011, "Send failed");
        } catch {
        }
        throw error;
      }
    },
    onMessage: (listener) => {
      messages.add(listener);
      return () => messages.delete(listener);
    },
    onError: (listener) => {
      errors.add(listener);
      return () => errors.delete(listener);
    },
    onClose: (listener) => {
      closes.add(listener);
      return () => closes.delete(listener);
    },
    close: (code = 1e3, reason = "") => {
      if (state === "closed" || state === "closing")
        return;
      const wasConnecting = state === "connecting";
      state = "closing";
      if (wasConnecting)
        rejectEstablishment("CONNECTION_ABORTED", false);
      try {
        input.transport.close(code, reason);
      } catch {
        finalize({ code, reason, wasClean: code === 1e3 });
      }
    }
  };
};

// ../../autobyteus-application-frontend-sdk/dist/application-backend-websocket-transport.js
var toBinaryFrame = async (value) => {
  if (value instanceof ArrayBuffer)
    return { kind: "binary", data: new Uint8Array(value) };
  if (value instanceof Uint8Array)
    return { kind: "binary", data: value };
  if (value && typeof value === "object" && "arrayBuffer" in value) {
    const arrayBuffer = await value.arrayBuffer();
    return { kind: "binary", data: new Uint8Array(arrayBuffer) };
  }
  return null;
};
var createApplicationBackendWebSocketTransport = (input) => {
  const factory = input.webSocketFactory ?? ((url) => {
    const Constructor = globalThis.WebSocket;
    if (!Constructor)
      throw new Error("A WebSocket implementation is required.");
    return new Constructor(url);
  });
  const socket = factory(input.url);
  socket.binaryType = "arraybuffer";
  let messageTail = Promise.resolve();
  const bind = (type, listener) => {
    socket.addEventListener(type, listener);
    return () => socket.removeEventListener(type, listener);
  };
  return {
    send: (frame) => socket.send(frame.kind === "text" ? frame.text : frame.data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (listener) => bind("message", (event) => {
      messageTail = messageTail.then(async () => {
        if (typeof event.data === "string") {
          listener({ kind: "text", text: event.data });
          return;
        }
        const frame = await toBinaryFrame(event.data);
        if (frame)
          listener(frame);
      }).catch(() => void 0);
    }),
    onError: (listener) => bind("error", () => listener()),
    onClose: (listener) => bind("close", (event) => listener({
      code: event.code ?? 1006,
      reason: event.reason ?? "",
      wasClean: event.wasClean === true
    }))
  };
};

// ../../autobyteus-application-frontend-sdk/dist/application-agent-event-validator.js
var isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var isString = (value) => typeof value === "string";
var isNullableString2 = (value) => value === null || isString(value);
var isStringArray = (value) => Array.isArray(value) && value.every(isString);
var isOneOf = (...allowed) => (value) => typeof value === "string" && allowed.includes(value);
var exact = (value, shape) => {
  if (!isRecord(value))
    return false;
  const keys = Object.keys(shape);
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key) && shape[key](value[key]));
};
var isApplicationAgentTargetAddress = (value) => {
  if (!isRecord(value) || !exact(value, { bindingId: isString, target: isRecord }))
    return false;
  const bindingId = value.bindingId;
  const target = value.target;
  if (typeof bindingId !== "string" || !bindingId.trim() || !isRecord(target) || typeof target.kind !== "string")
    return false;
  if (target.kind === "AGENT_RUN")
    return exact(target, { kind: isOneOf("AGENT_RUN") });
  if (target.kind === "AGENT_TEAM_RUN")
    return exact(target, { kind: isOneOf("AGENT_TEAM_RUN") });
  return target.kind === "AGENT_TEAM_MEMBER" && exact(target, {
    kind: isOneOf("AGENT_TEAM_MEMBER"),
    memberRouteKey: (memberRouteKey) => typeof memberRouteKey === "string" && memberRouteKey.trim().length > 0
  });
};
var isProducer = (value) => exact(value, {
  runId: isString,
  memberRouteKey: isString,
  memberName: isNullableString2,
  displayName: isNullableString2,
  runtimeKind: isOneOf("AGENT", "AGENT_TEAM_MEMBER"),
  teamPath: isStringArray
});
var isStreamEvent = (value) => {
  if (!isRecord(value) || typeof value.type !== "string")
    return false;
  switch (value.type) {
    case "TURN_STARTED":
    case "TURN_COMPLETED":
    case "TURN_INTERRUPTED":
      return exact(value, { type: isOneOf(value.type) });
    case "TEXT_DELTA":
      return exact(value, {
        type: isOneOf("TEXT_DELTA"),
        delta: (delta) => typeof delta === "string" && delta.length > 0
      });
    case "ERROR":
      return exact(value, {
        type: isOneOf("ERROR"),
        message: (message) => typeof message === "string" && message.length > 0
      });
    default:
      return false;
  }
};
var isApplicationAgentEvent = (value) => {
  if (!isRecord(value) || !exact(value, {
    sequence: (sequence) => typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence > 0,
    observedAt: isString,
    applicationId: isString,
    address: isApplicationAgentTargetAddress,
    runtimeSubject: isOneOf("AGENT_RUN", "TEAM_RUN"),
    producer: isProducer,
    event: isStreamEvent
  }))
    return false;
  const address = value.address;
  const expectedRuntimeSubject = address.target.kind === "AGENT_RUN" ? "AGENT_RUN" : "TEAM_RUN";
  return value.runtimeSubject === expectedRuntimeSubject;
};

// ../../autobyteus-application-frontend-sdk/dist/application-agent-server-frame-parser.js
var APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT = 1024 * 1024;
var ERROR_CODES = /* @__PURE__ */ new Set([
  "APPLICATION_NOT_AVAILABLE",
  "TARGET_NOT_AVAILABLE",
  "INVALID_TARGET",
  "RUNTIME_NOT_ACTIVE",
  "CONNECTION_ABORTED",
  "PROTOCOL_ERROR",
  "INPUT_REJECTED",
  "EVENT_MAPPING_FAILED",
  "EVENT_SERIALIZATION_FAILED",
  "BACKPRESSURE_LIMIT",
  "TRANSPORT_FAILED"
]);
var CLOSE_REASONS = /* @__PURE__ */ new Set([
  "CLIENT_CLOSED",
  "ABORTED",
  "ESTABLISHMENT_FAILED",
  "BINDING_ENDED",
  "STREAM_FAILED",
  "BACKPRESSURE_LIMIT",
  "PROTOCOL_ERROR",
  "TRANSPORT_FAILED"
]);
var isRecord2 = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var hasExactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
var isError = (value) => isRecord2(value) && hasExactKeys(value, ["code", "message", "recoverable"]) && typeof value.code === "string" && ERROR_CODES.has(value.code) && typeof value.message === "string" && typeof value.recoverable === "boolean";
var isClose = (value) => isRecord2(value) && hasExactKeys(value, ["reason"]) && typeof value.reason === "string" && CLOSE_REASONS.has(value.reason);
var sameApplicationAgentTargetAddress = (left, right) => JSON.stringify(left) === JSON.stringify(right);
var parseApplicationAgentServerFrame = (raw) => {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT) {
    return null;
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord2(value) || value.protocol !== APPLICATION_AGENT_COMMUNICATION_PROTOCOL || typeof value.type !== "string") {
    return null;
  }
  if (value.type === "READY") {
    return hasExactKeys(value, ["protocol", "type", "address"]) && isApplicationAgentTargetAddress(value.address) ? value : null;
  }
  if (value.type === "INPUT_ACCEPTED") {
    return hasExactKeys(value, ["protocol", "type", "requestId"]) && typeof value.requestId === "string" && value.requestId.length > 0 ? value : null;
  }
  if (value.type === "INPUT_REJECTED") {
    return hasExactKeys(value, ["protocol", "type", "requestId", "error"]) && typeof value.requestId === "string" && value.requestId.length > 0 && isError(value.error) ? value : null;
  }
  if (value.type === "EVENT") {
    return hasExactKeys(value, ["protocol", "type", "event"]) && isApplicationAgentEvent(value.event) ? value : null;
  }
  if (value.type === "ERROR") {
    return hasExactKeys(value, ["protocol", "type", "error"]) && isError(value.error) ? value : null;
  }
  if (value.type === "CLOSED") {
    return hasExactKeys(value, ["protocol", "type", "close"]) && isClose(value.close) ? value : null;
  }
  return null;
};

// ../../autobyteus-application-frontend-sdk/dist/application-agent-connection.js
var APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT = 1024 * 1024;
var requestSequence = 0;
var nextRequestId = () => {
  const randomUUID = globalThis.crypto?.randomUUID;
  return randomUUID ? randomUUID.call(globalThis.crypto) : `application-agent-input-${Date.now()}-${++requestSequence}`;
};
var hasOnlyKeys4 = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
var createApplicationAgentConnection = (input) => {
  const address = structuredClone(input.address);
  let state = "connecting";
  let readySettled = false;
  let closeEmitted = false;
  let announcedClose = null;
  const events = /* @__PURE__ */ new Set();
  const errors = /* @__PURE__ */ new Set();
  const closes = /* @__PURE__ */ new Set();
  const pendingInputs = /* @__PURE__ */ new Map();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void ready.catch(() => void 0);
  let releases = [];
  const dispatch = (listeners, value) => {
    for (const listener of listeners)
      queueMicrotask(() => {
        try {
          listener(value);
        } catch {
        }
      });
  };
  const settleReadyFailure = (error, emit) => {
    if (!readySettled) {
      readySettled = true;
      rejectReady(error);
    }
    if (emit)
      dispatch(errors, error);
  };
  const rejectInputs = (error) => {
    for (const pending of pendingInputs.values())
      pending.reject(error);
    pendingInputs.clear();
  };
  const emitClose = (reason) => {
    if (closeEmitted)
      return;
    closeEmitted = true;
    state = "closed";
    input.signal?.removeEventListener("abort", abort);
    for (const release of releases.splice(0))
      release();
    rejectInputs(new ApplicationAgentConnectionError({
      code: "TRANSPORT_FAILED",
      message: "The application agent connection transport failed.",
      recoverable: true
    }));
    dispatch(closes, { reason });
  };
  const fail = (error, reason) => {
    if (state === "closed" || state === "closing")
      return;
    const wasConnecting = state === "connecting";
    state = "closing";
    announcedClose = reason;
    if (wasConnecting)
      settleReadyFailure(error, true);
    else
      dispatch(errors, error);
  };
  const failProtocol = () => {
    fail(new ApplicationAgentConnectionError({
      code: "PROTOCOL_ERROR",
      message: "The application agent connection protocol was invalid.",
      recoverable: false
    }), "PROTOCOL_ERROR");
    try {
      input.transport.close(1002, "Protocol error");
    } catch {
      emitClose("PROTOCOL_ERROR");
    }
  };
  const onMessage = (raw) => {
    const frame = parseApplicationAgentServerFrame(raw);
    if (!frame) {
      failProtocol();
      return;
    }
    if (state === "connecting") {
      if (frame.type === "ERROR" && hasOnlyKeys4(frame, ["protocol", "type", "error"])) {
        fail(new ApplicationAgentConnectionError(frame.error), "ESTABLISHMENT_FAILED");
        return;
      }
      if (frame.type !== "READY" || !sameApplicationAgentTargetAddress(frame.address, address)) {
        failProtocol();
        return;
      }
      state = "open";
      readySettled = true;
      resolveReady();
      return;
    }
    if (state === "closing") {
      if (frame.type === "CLOSED") {
        announcedClose = frame.close.reason;
        emitClose(frame.close.reason);
        try {
          input.transport.close(1e3, "");
        } catch {
        }
      }
      return;
    }
    if (state !== "open")
      return;
    if (frame.type === "EVENT" && hasOnlyKeys4(frame, ["protocol", "type", "event"])) {
      if (!sameApplicationAgentTargetAddress(frame.event.address, address)) {
        failProtocol();
        return;
      }
      dispatch(events, frame.event);
      return;
    }
    if ((frame.type === "INPUT_ACCEPTED" || frame.type === "INPUT_REJECTED") && typeof frame.requestId === "string") {
      const expected = frame.type === "INPUT_ACCEPTED" ? ["protocol", "type", "requestId"] : ["protocol", "type", "requestId", "error"];
      if (!hasOnlyKeys4(frame, expected))
        return failProtocol();
      const pending = pendingInputs.get(frame.requestId);
      if (!pending) {
        failProtocol();
        return;
      }
      pendingInputs.delete(frame.requestId);
      if (frame.type === "INPUT_ACCEPTED")
        pending.resolve();
      else
        pending.reject(new ApplicationAgentConnectionError(frame.error));
      return;
    }
    if (frame.type === "ERROR" && hasOnlyKeys4(frame, ["protocol", "type", "error"])) {
      dispatch(errors, new ApplicationAgentConnectionError(frame.error));
      return;
    }
    if (frame.type === "CLOSED" && hasOnlyKeys4(frame, ["protocol", "type", "close"])) {
      state = "closing";
      announcedClose = frame.close.reason;
      emitClose(frame.close.reason);
      try {
        input.transport.close(1e3, "");
      } catch {
      }
      return;
    }
    failProtocol();
  };
  const onTransportFailure = () => {
    if (state === "closed" || state === "closing")
      return;
    fail(new ApplicationAgentConnectionError({
      code: "TRANSPORT_FAILED",
      message: "The application agent connection transport failed.",
      recoverable: true
    }), "TRANSPORT_FAILED");
  };
  const abort = () => {
    if (state === "closed" || state === "closing")
      return;
    const wasConnecting = state === "connecting";
    state = "closing";
    announcedClose = "ABORTED";
    if (wasConnecting)
      settleReadyFailure(new ApplicationAgentConnectionError({
        code: "CONNECTION_ABORTED",
        message: "Application agent connection was aborted.",
        recoverable: true
      }), false);
    try {
      input.transport.close(1e3, "Aborted");
    } catch {
      emitClose("ABORTED");
    }
  };
  releases = [
    input.transport.onMessage(onMessage),
    input.transport.onError(onTransportFailure),
    input.transport.onClose(() => {
      if (state === "connecting")
        onTransportFailure();
      emitClose(announcedClose ?? "TRANSPORT_FAILED");
    })
  ];
  input.signal?.addEventListener("abort", abort, { once: true });
  if (input.signal?.aborted)
    abort();
  return {
    get address() {
      return structuredClone(address);
    },
    get state() {
      return state;
    },
    ready,
    sendInput: (agentInput) => {
      if (state !== "open") {
        return Promise.reject(new ApplicationAgentConnectionError({
          code: state === "connecting" ? "INPUT_REJECTED" : "TRANSPORT_FAILED",
          message: state === "connecting" ? "Application agent input was rejected." : "The application agent connection transport failed.",
          recoverable: true
        }));
      }
      const requestId = nextRequestId();
      return new Promise((resolve, reject) => {
        let serialized;
        try {
          const frame = {
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "INPUT",
            requestId,
            input: structuredClone(agentInput)
          };
          serialized = JSON.stringify(frame);
          if (new TextEncoder().encode(serialized).byteLength > APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT) {
            reject(new ApplicationAgentConnectionError({
              code: "INPUT_REJECTED",
              message: "Application agent input was rejected.",
              recoverable: true
            }));
            return;
          }
        } catch {
          reject(new ApplicationAgentConnectionError({
            code: "INPUT_REJECTED",
            message: "Application agent input was rejected.",
            recoverable: true
          }));
          return;
        }
        pendingInputs.set(requestId, { resolve, reject });
        try {
          input.transport.send(serialized);
        } catch {
          pendingInputs.delete(requestId);
          reject(new ApplicationAgentConnectionError({
            code: "TRANSPORT_FAILED",
            message: "The application agent connection transport failed.",
            recoverable: true
          }));
        }
      });
    },
    onEvent: (listener) => {
      events.add(listener);
      return () => {
        events.delete(listener);
      };
    },
    onError: (listener) => {
      errors.add(listener);
      return () => {
        errors.delete(listener);
      };
    },
    onClose: (listener) => {
      closes.add(listener);
      return () => {
        closes.delete(listener);
      };
    },
    close: () => {
      if (state === "closed" || state === "closing")
        return;
      const wasConnecting = state === "connecting";
      state = "closing";
      announcedClose = "CLIENT_CLOSED";
      if (wasConnecting)
        settleReadyFailure(new ApplicationAgentConnectionError({
          code: "CONNECTION_ABORTED",
          message: "Application agent connection was aborted.",
          recoverable: true
        }), false);
      try {
        input.transport.close(1e3, "");
      } catch {
        emitClose("CLIENT_CLOSED");
      }
    }
  };
};

// ../../autobyteus-application-frontend-sdk/dist/application-agent-connection-transport.js
var createApplicationAgentConnectionTransport = (input) => {
  const factory = input.webSocketFactory ?? ((url) => {
    const WebSocketConstructor = globalThis.WebSocket;
    if (!WebSocketConstructor)
      throw new Error("A WebSocket implementation is required.");
    return new WebSocketConstructor(url);
  });
  const socket = factory(input.url);
  const bind = (type, listener) => {
    socket.addEventListener(type, listener);
    return () => socket.removeEventListener(type, listener);
  };
  return {
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (listener) => bind("message", (event) => listener(event?.data)),
    onError: (listener) => bind("error", listener),
    onClose: (listener) => bind("close", (event) => listener({
      code: typeof event?.code === "number" ? event.code : 1006,
      reason: typeof event?.reason === "string" ? event.reason : "",
      wasClean: event?.wasClean === true
    }))
  };
};

// ../../autobyteus-application-frontend-sdk/dist/application-websocket-url.js
var ApplicationWebSocketUrlError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ApplicationWebSocketUrlError";
  }
};
var parseApplicationWebSocketPath = (path) => {
  const value = path.trim();
  if (!value || value.includes("?") || value.includes("#") || value.includes("://")) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
  }
  const segments = value.replace(/^\/+/, "").split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
  }
  return segments;
};
var composeApplicationWebSocketUrl = (input) => {
  let url;
  try {
    url = new URL(input.baseUrl);
  } catch {
    throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
  }
  if (input.pathSegments.length === 0 || input.pathSegments.some((segment) => !segment.trim())) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application WebSocket path is invalid.");
  }
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/${input.pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  for (const [key, value] of Object.entries(input.query ?? {})) {
    for (const entry of Array.isArray(value) ? value : [value])
      url.searchParams.append(key, entry);
  }
  return url.toString();
};

// ../../autobyteus-application-frontend-sdk/dist/create-application-backend-mount-transport.js
var normalizeBackendBaseUrl = (backendBaseUrl) => {
  const normalized = backendBaseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("backendBaseUrl is required.");
  }
  return normalized;
};
var resolveFetch = (fetchImpl) => {
  if (fetchImpl) {
    return fetchImpl;
  }
  const globalFetch = globalThis.fetch;
  if (typeof globalFetch !== "function") {
    throw new Error("A fetch implementation is required to use the application backend mount transport.");
  }
  return globalFetch;
};
var resolveNotificationSocketFactory = (socketFactory) => {
  if (socketFactory) {
    return socketFactory;
  }
  const GlobalWebSocket = globalThis.WebSocket;
  if (typeof GlobalWebSocket !== "function") {
    throw new Error("A WebSocket implementation is required to subscribe to application notifications.");
  }
  return (url) => new GlobalWebSocket(url);
};
var readJsonPayload = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
var readErrorMessage = async (response) => {
  const payload = await readJsonPayload(response);
  if (payload && typeof payload === "object") {
    const record = payload;
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }
  const text = await response.text().catch(() => "");
  return text || `Request failed with status ${response.status}.`;
};
var invokeJsonResult = async (fetchImpl, url, body) => {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const payload = await readJsonPayload(response);
  if (payload && typeof payload === "object" && "result" in payload) {
    return payload.result;
  }
  return payload;
};
var appendQueryParams = (url, query) => {
  const nextUrl = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value == null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        nextUrl.searchParams.append(key, entry);
      }
      continue;
    }
    nextUrl.searchParams.set(key, value);
  }
  return nextUrl.toString();
};
var normalizeRoutePath = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }
  return `/${trimmed.replace(/^\/+/, "")}`.replace(/\/+/g, "/");
};
var toRouteHeaders = (requestContext, headers) => {
  const nextHeaders = {
    accept: "application/json"
  };
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string") {
      nextHeaders[key] = value;
    }
  }
  if (requestContext && requestContext.applicationId.trim()) {
    nextHeaders["x-autobyteus-application-id"] = requestContext.applicationId.trim();
  }
  return nextHeaders;
};
var findHeaderKey = (headers, name) => {
  const normalizedName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === normalizedName) {
      return key;
    }
  }
  return null;
};
var isJsonContentType = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes("/json") || normalized.includes("+json");
};
var hasConstructorName = (value, expectedName) => !!value && typeof value === "object" && value.constructor?.name === expectedName;
var isNonJsonRouteBody = (value) => typeof value === "string" || value instanceof ArrayBuffer || ArrayBuffer.isView(value) || hasConstructorName(value, "Blob") || hasConstructorName(value, "File") || hasConstructorName(value, "FormData") || hasConstructorName(value, "URLSearchParams") || hasConstructorName(value, "ReadableStream");
var prepareRouteFetchRequest = (input) => {
  const headers = toRouteHeaders(input.requestContext, input.request.headers);
  const requestBody = input.request.body;
  if (requestBody == null || isNonJsonRouteBody(requestBody)) {
    return { headers, body: requestBody ?? void 0 };
  }
  const contentTypeHeader = findHeaderKey(headers, "content-type");
  if (!isJsonContentType(contentTypeHeader ? headers[contentTypeHeader] : null)) {
    headers[contentTypeHeader ?? "content-type"] = "application/json";
  }
  return { headers, body: JSON.stringify(requestBody) };
};
var parseRouteResponseBody = async (response) => {
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    return await readJsonPayload(response);
  }
  const text = await response.text().catch(() => "");
  return text || null;
};
var deriveApplicationBackendMountEndpoints = (backendBaseUrl) => {
  const normalizedBaseUrl = normalizeBackendBaseUrl(backendBaseUrl);
  return {
    backendBaseUrl: normalizedBaseUrl,
    queriesBaseUrl: `${normalizedBaseUrl}/queries`,
    commandsBaseUrl: `${normalizedBaseUrl}/commands`,
    graphqlUrl: `${normalizedBaseUrl}/graphql`,
    routesBaseUrl: `${normalizedBaseUrl}/routes`
  };
};
var createApplicationBackendMountTransport = (options) => {
  const endpoints = deriveApplicationBackendMountEndpoints(options.backendBaseUrl);
  const fetchImpl = resolveFetch(options.fetchImpl);
  return {
    connectAgentCommunication: (address, connectOptions) => {
      const baseUrl = options.agentCommunicationWebSocketBaseUrl?.trim();
      if (!baseUrl) {
        throw new ApplicationAgentConnectionError({
          code: "TRANSPORT_FAILED",
          message: "The application agent connection transport failed.",
          recoverable: true
        });
      }
      let url;
      try {
        url = composeApplicationWebSocketUrl({
          baseUrl,
          pathSegments: getApplicationAgentTargetPathSegments(address)
        });
      } catch {
        throw new ApplicationAgentConnectionError({
          code: "TRANSPORT_FAILED",
          message: "The application agent connection transport failed.",
          recoverable: true
        });
      }
      return createApplicationAgentConnection({
        address,
        signal: connectOptions?.signal,
        transport: createApplicationAgentConnectionTransport({
          url,
          webSocketFactory: options.agentCommunicationWebSocketFactory
        })
      });
    },
    invokeQuery: async ({ queryName, requestContext, input }) => invokeJsonResult(fetchImpl, `${endpoints.queriesBaseUrl}/${encodeURIComponent(queryName)}`, { requestContext, input }),
    invokeCommand: async ({ commandName, requestContext, input }) => invokeJsonResult(fetchImpl, `${endpoints.commandsBaseUrl}/${encodeURIComponent(commandName)}`, { requestContext, input }),
    executeGraphql: async ({ requestContext, request }) => invokeJsonResult(fetchImpl, endpoints.graphqlUrl, { requestContext, request }),
    invokeRoute: async ({ requestContext, request }) => {
      const url = appendQueryParams(`${endpoints.routesBaseUrl}${normalizeRoutePath(request.path)}`, request.query);
      const routeRequest = prepareRouteFetchRequest({ requestContext, request });
      const response = await fetchImpl(url, {
        method: request.method,
        headers: routeRequest.headers,
        body: routeRequest.body
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      return {
        status: response.status,
        body: await parseRouteResponseBody(response)
      };
    },
    subscribeNotifications: ({ listener }) => {
      const notificationsUrl = options.backendNotificationsUrl?.trim();
      if (!notificationsUrl) {
        return { close: () => void 0 };
      }
      const socket = resolveNotificationSocketFactory(options.webSocketFactory)(notificationsUrl);
      socket.addEventListener?.("message", (event) => {
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === "notification" && message.notification) {
            listener(message.notification);
          }
        } catch {
        }
      });
      return {
        close: () => {
          try {
            socket.close();
          } catch {
          }
        }
      };
    },
    connectWebSocket: (path, connectOptions) => {
      const baseUrl = options.backendWebSocketBaseUrl?.trim();
      if (!baseUrl) {
        throw new Error("The application transport does not provide a backend WebSocket base URL.");
      }
      let url;
      try {
        url = composeApplicationWebSocketUrl({
          baseUrl,
          pathSegments: parseApplicationWebSocketPath(path),
          query: connectOptions?.query
        });
      } catch {
        throw new ApplicationBackendWebSocketConnectionError("CONNECTION_REJECTED");
      }
      return createApplicationBackendWebSocketConnection({
        transport: createApplicationBackendWebSocketTransport({
          url,
          webSocketFactory: options.applicationWebSocketFactory
        }),
        signal: connectOptions?.signal
      });
    }
  };
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/application-bootstrap-provider.js
var resolveApplicationStartupWindow = () => {
  const startupWindow = globalThis.window;
  if (!startupWindow) {
    throw new Error("A browser window is required to start an application.");
  }
  return startupWindow;
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/default-application-startup-screen.js
var escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
var readCopy = (state, errorMessage) => {
  if (state === "startup_failed") {
    return {
      eyebrow: "AutoByteus application",
      title: "Application failed to start",
      description: "The application could not complete runtime startup.",
      detail: errorMessage?.trim() || null
    };
  }
  const copyByState = {
    resolving_provider: {
      eyebrow: "AutoByteus application",
      title: "Resolving application host",
      description: "Selecting the runtime bootstrap provider for this application document.",
      detail: null
    },
    acquiring_bootstrap: {
      eyebrow: "AutoByteus application",
      title: "Preparing application",
      description: "Waiting for the host to finish runtime preparation.",
      detail: null
    },
    starting_application: {
      eyebrow: "AutoByteus application",
      title: "Starting application",
      description: "Runtime bootstrap is complete and the business interface is starting.",
      detail: null
    }
  };
  return copyByState[state] ?? {
    eyebrow: "AutoByteus application",
    title: "",
    description: "",
    detail: null
  };
};
var renderDefaultApplicationStartupScreen = (input) => {
  if (input.state === "handoff_complete" || input.state === "disposed") {
    return;
  }
  const copy = readCopy(input.state, input.errorMessage);
  const detailHtml = copy.detail ? `<div style="margin-top:16px;border-radius:12px;background:rgba(15,23,42,0.72);padding:14px 16px;color:#cbd5e1;font-size:13px;line-height:1.5;word-break:break-word;">${escapeHtml(copy.detail)}</div>` : "";
  const loading = input.state !== "startup_failed";
  const statusHtml = loading ? `<div aria-hidden="true" style="height:28px;width:28px;border-radius:999px;border:3px solid rgba(96,165,250,0.2);border-top-color:#60a5fa;animation:autobyteus-app-spin 1s linear infinite;"></div>` : `<div aria-hidden="true" style="display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:999px;background:rgba(96,165,250,0.12);color:#93c5fd;font-size:18px;line-height:1;">!</div>`;
  input.rootElement.innerHTML = `
    <section style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top, #172554 0%, #020617 55%, #020617 100%);padding:32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;box-sizing:border-box;">
      <div style="width:min(100%,560px);border:1px solid rgba(148,163,184,0.18);border-radius:24px;background:rgba(15,23,42,0.88);box-shadow:0 24px 60px rgba(2,6,23,0.4);padding:28px 28px 24px;backdrop-filter:blur(8px);">
        <style>@keyframes autobyteus-app-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
        <div style="display:flex;align-items:center;gap:14px;">
          ${statusHtml}
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#93c5fd;">${escapeHtml(copy.eyebrow)}</div>
            <h1 style="margin:6px 0 0;font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">${escapeHtml(copy.title)}</h1>
          </div>
        </div>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#cbd5e1;">${escapeHtml(copy.description)}</p>
        ${detailHtml}
      </div>
    </section>
  `;
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/standalone-same-origin-bootstrap-provider.js
var BOOTSTRAP_PATH = "/_autobyteus/bootstrap";
var resolveHttpUrl = (origin, path) => new URL(path, origin).toString().replace(/\/$/, "");
var resolveWebSocketUrl = (origin, path) => {
  if (path === null) {
    return null;
  }
  const url = new URL(path, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
};
var normalizeStandaloneBootstrap = (input) => {
  const origin = new URL(input.browserOrigin).origin;
  if (origin === "null") {
    throw new Error("Standalone application startup requires an HTTP(S) browser origin.");
  }
  const runtimeBootstrap = {
    contractVersion: "1",
    application: structuredClone(input.payload.application),
    transport: {
      backendBaseUrl: resolveHttpUrl(origin, input.payload.transportPaths.backendBasePath),
      backendNotificationsUrl: resolveWebSocketUrl(origin, input.payload.transportPaths.backendNotificationsPath),
      backendWebSocketBaseUrl: resolveWebSocketUrl(origin, input.payload.transportPaths.backendWebSocketBasePath),
      agentCommunicationWebSocketBaseUrl: resolveWebSocketUrl(origin, input.payload.transportPaths.agentCommunicationWebSocketBasePath)
    }
  };
  if (!isApplicationRuntimeBootstrap(runtimeBootstrap)) {
    throw new Error("The standalone application bootstrap could not be normalized.");
  }
  return runtimeBootstrap;
};
var StandaloneSameOriginBootstrapProvider = class {
  startupWindow;
  constructor(startupWindow) {
    this.startupWindow = startupWindow;
  }
  async acquire(signal) {
    const response = await this.startupWindow.fetch(BOOTSTRAP_PATH, {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal
    });
    if (!response.ok) {
      throw new Error(`Standalone application bootstrap failed with HTTP ${response.status}.`);
    }
    const payload = validateStandaloneApplicationBootstrapPayload(await response.json());
    return normalizeStandaloneBootstrap({
      payload,
      browserOrigin: this.startupWindow.location.origin
    });
  }
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/studio-iframe-bootstrap-provider.js
var StudioIframeBootstrapProvider = class {
  startupWindow;
  launchHints;
  constructor(startupWindow, launchHints) {
    this.startupWindow = startupWindow;
    this.launchHints = launchHints;
  }
  acquire(signal) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        this.startupWindow.removeEventListener("message", handleMessage);
        signal.removeEventListener("abort", handleAbort);
      };
      const fail = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };
      const succeed = (runtimeBootstrap) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(runtimeBootstrap);
      };
      const handleAbort = () => {
        fail(new DOMException("Application startup was disposed.", "AbortError"));
      };
      const handleMessage = (event) => {
        if (event.source !== this.startupWindow.parent || !doesApplicationHostOriginMatch(this.launchHints.hostOrigin, event.origin)) {
          return;
        }
        if (!isApplicationIframeEnvelope(event.data)) {
          return;
        }
        if (event.data.eventName !== APPLICATION_IFRAME_BOOTSTRAP_EVENT) {
          return;
        }
        if (event.data.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION) {
          fail(new Error(`Unsupported Studio application bootstrap contract version "${event.data.contractVersion}". Expected "${APPLICATION_IFRAME_CONTRACT_VERSION}".`));
          return;
        }
        if (!isApplicationHostBootstrapEnvelope(event.data)) {
          fail(new Error("The Studio application received an invalid bootstrap payload."));
          return;
        }
        const payload = event.data.payload;
        if (payload.application.applicationId !== this.launchHints.applicationId || payload.iframeLaunchId !== this.launchHints.iframeLaunchId || payload.requestContext.applicationId !== this.launchHints.applicationId || payload.host.origin !== this.launchHints.hostOrigin) {
          fail(new Error("The Studio application received bootstrap data for a different iframe launch."));
          return;
        }
        try {
          succeed(normalizeStudioIframeBootstrap(payload));
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      };
      if (signal.aborted) {
        handleAbort();
        return;
      }
      this.startupWindow.addEventListener("message", handleMessage);
      signal.addEventListener("abort", handleAbort, { once: true });
      try {
        const parentWindow = this.startupWindow.parent;
        if (typeof parentWindow.postMessage !== "function") {
          throw new Error("The Studio application parent window cannot receive readiness messages.");
        }
        parentWindow.postMessage(createApplicationUiReadyEnvelope({
          applicationId: this.launchHints.applicationId,
          iframeLaunchId: this.launchHints.iframeLaunchId
        }), "*");
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
};
var createStudioIframeBootstrapProvider = (startupWindow) => {
  const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);
  if (!launchHints) {
    throw new Error("The embedded Studio application launch context is invalid or incomplete.");
  }
  return new StudioIframeBootstrapProvider(startupWindow, launchHints);
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/resolve-application-bootstrap-provider.js
var resolveApplicationBootstrapProvider = (startupWindow) => {
  const embedded = startupWindow.parent !== startupWindow;
  const launchHints = readApplicationIframeLaunchHints(startupWindow.location.search);
  if (embedded) {
    return launchHints ? new StudioIframeBootstrapProvider(startupWindow, launchHints) : createStudioIframeBootstrapProvider(startupWindow);
  }
  if (launchHints) {
    throw new Error("Studio iframe launch hints are not valid in a top-level application document.");
  }
  if (startupWindow.location.protocol !== "http:" && startupWindow.location.protocol !== "https:") {
    throw new Error("Standalone applications require a top-level HTTP(S) document.");
  }
  return new StandaloneSameOriginBootstrapProvider(startupWindow);
};

// ../../autobyteus-application-frontend-sdk/dist/application-startup/application-startup-coordinator.js
var toErrorMessage = (error) => error instanceof Error ? error.message : String(error);
var startApplicationWithDependencies = (options, dependencies = {}) => {
  if (!options.rootElement) {
    throw new Error("An application root element is required.");
  }
  const rootElement = options.rootElement;
  const abortController = new AbortController();
  const render = dependencies.render ?? renderDefaultApplicationStartupScreen;
  let state = "resolving_provider";
  let disposed = false;
  const setState = (nextState, errorMessage) => {
    if (disposed) {
      return;
    }
    state = nextState;
    render({ rootElement, state, errorMessage });
  };
  const run = async () => {
    try {
      const provider = dependencies.provider ?? resolveApplicationBootstrapProvider(dependencies.startupWindow ?? resolveApplicationStartupWindow());
      setState("acquiring_bootstrap");
      const runtimeBootstrap = await provider.acquire(abortController.signal);
      if (disposed) {
        return;
      }
      setState("starting_application");
      const applicationClient = createApplicationClient({
        applicationId: runtimeBootstrap.application.applicationId,
        transport: createApplicationBackendMountTransport({
          backendBaseUrl: runtimeBootstrap.transport.backendBaseUrl,
          backendNotificationsUrl: runtimeBootstrap.transport.backendNotificationsUrl,
          backendWebSocketBaseUrl: runtimeBootstrap.transport.backendWebSocketBaseUrl,
          agentCommunicationWebSocketBaseUrl: runtimeBootstrap.transport.agentCommunicationWebSocketBaseUrl
        })
      });
      await Promise.resolve(options.onBootstrapped({
        runtimeBootstrap,
        applicationClient,
        rootElement
      }));
      if (!disposed) {
        state = "handoff_complete";
      }
    } catch (error) {
      if (!disposed) {
        setState("startup_failed", toErrorMessage(error));
      }
    }
  };
  render({ rootElement, state });
  void run();
  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      state = "disposed";
      abortController.abort();
    },
    getState: () => state
  };
};
var startApplication = (options) => startApplicationWithDependencies(options);

// frontend-src/generated/graphql-client.js
var LESSONS_QUERY = `query LessonsQuery {
  lessons {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
  }
}`;
var LESSON_QUERY = `query LessonQuery($lessonId: ID!) {
  lesson(lessonId: $lessonId) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    tutorTargetAddress
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;
var START_LESSON_MUTATION = `mutation StartLessonMutation($input: StartLessonInput!) {
  startLesson(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    tutorTargetAddress
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;
var ASK_FOLLOW_UP_MUTATION = `mutation AskFollowUpMutation($input: AskFollowUpInput!) {
  askFollowUp(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    tutorTargetAddress
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;
var REQUEST_HINT_MUTATION = `mutation RequestHintMutation($input: RequestHintInput!) {
  requestHint(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    tutorTargetAddress
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;
var CLOSE_LESSON_MUTATION = `mutation CloseLessonMutation($input: CloseLessonInput!) {
  closeLesson(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    tutorTargetAddress
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;
var readGraphqlField = async (promise, fieldName) => {
  const result = await promise;
  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message || String(error)).join("\n"));
  }
  if (!result?.data || !(fieldName in result.data)) {
    throw new Error(`Missing GraphQL field '${fieldName}'.`);
  }
  return result.data[fieldName];
};
var createSocraticMathGraphqlClient = (applicationClient) => {
  const execute = (query, operationName, variables, fieldName) => readGraphqlField(
    applicationClient.backend.graphql({ query, operationName, variables }),
    fieldName
  );
  return {
    getApplicationInfo: applicationClient.getApplicationInfo,
    subscribeNotifications: applicationClient.notifications.subscribe,
    lessons: () => execute(LESSONS_QUERY, "LessonsQuery", null, "lessons"),
    lesson: (lessonId) => execute(LESSON_QUERY, "LessonQuery", { lessonId }, "lesson"),
    startLesson: (input) => execute(START_LESSON_MUTATION, "StartLessonMutation", { input }, "startLesson"),
    askFollowUp: (input) => execute(ASK_FOLLOW_UP_MUTATION, "AskFollowUpMutation", { input }, "askFollowUp"),
    requestHint: (input) => execute(REQUEST_HINT_MUTATION, "RequestHintMutation", { input }, "requestHint"),
    closeLesson: (input) => execute(CLOSE_LESSON_MUTATION, "CloseLessonMutation", { input }, "closeLesson")
  };
};

// frontend-src/socratic-renderer.js
var escapeHtml2 = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
var formatTime = (value) => {
  if (!value) {
    return "\u2014";
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return timestamp.toLocaleString();
};
var renderSocraticMathTeacherShell = (rootElement) => {
  rootElement.innerHTML = `
    <main class="shell">
      <header class="hero card">
        <div class="eyebrow">Built-in teaching sample</div>
        <h1>Socratic Math Teacher</h1>
        <p class="lede">
          Start lessons, follow the tutor's live guidance, and keep every completed turn in one durable
          lesson transcript.
        </p>
      </header>

      <section id="workspace-status" class="workspace-status">
        Socratic Math Teacher is ready to load lesson data.
      </section>

      <details class="card details-panel">
        <summary class="details-summary">Advanced app details</summary>
        <p class="details-copy muted">
          The platform hosts the backend mount and launch lifecycle, while the app owns the lesson GraphQL schema,
          generated frontend client, tutor transcript projection, and repeated follow-up semantics.
        </p>
        <div class="meta-grid">
          <div>
            <span class="label">Application</span>
            <div id="application-name" class="value">Waiting for runtime context\u2026</div>
            <div id="application-ids" class="muted">\u2014</div>
          </div>
          <div>
            <span class="label">Runtime</span>
            <div id="runtime-contract-version" class="value">\u2014</div>
            <div id="canonical-application-id" class="muted">\u2014</div>
          </div>
          <div>
            <span class="label">Backend mount</span>
            <div id="backend-base-url" class="value small">\u2014</div>
            <div id="backend-notifications-url" class="muted small">\u2014</div>
          </div>
        </div>
      </details>

      <section class="card composer-panel">
        <div class="panel-header">
          <div>
            <h2>Start lesson</h2>
            <p class="muted">Create one lesson, connect to its tutor, and send the problem after the live connection is ready. Host-managed runtime and model selections keep their configured priority.</p>
          </div>
        </div>
        <form id="start-lesson-form" class="brief-composer">
          <div class="composer-grid">
            <label class="field">
              <span class="label">Math problem</span>
              <input id="lesson-prompt-input" type="text" placeholder="Solve 3x + 5 = 20" />
            </label>
          </div>
          <div class="action-row">
            <button id="start-lesson-button" class="primary-button" type="submit">Start lesson</button>
            <span class="muted small">The first response streams live, then the published tutor turn becomes the durable transcript.</span>
          </div>
        </form>
      </section>

      <section class="content-grid">
        <aside class="card list-panel">
          <div class="panel-header">
            <div>
              <h2>Lessons</h2>
              <p class="muted">Track each lesson, its current tutoring status, and the latest activity.</p>
            </div>
            <button id="refresh-button" class="ghost-button" type="button">Refresh</button>
          </div>
          <div id="lesson-list" class="brief-list empty-state">
            No lessons yet. Start one lesson to begin the tutoring conversation.
          </div>
        </aside>

        <section class="card detail-panel">
          <div class="panel-header">
            <div>
              <h2>Lesson detail</h2>
              <p class="muted">Review the tutoring conversation, current lesson status, and next student action.</p>
            </div>
          </div>
          <div id="lesson-detail" class="empty-state">
            Select a lesson to continue the tutoring conversation and review past guidance.
          </div>
        </section>
      </section>

      <section class="card notification-panel">
        <div class="panel-header">
          <div>
            <h2>Backend notifications</h2>
            <p class="muted">Optional app notifications fan out through the platform-owned application backend stream.</p>
          </div>
        </div>
        <div id="notification-list" class="notification-list empty-state">No notifications yet.</div>
      </section>
    </main>
  `;
};
var renderNotifications = ({ state, elements }) => {
  if (!elements.notificationList) {
    return;
  }
  if (state.notifications.length === 0) {
    elements.notificationList.className = "notification-list empty-state";
    elements.notificationList.textContent = "No notifications yet.";
    return;
  }
  elements.notificationList.className = "notification-list";
  elements.notificationList.innerHTML = state.notifications.map(
    (notification) => `
        <article class="notification-row" role="listitem">
          <div class="brief-title-row">
            <strong>${escapeHtml2(notification.topic)}</strong>
            <span class="muted small">${escapeHtml2(formatTime(notification.publishedAt))}</span>
          </div>
          <pre>${escapeHtml2(JSON.stringify(notification.payload, null, 2))}</pre>
        </article>
      `
  ).join("");
};
var renderLessonList = ({ state, elements, onSelectLesson, onError }) => {
  if (!elements.lessonList) {
    return;
  }
  if (state.lessons.length === 0) {
    elements.lessonList.className = "brief-list empty-state";
    elements.lessonList.textContent = "No lessons yet. Start one lesson to begin the tutoring conversation.";
    return;
  }
  elements.lessonList.className = "brief-list";
  elements.lessonList.innerHTML = state.lessons.map(
    (lesson) => `
        <article class="brief-row${lesson.lessonId === state.selectedLessonId ? " active" : ""}">
          <button type="button" data-lesson-id="${escapeHtml2(lesson.lessonId)}">
            <div class="brief-title-row">
              <strong>${escapeHtml2(lesson.prompt)}</strong>
              <span class="badge">${escapeHtml2(lesson.status)}</span>
            </div>
            <div class="brief-meta-row muted small" style="margin-top: 10px;">
              <span>Lesson ${escapeHtml2(lesson.lessonId)}</span>
              <span>Updated ${escapeHtml2(formatTime(lesson.updatedAt))}</span>
            </div>
          </button>
        </article>
      `
  ).join("");
  for (const button of elements.lessonList.querySelectorAll("button[data-lesson-id]")) {
    button.addEventListener("click", () => {
      onSelectLesson(button.dataset.lessonId || null).catch(onError);
    });
  }
};
var visibleTranscriptMessages = (messages, tutorLive) => {
  if (!Array.isArray(messages) || !tutorLive?.deferDurableTutorMessages) return messages;
  let tutorMessageCount = 0;
  return messages.filter((message) => {
    if (message?.role !== "tutor") return true;
    tutorMessageCount += 1;
    return tutorMessageCount <= tutorLive.durableTutorMessageBaseline;
  });
};
var renderTranscript = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return `<div class="empty-state">No lesson messages yet.</div>`;
  }
  return `
    <div class="note-list">
      ${messages.map(
    (message) => `
            <article class="note-row">
              <div class="brief-title-row">
                <strong>${escapeHtml2(message.role)}</strong>
                <span class="badge">${escapeHtml2(message.kind)}</span>
              </div>
              <div class="muted small" style="margin-top: 8px;">${escapeHtml2(formatTime(message.createdAt))}</div>
              <p style="margin-top: 10px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml2(message.body)}</p>
            </article>
          `
  ).join("")}
    </div>
  `;
};
var renderRuntimeDiagnostics = (lesson) => `
  <details class="inline-details">
    <summary class="details-summary">Advanced runtime details</summary>
    <p class="details-copy muted">
      Optional diagnostics for app authors. The main lesson view stays centered on the tutoring conversation.
    </p>
    <div class="meta-grid compact-meta-grid">
      <div>
        <span class="label">Latest binding</span>
        <div class="value small">${escapeHtml2(lesson.latestBindingId || "\u2014")}</div>
        <div class="muted small">Status ${escapeHtml2(lesson.latestBindingStatus || "\u2014")}</div>
      </div>
      <div>
        <span class="label">Latest run</span>
        <div class="value small">${escapeHtml2(lesson.latestRunId || "\u2014")}</div>
        <div class="muted small">Updated ${escapeHtml2(formatTime(lesson.updatedAt))}</div>
      </div>
      <div>
        <span class="label">Runtime note</span>
        <div class="muted small">${escapeHtml2(lesson.lastErrorMessage || "No recorded runtime error")}</div>
      </div>
    </div>
  </details>
`;
var LIVE_STATUS_LABELS = {
  idle: "Tutor not connected",
  connecting: "Connecting to the tutor\u2026",
  ready: "Tutor connected",
  streaming: "Tutor is responding\u2026",
  completed: "Tutor response complete \xB7 saving transcript\u2026",
  saved: "Tutor response saved",
  failed: "Tutor connection failed",
  closed: "Tutor connection closed"
};
var renderLiveTutor = (state, lesson) => {
  const live = state.tutorLive;
  const belongsToLesson = live?.lessonId === lesson.lessonId;
  const status = belongsToLesson ? live.status : "idle";
  const statusLabel = LIVE_STATUS_LABELS[status] ?? LIVE_STATUS_LABELS.idle;
  const text = belongsToLesson ? live.text : "";
  const errorMessage = belongsToLesson ? live.errorMessage : null;
  const liveWarning = belongsToLesson ? live.liveWarning : null;
  const placeholder = status === "saved" ? "The authoritative tutor response is shown in the transcript below." : status === "completed" ? "The live response is complete and is waiting for the durable transcript." : "Live text appears here while the tutor responds. Completed turns remain in the transcript below.";
  return `
    <section class="live-tutor" data-live-state="${escapeHtml2(status)}" aria-live="polite" aria-atomic="false">
      <div class="live-tutor-header">
        <div>
          <span class="label">Live tutor</span>
          <strong>${escapeHtml2(statusLabel)}</strong>
        </div>
        <span class="live-status-dot" aria-hidden="true"></span>
      </div>
      ${text ? `<p class="live-tutor-text">${escapeHtml2(text)}</p>` : `<p class="muted small live-tutor-placeholder">${escapeHtml2(placeholder)}</p>`}
      ${errorMessage ? `<p class="live-error" role="alert">${escapeHtml2(errorMessage)}</p>` : ""}
      ${liveWarning ? `<p class="live-warning">${escapeHtml2(liveWarning)}</p>` : ""}
    </section>
  `;
};
var renderLessonDetail = ({
  state,
  elements,
  onAskFollowUp,
  onRequestHint,
  onCloseLesson,
  onError
}) => {
  if (!elements.lessonDetail) {
    return;
  }
  const lesson = state.detail;
  if (!lesson) {
    elements.lessonDetail.className = "empty-state";
    elements.lessonDetail.textContent = "Select a lesson to continue the tutoring conversation and review past guidance.";
    return;
  }
  const live = state.tutorLive?.lessonId === lesson.lessonId ? state.tutorLive : null;
  const closeDispatching = state.closingLessonId === lesson.lessonId;
  const closeAvailable = lesson.status === "active" && !closeDispatching;
  const nextTurnAvailable = Boolean(
    !closeDispatching && lesson.status === "active" && live?.turnAdmission === "available"
  );
  let turnHelp = "Wait for the current tutor response to be saved before sending another.";
  if (closeDispatching) {
    turnHelp = "This lesson is closing. Follow-up and hint actions stay unavailable.";
  } else if (lesson.status !== "active") {
    turnHelp = "This lesson is closed. Follow-up and hint actions are unavailable.";
  } else if (nextTurnAvailable) {
    turnHelp = "Send one follow-up or request one hint. The next action becomes available after the tutor response is saved.";
  }
  const closeLabel = closeDispatching ? "Closing lesson\u2026" : closeAvailable ? "Close lesson" : "Lesson closed";
  const transcriptMessages = visibleTranscriptMessages(lesson.messages, live);
  elements.lessonDetail.className = "detail-grid";
  elements.lessonDetail.innerHTML = `
    <section class="detail-section">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml2(lesson.prompt)}</h3>
          <p class="muted small">lessonId ${escapeHtml2(lesson.lessonId)}</p>
        </div>
        <span class="badge">${escapeHtml2(lesson.status)}</span>
      </div>
      <div class="detail-actions muted small">
        <span>Created ${escapeHtml2(formatTime(lesson.createdAt))}</span>
        <span>Updated ${escapeHtml2(formatTime(lesson.updatedAt))}</span>
      </div>
      <div class="meta-grid compact-meta-grid">
        <div>
          <span class="label">Lesson record</span>
          <div class="value small">${escapeHtml2(lesson.lessonId)}</div>
          <div class="muted small">Status ${escapeHtml2(lesson.status)}</div>
        </div>
        <div>
          <span class="label">Conversation</span>
          <div class="value small">${escapeHtml2(String(Array.isArray(lesson.messages) ? lesson.messages.length : 0))} messages</div>
          <div class="muted small">Closed ${escapeHtml2(formatTime(lesson.closedAt))}</div>
        </div>
        <div>
          <span class="label">Next step</span>
          <div class="muted small">Ask a follow-up question or request a hint to continue this lesson.</div>
        </div>
      </div>
      <div class="action-row">
        <button id="request-hint" class="secondary-button" type="button"${nextTurnAvailable ? "" : " disabled"}>Request hint</button>
        <button id="close-lesson" class="danger-button" type="button"${closeAvailable ? "" : " disabled"}>${closeLabel}</button>
      </div>
    </section>

    ${renderLiveTutor(state, lesson)}

    <section class="detail-section">
      <div>
        <h3>Transcript</h3>
        <p class="muted">The lesson keeps the tutoring conversation and student follow-ups together in one record.</p>
      </div>
      ${renderTranscript(transcriptMessages)}
      <form id="follow-up-form" class="note-composer">
        <textarea id="follow-up-input" placeholder="Send the next follow-up question or answer"${nextTurnAvailable ? "" : " disabled"}></textarea>
        <div class="action-row">
          <button class="primary-button" type="submit"${nextTurnAvailable ? "" : " disabled"}>Send follow-up</button>
        </div>
        <p id="turn-admission-help" class="muted small">${escapeHtml2(turnHelp)}</p>
      </form>
    </section>

    <section class="detail-section">
      ${renderRuntimeDiagnostics(lesson)}
    </section>
  `;
  elements.lessonDetail.querySelector("#request-hint")?.addEventListener("click", () => {
    onRequestHint().catch(onError);
  });
  elements.lessonDetail.querySelector("#close-lesson")?.addEventListener("click", () => {
    onCloseLesson().catch(onError);
  });
  elements.lessonDetail.querySelector("#follow-up-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    onAskFollowUp().catch(onError);
  });
};
var renderMetadata = ({ state, elements }) => {
  const runtimeBootstrap = state.runtimeBootstrap;
  if (!runtimeBootstrap) {
    return;
  }
  if (elements.applicationName) {
    elements.applicationName.textContent = runtimeBootstrap.application.name;
  }
  if (elements.applicationIds) {
    elements.applicationIds.textContent = [
      `app ${runtimeBootstrap.application.applicationId}`,
      `local ${runtimeBootstrap.application.localApplicationId}`,
      `package ${runtimeBootstrap.application.packageId}`
    ].join(" \xB7 ");
  }
  if (elements.contractVersion) {
    elements.contractVersion.textContent = `contract ${runtimeBootstrap.contractVersion}`;
  }
  if (elements.canonicalApplicationId) {
    elements.canonicalApplicationId.textContent = `applicationId ${runtimeBootstrap.application.applicationId}`;
  }
  if (elements.backendBaseUrl) {
    elements.backendBaseUrl.textContent = runtimeBootstrap.transport.backendBaseUrl || "\u2014";
  }
  if (elements.backendNotificationsUrl) {
    elements.backendNotificationsUrl.textContent = runtimeBootstrap.transport.backendNotificationsUrl || "\u2014";
  }
};
var renderApp = (input) => {
  renderMetadata(input);
  renderLessonList(input);
  renderLessonDetail(input);
  renderNotifications(input);
};

// frontend-src/socratic-tutor-session.js
var SOCRATIC_TURN_BUSY_NOTICE = "Wait for the current tutor response to be saved before sending another.";
var TERMINAL_LIVE_PHASES = /* @__PURE__ */ new Set(["completed", "failed", "closed"]);
var createIdleSocraticTutorState = (lessonId = null) => ({
  lessonId,
  status: "idle",
  livePhase: "idle",
  durableObservedForTurn: false,
  turnAdmission: "closed",
  durableTutorMessageBaseline: 0,
  deferDurableTutorMessages: false,
  text: "",
  responseCompleted: false,
  errorMessage: null,
  liveWarning: null,
  lastSequence: 0,
  inputSent: false
});
var countDurableTutorMessages = (lesson) => Array.isArray(lesson?.messages) ? lesson.messages.filter((message) => message?.role === "tutor").length : 0;
var safeErrorMessage = (error) => error instanceof Error && error.message.trim() ? error.message : "The tutor connection failed.";
var addressKey = (address) => address ? JSON.stringify(address) : null;
var isTerminalLivePhase = (phase) => TERMINAL_LIVE_PHASES.has(phase);
var deriveStatus = (state) => {
  if (state.durableObservedForTurn && isTerminalLivePhase(state.livePhase)) return "saved";
  if (state.livePhase === "completed") return "completed";
  return state.livePhase;
};
var createSocraticTutorSession = ({ agentCommunication, onStateChange }) => {
  let snapshot = createIdleSocraticTutorState();
  let active = null;
  let generation = 0;
  let currentAdmissionHandle = null;
  const publish = (next) => {
    const merged = { ...snapshot, ...next };
    snapshot = { ...merged, status: deriveStatus(merged) };
    onStateChange?.({ ...snapshot });
  };
  const invalidateAdmission = () => {
    currentAdmissionHandle = null;
  };
  const releaseActive = ({ closeConnection }) => {
    const current = active;
    active = null;
    if (!current) return;
    for (const release of current.releases.splice(0)) release();
    if (closeConnection) current.connection.close();
  };
  const isActiveLesson = (lesson) => Boolean(
    active && active.lessonId === lesson?.lessonId && active.addressKey === addressKey(lesson?.tutorTargetAddress)
  );
  const activeStillOwnsSnapshot = () => Boolean(
    active && active.lessonId === snapshot.lessonId
  );
  const safeLiveWarning = (phase) => {
    if (phase === "failed") return "The live tutor stream failed after the response was saved.";
    if (phase === "closed") return "The live tutor stream closed after the response was saved.";
    return "The live tutor response was interrupted after the response was saved.";
  };
  const completeSavedJoin = ({ warning = null } = {}) => {
    invalidateAdmission();
    publish({
      durableObservedForTurn: true,
      deferDurableTutorMessages: false,
      text: "",
      errorMessage: null,
      liveWarning: warning,
      turnAdmission: activeStillOwnsSnapshot() ? "available" : "closed"
    });
  };
  const beginClaim = (lesson) => {
    if (!isActiveLesson(lesson) || snapshot.turnAdmission !== "available") return null;
    const baseline = countDurableTutorMessages(lesson);
    const handle = {
      accepted: true,
      markDispatchAccepted() {
        if (currentAdmissionHandle !== handle) return;
        publish({ turnAdmission: "awaiting_join", inputSent: true });
      },
      markDispatchFailed(error) {
        if (currentAdmissionHandle !== handle) return;
        publish({
          livePhase: "failed",
          turnAdmission: "uncertain",
          inputSent: true,
          errorMessage: safeErrorMessage(error)
        });
      }
    };
    currentAdmissionHandle = handle;
    publish({
      durableObservedForTurn: false,
      durableTutorMessageBaseline: baseline,
      deferDurableTutorMessages: false,
      text: "",
      responseCompleted: false,
      errorMessage: null,
      liveWarning: null,
      lastSequence: 0,
      inputSent: false,
      livePhase: snapshot.livePhase === "connecting" ? "connecting" : "streaming",
      turnAdmission: "dispatching"
    });
    return handle;
  };
  const settleLiveTerminal = ({ phase, errorMessage = null }) => {
    if (snapshot.status === "saved") return;
    const next = {
      livePhase: phase,
      responseCompleted: phase === "completed",
      errorMessage
    };
    if (snapshot.durableObservedForTurn) {
      publish(next);
      completeSavedJoin({
        warning: phase === "completed" ? null : safeLiveWarning(phase)
      });
      return;
    }
    publish({
      ...next,
      turnAdmission: snapshot.turnAdmission === "uncertain" ? "uncertain" : "awaiting_join"
    });
  };
  const handleEvent = (sessionGeneration, event) => {
    if (!active || active.generation !== sessionGeneration || event.sequence <= snapshot.lastSequence) {
      return;
    }
    publish({ lastSequence: event.sequence });
    if (snapshot.status === "saved") return;
    const publicEvent = event.event;
    if (publicEvent.type === "TURN_STARTED") {
      publish({ livePhase: "streaming" });
      return;
    }
    if (publicEvent.type === "TEXT_DELTA") {
      publish({
        livePhase: "streaming",
        text: `${snapshot.text}${publicEvent.delta}`
      });
      return;
    }
    if (publicEvent.type === "TURN_COMPLETED") {
      settleLiveTerminal({ phase: "completed" });
      return;
    }
    if (publicEvent.type === "TURN_INTERRUPTED") {
      settleLiveTerminal({
        phase: "failed",
        errorMessage: "The tutor response was interrupted."
      });
      return;
    }
    if (publicEvent.type === "ERROR") {
      settleLiveTerminal({ phase: "failed", errorMessage: publicEvent.message });
    }
  };
  const connectLesson = async ({ lesson, sendInitialProblem = false }) => {
    const targetAddress = lesson?.tutorTargetAddress;
    if (!targetAddress) {
      invalidateAdmission();
      releaseActive({ closeConnection: true });
      publish(createIdleSocraticTutorState(lesson?.lessonId ?? null));
      return;
    }
    const nextAddressKey = addressKey(targetAddress);
    if (active?.addressKey === nextAddressKey && active.lessonId === lesson.lessonId) return;
    invalidateAdmission();
    releaseActive({ closeConnection: true });
    const sessionGeneration = ++generation;
    const initialDurableTutorMessageCount = countDurableTutorMessages(lesson);
    let connection;
    try {
      connection = agentCommunication.connect(targetAddress);
    } catch (error) {
      publish({
        ...createIdleSocraticTutorState(lesson.lessonId),
        livePhase: "failed",
        errorMessage: safeErrorMessage(error)
      });
      throw error;
    }
    const current = {
      addressKey: nextAddressKey,
      connection,
      generation: sessionGeneration,
      lessonId: lesson.lessonId,
      releases: []
    };
    active = current;
    snapshot = {
      ...createIdleSocraticTutorState(lesson.lessonId),
      livePhase: "connecting",
      turnAdmission: sendInitialProblem ? "available" : "closed",
      durableTutorMessageBaseline: initialDurableTutorMessageCount
    };
    const initialAdmission = sendInitialProblem ? beginClaim(lesson) : null;
    if (!initialAdmission) publish(snapshot);
    current.releases.push(
      connection.onEvent((event) => handleEvent(sessionGeneration, event)),
      connection.onError((error) => {
        if (active?.generation !== sessionGeneration) return;
        settleLiveTerminal({ phase: "failed", errorMessage: safeErrorMessage(error) });
      }),
      connection.onClose(() => {
        if (active?.generation !== sessionGeneration) return;
        releaseActive({ closeConnection: false });
        invalidateAdmission();
        if (snapshot.status === "saved") {
          publish({ livePhase: "closed", turnAdmission: "closed" });
        } else if (snapshot.durableObservedForTurn) {
          publish({ livePhase: "closed" });
          completeSavedJoin({ warning: safeLiveWarning("closed") });
        } else {
          publish({
            livePhase: "closed",
            turnAdmission: "closed",
            errorMessage: snapshot.errorMessage || "The tutor connection closed before the response was saved."
          });
        }
      })
    );
    try {
      await connection.ready;
      if (active?.generation !== sessionGeneration) return;
      publish({
        livePhase: sendInitialProblem ? "streaming" : "ready",
        turnAdmission: sendInitialProblem ? snapshot.turnAdmission : "available"
      });
      if (!sendInitialProblem) return;
      await connection.sendInput({
        text: lesson.prompt,
        metadata: {
          lessonId: lesson.lessonId,
          requestKind: "lesson_start"
        }
      });
      initialAdmission.markDispatchAccepted();
    } catch (error) {
      if (active?.generation !== sessionGeneration) return;
      if (currentAdmissionHandle !== initialAdmission) return;
      if (sendInitialProblem) {
        initialAdmission.markDispatchFailed(error);
      } else {
        publish({
          livePhase: "failed",
          turnAdmission: "closed",
          errorMessage: safeErrorMessage(error)
        });
      }
      throw error;
    }
  };
  return {
    connectLesson,
    matchesLesson: isActiveLesson,
    tryBeginObservedTurn(lesson) {
      return beginClaim(lesson);
    },
    reconcileDurableLesson(lesson) {
      if (!lesson || lesson.lessonId !== snapshot.lessonId) return;
      const nextTutorMessageCount = countDurableTutorMessages(lesson);
      if (snapshot.turnAdmission === "available") {
        if (!snapshot.durableObservedForTurn) {
          publish({ durableTutorMessageBaseline: nextTutorMessageCount });
        }
        return;
      }
      if (snapshot.turnAdmission === "closed" || nextTutorMessageCount <= snapshot.durableTutorMessageBaseline) {
        return;
      }
      publish({
        durableObservedForTurn: true,
        deferDurableTutorMessages: !isTerminalLivePhase(snapshot.livePhase)
      });
      if (isTerminalLivePhase(snapshot.livePhase)) {
        completeSavedJoin({
          warning: snapshot.livePhase === "completed" ? null : safeLiveWarning(snapshot.livePhase)
        });
      }
    },
    close() {
      generation += 1;
      invalidateAdmission();
      const hadSession = Boolean(active) || snapshot.livePhase !== "idle";
      releaseActive({ closeConnection: true });
      if (hadSession) publish({ livePhase: "closed", turnAdmission: "closed" });
    },
    getSnapshot() {
      return { ...snapshot };
    }
  };
};

// frontend-src/socratic-runtime.js
var mountSocraticMathTeacher = ({
  applicationClient,
  runtimeBootstrap,
  browserWindow,
  createSocraticMathGraphqlClient: createSocraticMathGraphqlClient2,
  rootElement
}) => {
  renderSocraticMathTeacherShell(rootElement);
  const client = createSocraticMathGraphqlClient2(applicationClient);
  const state = {
    runtimeBootstrap,
    closingLessonId: null,
    detail: null,
    lessons: [],
    notificationHandle: null,
    notifications: [],
    selectedLessonId: null,
    statusText: "Socratic Math Teacher is ready to load lesson data.",
    statusTone: "idle",
    tutorLive: createIdleSocraticTutorState()
  };
  const elements = {
    applicationName: rootElement.querySelector("#application-name"),
    applicationIds: rootElement.querySelector("#application-ids"),
    contractVersion: rootElement.querySelector("#runtime-contract-version"),
    canonicalApplicationId: rootElement.querySelector("#canonical-application-id"),
    backendBaseUrl: rootElement.querySelector("#backend-base-url"),
    backendNotificationsUrl: rootElement.querySelector("#backend-notifications-url"),
    workspaceStatus: rootElement.querySelector("#workspace-status"),
    lessonList: rootElement.querySelector("#lesson-list"),
    lessonDetail: rootElement.querySelector("#lesson-detail"),
    notificationList: rootElement.querySelector("#notification-list"),
    refreshButton: rootElement.querySelector("#refresh-button"),
    startLessonForm: rootElement.querySelector("#start-lesson-form"),
    startLessonButton: rootElement.querySelector("#start-lesson-button"),
    lessonPromptInput: rootElement.querySelector("#lesson-prompt-input")
  };
  let disposed = false;
  let lifecycleGeneration = 0;
  let pendingStartOperation = null;
  let activeCloseClaim = null;
  const captureOperation = (lessonId = state.selectedLessonId) => ({
    generation: lifecycleGeneration,
    lessonId
  });
  const isOperationCurrent = (operation) => Boolean(
    !disposed && operation.generation === lifecycleGeneration && operation.lessonId === state.selectedLessonId
  );
  const isPendingStartCurrent = () => Boolean(
    pendingStartOperation && isOperationCurrent(pendingStartOperation)
  );
  const isLessonClosing = (lessonId = state.selectedLessonId) => Boolean(
    lessonId && state.closingLessonId === lessonId
  );
  const advanceOperation = () => {
    lifecycleGeneration += 1;
    return captureOperation();
  };
  const setStartLessonBusy = (busy) => {
    if (elements.startLessonButton) elements.startLessonButton.disabled = busy;
    if (elements.lessonPromptInput) elements.lessonPromptInput.disabled = busy;
  };
  const setStatus = (text, tone = "idle") => {
    if (disposed) return;
    state.statusText = text;
    state.statusTone = tone;
    if (elements.workspaceStatus) {
      elements.workspaceStatus.textContent = text;
      elements.workspaceStatus.className = `workspace-status${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
    }
  };
  const setReadyStatus = () => {
    setStatus(
      state.lessons.length === 0 ? "Socratic Math Teacher is ready. Start a lesson to begin guided help on one math problem." : "Socratic Math Teacher is ready. Open a lesson to continue the tutoring conversation.",
      "ready"
    );
  };
  const handleUiError = (error) => {
    if (disposed) return;
    setStatus(error instanceof Error ? error.message : String(error), "error");
  };
  const renderDetail = () => renderLessonDetail({
    state,
    elements,
    onAskFollowUp: askFollowUp,
    onRequestHint: requestHint,
    onCloseLesson: closeLesson,
    onError: handleUiError
  });
  const tutorSession = createSocraticTutorSession({
    agentCommunication: applicationClient.agentCommunication,
    onStateChange: (tutorLive) => {
      if (disposed) return;
      state.tutorLive = tutorLive;
      renderDetail();
    }
  });
  const replaceSelection = (lessonId, { cancelPendingStart = true } = {}) => {
    lifecycleGeneration += 1;
    tutorSession.close();
    activeCloseClaim = null;
    state.closingLessonId = null;
    state.selectedLessonId = lessonId;
    if (cancelPendingStart) {
      pendingStartOperation = null;
      setStartLessonBusy(false);
    }
    return captureOperation(lessonId);
  };
  const render = () => {
    renderApp({
      state,
      elements,
      onSelectLesson: selectLesson,
      onAskFollowUp: askFollowUp,
      onRequestHint: requestHint,
      onCloseLesson: closeLesson,
      onError: handleUiError
    });
  };
  const refreshDetail = async (operation, { allowConnection = true, closeClaim = null } = {}) => {
    const isCommitCurrent = () => Boolean(
      isOperationCurrent(operation) && (!closeClaim || activeCloseClaim === closeClaim)
    );
    if (!isCommitCurrent()) return;
    if (!operation.lessonId) {
      state.detail = null;
      tutorSession.close();
      renderDetail();
      return;
    }
    let detail;
    try {
      detail = await client.lesson(operation.lessonId);
    } catch (error) {
      if (isCommitCurrent()) throw error;
      return;
    }
    if (!isCommitCurrent()) return;
    state.detail = detail;
    tutorSession.reconcileDurableLesson(state.detail);
    if (!allowConnection || isLessonClosing(operation.lessonId)) {
      renderDetail();
      return;
    }
    if (state.detail?.tutorTargetAddress && !tutorSession.matchesLesson(state.detail)) {
      const connectionAttempt = tutorSession.connectLesson({ lesson: state.detail });
      renderDetail();
      try {
        await connectionAttempt;
      } catch (error) {
        if (isCommitCurrent()) throw error;
      }
    } else if (!state.detail?.tutorTargetAddress) {
      tutorSession.close();
      renderDetail();
    } else {
      renderDetail();
    }
  };
  const refresh = async (startingOperation = captureOperation()) => {
    let operation = startingOperation;
    if (!isOperationCurrent(operation)) return false;
    const closeOwnsLifecycle = isLessonClosing(operation.lessonId);
    const closeClaim = closeOwnsLifecycle ? activeCloseClaim : null;
    const isCommitCurrent = () => Boolean(
      isOperationCurrent(operation) && (!closeClaim || activeCloseClaim === closeClaim)
    );
    if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
      setStatus("Loading lessons through the application GraphQL backend\u2026");
    }
    let lessons;
    try {
      lessons = await client.lessons();
    } catch (error) {
      if (isCommitCurrent()) handleUiError(error);
      return false;
    }
    if (!isCommitCurrent()) return false;
    state.lessons = Array.isArray(lessons) ? lessons : [];
    if (!state.selectedLessonId || !state.lessons.some((lesson) => lesson.lessonId === state.selectedLessonId)) {
      if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
        operation = replaceSelection(state.lessons[0]?.lessonId || null);
      }
    }
    try {
      await refreshDetail(operation, {
        allowConnection: !closeOwnsLifecycle,
        closeClaim
      });
    } catch (error) {
      if (isCommitCurrent()) handleUiError(error);
      return false;
    }
    if (!isCommitCurrent()) return false;
    render();
    if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
      setReadyStatus();
    }
    return true;
  };
  const selectLesson = async (lessonId) => {
    if (disposed) return;
    const operation = replaceSelection(lessonId);
    state.detail = null;
    render();
    try {
      await refreshDetail(operation);
    } catch (error) {
      if (isOperationCurrent(operation)) throw error;
    }
  };
  const startLesson = async () => {
    const prompt = elements.lessonPromptInput?.value?.trim() || "";
    if (!prompt) {
      setStatus("Enter a math problem before starting a lesson.", "error");
      return;
    }
    let operation = advanceOperation();
    pendingStartOperation = operation;
    setStartLessonBusy(true);
    setStatus("Starting a new lesson\u2026");
    try {
      const lesson = await client.startLesson({ prompt });
      if (!isOperationCurrent(operation)) return;
      operation = replaceSelection(lesson.lessonId, { cancelPendingStart: false });
      pendingStartOperation = operation;
      state.detail = lesson;
      state.lessons = [lesson, ...state.lessons.filter((item) => item.lessonId !== lesson.lessonId)];
      const connectionAttempt = tutorSession.connectLesson({ lesson, sendInitialProblem: true });
      render();
      await connectionAttempt;
      if (!isOperationCurrent(operation)) return;
      if (pendingStartOperation === operation) pendingStartOperation = null;
      if (elements.lessonPromptInput) elements.lessonPromptInput.value = "";
      await refresh(operation);
    } catch (error) {
      if (isOperationCurrent(operation)) throw error;
    } finally {
      if (pendingStartOperation === operation) pendingStartOperation = null;
      if (isOperationCurrent(operation)) setStartLessonBusy(false);
    }
  };
  const askFollowUp = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    if (isLessonClosing(operation.lessonId)) return;
    const textarea = elements.lessonDetail?.querySelector("#follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    const admission = tutorSession.tryBeginObservedTurn(state.detail);
    if (!admission) {
      setStatus(SOCRATIC_TURN_BUSY_NOTICE, "error");
      return;
    }
    setStatus("Sending your follow-up\u2026");
    try {
      await client.askFollowUp({ lessonId: operation.lessonId, text });
    } catch (error) {
      admission.markDispatchFailed(error);
      if (!isOperationCurrent(operation)) return;
      throw error;
    }
    admission.markDispatchAccepted();
    if (!isOperationCurrent(operation)) return;
    if (textarea) textarea.value = "";
    await refresh(operation);
  };
  const requestHint = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    if (isLessonClosing(operation.lessonId)) return;
    const admission = tutorSession.tryBeginObservedTurn(state.detail);
    if (!admission) {
      setStatus(SOCRATIC_TURN_BUSY_NOTICE, "error");
      return;
    }
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint\u2026");
    try {
      await client.requestHint({
        lessonId: operation.lessonId,
        text: text.trim() || null
      });
    } catch (error) {
      admission.markDispatchFailed(error);
      if (!isOperationCurrent(operation)) return;
      throw error;
    }
    admission.markDispatchAccepted();
    if (!isOperationCurrent(operation)) return;
    await refresh(operation);
  };
  const closeLesson = async () => {
    const currentOperation = captureOperation();
    if (!isOperationCurrent(currentOperation) || !currentOperation.lessonId) return;
    if (isLessonClosing(currentOperation.lessonId)) return;
    if (state.detail?.lessonId !== currentOperation.lessonId || state.detail.status !== "active") return;
    const operation = advanceOperation();
    const closeClaim = {};
    activeCloseClaim = closeClaim;
    state.closingLessonId = operation.lessonId;
    tutorSession.close();
    renderDetail();
    setStatus("Closing lesson\u2026");
    try {
      await client.closeLesson({ lessonId: operation.lessonId });
    } catch (error) {
      if (isOperationCurrent(operation) && activeCloseClaim === closeClaim) {
        activeCloseClaim = null;
        state.closingLessonId = null;
        renderDetail();
      }
      if (isOperationCurrent(operation)) throw error;
      return;
    }
    if (!isOperationCurrent(operation) || activeCloseClaim !== closeClaim) return;
    const refreshed = await refresh(operation);
    if (!isOperationCurrent(operation) || activeCloseClaim !== closeClaim) return;
    activeCloseClaim = null;
    state.closingLessonId = null;
    renderDetail();
    if (refreshed) setReadyStatus();
  };
  const pushNotification = (notification) => {
    if (disposed) return;
    state.notifications = [notification, ...state.notifications].slice(0, 12);
    renderNotifications({ state, elements });
  };
  const connectNotifications = () => {
    state.notificationHandle?.close?.();
    state.notificationHandle = client.subscribeNotifications((notification) => {
      if (disposed) return;
      pushNotification(notification);
      const operation = captureOperation();
      refresh(operation).catch((error) => {
        if (isOperationCurrent(operation)) handleUiError(error);
      });
    });
  };
  const onRefresh = () => {
    const operation = captureOperation();
    refresh(operation).catch((error) => {
      if (isOperationCurrent(operation)) handleUiError(error);
    });
  };
  const onStartLesson = (event) => {
    event.preventDefault();
    startLesson().catch(handleUiError);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifecycleGeneration += 1;
    pendingStartOperation = null;
    activeCloseClaim = null;
    tutorSession.close();
    state.notificationHandle?.close?.();
    elements.refreshButton?.removeEventListener("click", onRefresh);
    elements.startLessonForm?.removeEventListener("submit", onStartLesson);
    browserWindow.removeEventListener("beforeunload", dispose);
  };
  connectNotifications();
  render();
  elements.refreshButton?.addEventListener("click", onRefresh);
  elements.startLessonForm?.addEventListener("submit", onStartLesson);
  browserWindow.addEventListener("beforeunload", dispose, { once: true });
  const initialOperation = captureOperation();
  void refresh(initialOperation).catch((error) => {
    if (isOperationCurrent(initialOperation)) handleUiError(error);
  });
  return dispose;
};

// frontend-src/app.js
var startupHandle = startApplication({
  rootElement: document.getElementById("app-root"),
  onBootstrapped: ({ runtimeBootstrap, applicationClient, rootElement }) => {
    mountSocraticMathTeacher({
      applicationClient,
      runtimeBootstrap,
      browserWindow: window,
      createSocraticMathGraphqlClient,
      rootElement
    });
  }
});
window.addEventListener("pagehide", () => startupHandle.dispose(), { once: true });
