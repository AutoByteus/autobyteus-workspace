export const APPLICATION_IFRAME_CHANNEL = "autobyteus.application.host" as const;
export const APPLICATION_IFRAME_CONTRACT_VERSION_V4 = "4" as const;
export const APPLICATION_IFRAME_READY_EVENT = "autobyteus.application.ui.ready" as const;
export const APPLICATION_IFRAME_BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap" as const;
export const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = "autobyteusContractVersion" as const;
export const APPLICATION_IFRAME_QUERY_APPLICATION_ID = "autobyteusApplicationId" as const;
export const APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID = "autobyteusIframeLaunchId" as const;
export const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = "autobyteusHostOrigin" as const;

const PACKAGED_HOST_ORIGIN = "file://" as const;

type UnknownRecord = Record<string, unknown>;

export type ApplicationHostTransport = {
  backendBaseUrl: string | null;
  backendNotificationsUrl: string | null;
  backendWebSocketBaseUrl: string | null;
  agentCommunicationWebSocketBaseUrl: string | null;
};

export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V4;
  applicationId: string;
  iframeLaunchId: string;
  hostOrigin: string;
};

export type ApplicationIframeEnvelopeV4<
  TPayload extends UnknownRecord = UnknownRecord,
> = {
  channel: typeof APPLICATION_IFRAME_CHANNEL;
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V4;
  eventName: string;
  payload: TPayload;
};

export type ApplicationUiReadyPayloadV4 = {
  applicationId: string;
  iframeLaunchId: string;
};

export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV4 & {
  iframeOrigin: string;
};

export type ApplicationUiReadyEnvelopeV4 =
  ApplicationIframeEnvelopeV4<ApplicationUiReadyPayloadV4> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
  };

export type ApplicationBootstrapPayloadV4 = {
  host: {
    origin: string;
  };
  application: {
    applicationId: string;
    localApplicationId: string;
    packageId: string;
    name: string;
  };
  iframeLaunchId: string;
  requestContext: {
    applicationId: string;
  };
  transport: ApplicationHostTransport;
};

export type ApplicationHostBootstrapEnvelopeV4 =
  ApplicationIframeEnvelopeV4<ApplicationBootstrapPayloadV4> & {
    eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT;
  };

const isObjectRecord = (value: unknown): value is UnknownRecord => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const hasOnlyKeys = (record: UnknownRecord, keys: string[]): boolean => {
  const recordKeys = Object.keys(record);
  return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};

export const normalizeApplicationHostOrigin = (
  origin: string | null | undefined,
  protocol?: string | null,
): string => {
  const normalizedOrigin = (origin ?? "").trim();
  const normalizedProtocol = (protocol ?? "").trim().toLowerCase();

  if (
    normalizedProtocol === "file:"
    || normalizedOrigin === PACKAGED_HOST_ORIGIN
    || normalizedOrigin.startsWith(PACKAGED_HOST_ORIGIN)
  ) {
    return PACKAGED_HOST_ORIGIN;
  }

  if (!normalizedOrigin || normalizedOrigin === "null") {
    return "null";
  }

  return normalizedOrigin;
};

export const doesApplicationHostOriginMatch = (
  expectedNormalizedHostOrigin: string,
  actualOrigin: string | null | undefined,
): boolean => {
  const normalizedActualOrigin = (actualOrigin ?? "").trim();
  if (expectedNormalizedHostOrigin === PACKAGED_HOST_ORIGIN) {
    return normalizedActualOrigin === PACKAGED_HOST_ORIGIN || normalizedActualOrigin === "null";
  }

  return normalizedActualOrigin === expectedNormalizedHostOrigin;
};

export const isApplicationIframeEnvelopeV4 = (
  value: unknown,
): value is ApplicationIframeEnvelopeV4<UnknownRecord> => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.channel === APPLICATION_IFRAME_CHANNEL
    && typeof value.contractVersion === "string"
    && typeof value.eventName === "string"
    && isObjectRecord(value.payload)
  );
};

export const isApplicationUiReadyPayloadV4 = (
  value: unknown,
): value is ApplicationUiReadyPayloadV4 => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ["applicationId", "iframeLaunchId"])
    && isNonEmptyString(value.applicationId)
    && isNonEmptyString(value.iframeLaunchId)
  );
};

export const isApplicationUiReadyEnvelopeV4 = (
  value: unknown,
): value is ApplicationUiReadyEnvelopeV4 => (
  isApplicationIframeEnvelopeV4(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V4
  && value.eventName === APPLICATION_IFRAME_READY_EVENT
  && isApplicationUiReadyPayloadV4(value.payload)
);

const isApplicationHostTransport = (
  value: unknown,
): value is ApplicationHostTransport => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ["backendBaseUrl", "backendNotificationsUrl", "backendWebSocketBaseUrl", "agentCommunicationWebSocketBaseUrl"])
    && isNullableString(value.backendBaseUrl)
    && isNullableString(value.backendNotificationsUrl)
    && isNullableString(value.backendWebSocketBaseUrl)
    && isNullableString(value.agentCommunicationWebSocketBaseUrl)
  );
};

export const isApplicationBootstrapPayloadV4 = (
  value: unknown,
): value is ApplicationBootstrapPayloadV4 => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const host = value.host;
  const application = value.application;
  const requestContext = value.requestContext;
  const transport = value.transport;

  return (
    hasOnlyKeys(value, ["host", "application", "iframeLaunchId", "requestContext", "transport"])
    && isObjectRecord(host)
    && hasOnlyKeys(host, ["origin"])
    && isNonEmptyString(host.origin)
    && isObjectRecord(application)
    && hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"])
    && isNonEmptyString(application.applicationId)
    && isNonEmptyString(application.localApplicationId)
    && isNonEmptyString(application.packageId)
    && isNonEmptyString(application.name)
    && isNonEmptyString(value.iframeLaunchId)
    && isObjectRecord(requestContext)
    && hasOnlyKeys(requestContext, ["applicationId"])
    && isNonEmptyString(requestContext.applicationId)
    && isApplicationHostTransport(transport)
  );
};

export const isApplicationHostBootstrapEnvelopeV4 = (
  value: unknown,
): value is ApplicationHostBootstrapEnvelopeV4 => (
  isApplicationIframeEnvelopeV4(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V4
  && value.eventName === APPLICATION_IFRAME_BOOTSTRAP_EVENT
  && isApplicationBootstrapPayloadV4(value.payload)
);

export const createApplicationUiReadyEnvelopeV4 = (
  payload: ApplicationUiReadyPayloadV4,
): ApplicationUiReadyEnvelopeV4 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V4,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload,
});

export const createApplicationHostBootstrapEnvelopeV4 = (
  payload: ApplicationBootstrapPayloadV4,
): ApplicationHostBootstrapEnvelopeV4 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V4,
  eventName: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  payload,
});

export const readApplicationIframeLaunchHints = (
  search: string,
): ApplicationIframeLaunchHints | null => {
  const searchParams = new URLSearchParams(search);
  const contractVersion = searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)?.trim() ?? "";
  const applicationId = searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_ID)?.trim() ?? "";
  const iframeLaunchId = searchParams.get(APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID)?.trim() ?? "";
  const hostOrigin = searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)?.trim() ?? "";

  if (
    contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V4
    || !applicationId
    || !iframeLaunchId
    || !hostOrigin
  ) {
    return null;
  }

  return {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V4,
    applicationId,
    iframeLaunchId,
    hostOrigin,
  };
};
