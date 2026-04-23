export const APPLICATION_IFRAME_CHANNEL = "autobyteus.application.host" as const;
export const APPLICATION_IFRAME_CONTRACT_VERSION_V2 = "2" as const;
export const APPLICATION_IFRAME_READY_EVENT = "autobyteus.application.ui.ready" as const;
export const APPLICATION_IFRAME_BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap" as const;
export const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = "autobyteusContractVersion" as const;
export const APPLICATION_IFRAME_QUERY_APPLICATION_ID = "autobyteusApplicationId" as const;
export const APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID = "autobyteusLaunchInstanceId" as const;
export const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = "autobyteusHostOrigin" as const;

const PACKAGED_HOST_ORIGIN = "file://" as const;

type UnknownRecord = Record<string, unknown>;

export type ApplicationHostTransport = {
  backendBaseUrl: string | null;
  backendNotificationsUrl: string | null;
};

export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2;
  applicationId: string;
  launchInstanceId: string;
  hostOrigin: string;
};

export type ApplicationIframeEnvelopeV2<
  TPayload extends UnknownRecord = UnknownRecord,
> = {
  channel: typeof APPLICATION_IFRAME_CHANNEL;
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2;
  eventName: string;
  payload: TPayload;
};

export type ApplicationUiReadyPayloadV2 = {
  applicationId: string;
  launchInstanceId: string;
};

export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV2 & {
  iframeOrigin: string;
};

export type ApplicationUiReadyEnvelopeV2 =
  ApplicationIframeEnvelopeV2<ApplicationUiReadyPayloadV2> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
  };

export type ApplicationBootstrapPayloadV2 = {
  host: {
    origin: string;
  };
  application: {
    applicationId: string;
    localApplicationId: string;
    packageId: string;
    name: string;
  };
  launch: {
    launchInstanceId: string;
  };
  requestContext: {
    applicationId: string;
    launchInstanceId: string;
  };
  transport: ApplicationHostTransport;
};

export type ApplicationHostBootstrapEnvelopeV2 =
  ApplicationIframeEnvelopeV2<ApplicationBootstrapPayloadV2> & {
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

export const isApplicationIframeEnvelopeV2 = (
  value: unknown,
): value is ApplicationIframeEnvelopeV2<UnknownRecord> => {
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

export const isApplicationUiReadyPayloadV2 = (
  value: unknown,
): value is ApplicationUiReadyPayloadV2 => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    hasOnlyKeys(value, ["applicationId", "launchInstanceId"])
    && isNonEmptyString(value.applicationId)
    && isNonEmptyString(value.launchInstanceId)
  );
};

export const isApplicationUiReadyEnvelopeV2 = (
  value: unknown,
): value is ApplicationUiReadyEnvelopeV2 => (
  isApplicationIframeEnvelopeV2(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V2
  && value.eventName === APPLICATION_IFRAME_READY_EVENT
  && isApplicationUiReadyPayloadV2(value.payload)
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

export const isApplicationBootstrapPayloadV2 = (
  value: unknown,
): value is ApplicationBootstrapPayloadV2 => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const host = value.host;
  const application = value.application;
  const launch = value.launch;
  const requestContext = value.requestContext;
  const transport = value.transport;

  return (
    hasOnlyKeys(value, ["host", "application", "launch", "requestContext", "transport"])
    && isObjectRecord(host)
    && hasOnlyKeys(host, ["origin"])
    && isNonEmptyString(host.origin)
    && isObjectRecord(application)
    && hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"])
    && isNonEmptyString(application.applicationId)
    && isNonEmptyString(application.localApplicationId)
    && isNonEmptyString(application.packageId)
    && isNonEmptyString(application.name)
    && isObjectRecord(launch)
    && hasOnlyKeys(launch, ["launchInstanceId"])
    && isNonEmptyString(launch.launchInstanceId)
    && isObjectRecord(requestContext)
    && hasOnlyKeys(requestContext, ["applicationId", "launchInstanceId"])
    && isNonEmptyString(requestContext.applicationId)
    && isNonEmptyString(requestContext.launchInstanceId)
    && isApplicationHostTransport(transport)
  );
};

export const isApplicationHostBootstrapEnvelopeV2 = (
  value: unknown,
): value is ApplicationHostBootstrapEnvelopeV2 => (
  isApplicationIframeEnvelopeV2(value)
  && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V2
  && value.eventName === APPLICATION_IFRAME_BOOTSTRAP_EVENT
  && isApplicationBootstrapPayloadV2(value.payload)
);

export const createApplicationUiReadyEnvelopeV2 = (
  payload: ApplicationUiReadyPayloadV2,
): ApplicationUiReadyEnvelopeV2 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload,
});

export const createApplicationHostBootstrapEnvelopeV2 = (
  payload: ApplicationBootstrapPayloadV2,
): ApplicationHostBootstrapEnvelopeV2 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
  eventName: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  payload,
});

export const readApplicationIframeLaunchHints = (
  search: string,
): ApplicationIframeLaunchHints | null => {
  const searchParams = new URLSearchParams(search);
  const contractVersion = searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)?.trim() ?? "";
  const applicationId = searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_ID)?.trim() ?? "";
  const launchInstanceId = searchParams.get(APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID)?.trim() ?? "";
  const hostOrigin = searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)?.trim() ?? "";

  if (
    contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V2
    || !applicationId
    || !launchInstanceId
    || !hostOrigin
  ) {
    return null;
  }

  return {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
    applicationId,
    launchInstanceId,
    hostOrigin,
  };
};
