export const APPLICATION_IFRAME_CHANNEL = "autobyteus.application.host" as const;
export const APPLICATION_IFRAME_CONTRACT_VERSION_V3 = "3" as const;
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
};

export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3;
  applicationId: string;
  iframeLaunchId: string;
  hostOrigin: string;
};

export type ApplicationIframeEnvelopeV3<
  TPayload extends UnknownRecord = UnknownRecord,
> = {
  channel: typeof APPLICATION_IFRAME_CHANNEL;
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3;
  eventName: string;
  payload: TPayload;
};

export type ApplicationUiReadyPayloadV3 = {
  applicationId: string;
  iframeLaunchId: string;
};

export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV3 & {
  iframeOrigin: string;
};

export type ApplicationUiReadyEnvelopeV3 =
  ApplicationIframeEnvelopeV3<ApplicationUiReadyPayloadV3> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
  };

export type ApplicationBootstrapPayloadV3 = {
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

export type ApplicationHostBootstrapEnvelopeV3 =
  ApplicationIframeEnvelopeV3<ApplicationBootstrapPayloadV3> & {
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

export const isApplicationIframeEnvelopeV3 = (
  value: unknown,
): value is ApplicationIframeEnvelopeV3<UnknownRecord> => {
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

export const isApplicationUiReadyPayloadV3 = (
  value: unknown,
): value is ApplicationUiReadyPayloadV3 => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ["applicationId", "iframeLaunchId"])
    && isNonEmptyString(value.applicationId)
    && isNonEmptyString(value.iframeLaunchId)
  );
};

export const isApplicationUiReadyEnvelopeV3 = (
  value: unknown,
): value is ApplicationUiReadyEnvelopeV3 => (
  isApplicationIframeEnvelopeV3(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V3
  && value.eventName === APPLICATION_IFRAME_READY_EVENT
  && isApplicationUiReadyPayloadV3(value.payload)
);

const isApplicationHostTransport = (
  value: unknown,
): value is ApplicationHostTransport => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ["backendBaseUrl", "backendNotificationsUrl"])
    && isNullableString(value.backendBaseUrl)
    && isNullableString(value.backendNotificationsUrl)
  );
};

export const isApplicationBootstrapPayloadV3 = (
  value: unknown,
): value is ApplicationBootstrapPayloadV3 => {
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

export const isApplicationHostBootstrapEnvelopeV3 = (
  value: unknown,
): value is ApplicationHostBootstrapEnvelopeV3 => (
  isApplicationIframeEnvelopeV3(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V3
  && value.eventName === APPLICATION_IFRAME_BOOTSTRAP_EVENT
  && isApplicationBootstrapPayloadV3(value.payload)
);

export const createApplicationUiReadyEnvelopeV3 = (
  payload: ApplicationUiReadyPayloadV3,
): ApplicationUiReadyEnvelopeV3 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload,
});

export const createApplicationHostBootstrapEnvelopeV3 = (
  payload: ApplicationBootstrapPayloadV3,
): ApplicationHostBootstrapEnvelopeV3 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
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
    contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V3
    || !applicationId
    || !iframeLaunchId
    || !hostOrigin
  ) {
    return null;
  }

  return {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
    applicationId,
    iframeLaunchId,
    hostOrigin,
  };
};
