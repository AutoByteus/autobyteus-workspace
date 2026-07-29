import type { ApplicationBootstrapPayload } from "./application-iframe-contract.js";

type UnknownRecord = Record<string, unknown>;

export type ApplicationRuntimeBootstrap = {
  contractVersion: "1";
  application: {
    applicationId: string;
    localApplicationId: string;
    packageId: string;
    name: string;
  };
  transport: {
    backendBaseUrl: string;
    backendNotificationsUrl: string | null;
    backendWebSocketBaseUrl: string | null;
    agentCommunicationWebSocketBaseUrl: string | null;
  };
};

const isObjectRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (record: UnknownRecord, keys: string[]): boolean => {
  const recordKeys = Object.keys(record);
  return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNullableAbsoluteUrl = (
  value: unknown,
  allowedProtocols: ReadonlySet<string>,
): value is string | null => {
  if (value === null) {
    return true;
  }
  if (!isNonEmptyString(value)) {
    return false;
  }
  try {
    return allowedProtocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const isApplicationRuntimeBootstrap = (
  value: unknown,
): value is ApplicationRuntimeBootstrap => {
  if (!isObjectRecord(value) || !hasOnlyKeys(value, ["contractVersion", "application", "transport"])) {
    return false;
  }
  if (value.contractVersion !== "1") {
    return false;
  }

  const application = value.application;
  const transport = value.transport;
  if (
    !isObjectRecord(application)
    || !hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"])
    || !isNonEmptyString(application.applicationId)
    || !isNonEmptyString(application.localApplicationId)
    || !isNonEmptyString(application.packageId)
    || !isNonEmptyString(application.name)
  ) {
    return false;
  }

  return (
    isObjectRecord(transport)
    && hasOnlyKeys(transport, [
      "backendBaseUrl",
      "backendNotificationsUrl",
      "backendWebSocketBaseUrl",
      "agentCommunicationWebSocketBaseUrl",
    ])
    && isNullableAbsoluteUrl(transport.backendBaseUrl, new Set(["http:", "https:"]))
    && transport.backendBaseUrl !== null
    && isNullableAbsoluteUrl(transport.backendNotificationsUrl, new Set(["ws:", "wss:"]))
    && isNullableAbsoluteUrl(transport.backendWebSocketBaseUrl, new Set(["ws:", "wss:"]))
    && isNullableAbsoluteUrl(transport.agentCommunicationWebSocketBaseUrl, new Set(["ws:", "wss:"]))
  );
};

export const normalizeStudioIframeBootstrap = (
  payload: ApplicationBootstrapPayload,
): ApplicationRuntimeBootstrap => {
  const runtimeBootstrap: ApplicationRuntimeBootstrap = {
    contractVersion: "1",
    application: structuredClone(payload.application),
    transport: {
      backendBaseUrl: payload.transport.backendBaseUrl?.trim() ?? "",
      backendNotificationsUrl: payload.transport.backendNotificationsUrl,
      backendWebSocketBaseUrl: payload.transport.backendWebSocketBaseUrl,
      agentCommunicationWebSocketBaseUrl: payload.transport.agentCommunicationWebSocketBaseUrl,
    },
  };
  if (!isApplicationRuntimeBootstrap(runtimeBootstrap)) {
    throw new Error("The Studio host supplied invalid application runtime endpoints.");
  }
  return runtimeBootstrap;
};
