export const APPLICATION_IFRAME_CHANNEL = "autobyteus.application.host";
export const APPLICATION_IFRAME_CONTRACT_VERSION = "4";
export const APPLICATION_IFRAME_READY_EVENT = "autobyteus.application.ui.ready";
export const APPLICATION_IFRAME_BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap";
export const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = "autobyteusContractVersion";
export const APPLICATION_IFRAME_QUERY_APPLICATION_ID = "autobyteusApplicationId";
export const APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID = "autobyteusIframeLaunchId";
export const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = "autobyteusHostOrigin";
const PACKAGED_HOST_ORIGIN = "file://";
const isObjectRecord = (value) => (Boolean(value) && typeof value === "object" && !Array.isArray(value));
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isNullableString = (value) => value === null || typeof value === "string";
const hasOnlyKeys = (record, keys) => {
    const recordKeys = Object.keys(record);
    return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
export const normalizeApplicationHostOrigin = (origin, protocol) => {
    const normalizedOrigin = (origin ?? "").trim();
    const normalizedProtocol = (protocol ?? "").trim().toLowerCase();
    if (normalizedProtocol === "file:"
        || normalizedOrigin === PACKAGED_HOST_ORIGIN
        || normalizedOrigin.startsWith(PACKAGED_HOST_ORIGIN)) {
        return PACKAGED_HOST_ORIGIN;
    }
    if (!normalizedOrigin || normalizedOrigin === "null") {
        return "null";
    }
    return normalizedOrigin;
};
export const doesApplicationHostOriginMatch = (expectedNormalizedHostOrigin, actualOrigin) => {
    const normalizedActualOrigin = (actualOrigin ?? "").trim();
    if (expectedNormalizedHostOrigin === PACKAGED_HOST_ORIGIN) {
        return normalizedActualOrigin === PACKAGED_HOST_ORIGIN || normalizedActualOrigin === "null";
    }
    return normalizedActualOrigin === expectedNormalizedHostOrigin;
};
export const isApplicationIframeEnvelope = (value) => {
    if (!isObjectRecord(value)) {
        return false;
    }
    return (value.channel === APPLICATION_IFRAME_CHANNEL
        && typeof value.contractVersion === "string"
        && typeof value.eventName === "string"
        && isObjectRecord(value.payload));
};
export const isApplicationUiReadyPayload = (value) => {
    if (!isObjectRecord(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ["applicationId", "iframeLaunchId"])
        && isNonEmptyString(value.applicationId)
        && isNonEmptyString(value.iframeLaunchId));
};
export const isApplicationUiReadyEnvelope = (value) => (isApplicationIframeEnvelope(value)
    && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION
    && value.eventName === APPLICATION_IFRAME_READY_EVENT
    && isApplicationUiReadyPayload(value.payload));
const isApplicationHostTransport = (value) => {
    if (!isObjectRecord(value)) {
        return false;
    }
    return (hasOnlyKeys(value, ["backendBaseUrl", "backendNotificationsUrl", "backendWebSocketBaseUrl", "agentCommunicationWebSocketBaseUrl"])
        && isNullableString(value.backendBaseUrl)
        && isNullableString(value.backendNotificationsUrl)
        && isNullableString(value.backendWebSocketBaseUrl)
        && isNullableString(value.agentCommunicationWebSocketBaseUrl));
};
export const isApplicationBootstrapPayload = (value) => {
    if (!isObjectRecord(value)) {
        return false;
    }
    const host = value.host;
    const application = value.application;
    const requestContext = value.requestContext;
    const transport = value.transport;
    return (hasOnlyKeys(value, ["host", "application", "iframeLaunchId", "requestContext", "transport"])
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
        && isApplicationHostTransport(transport));
};
export const isApplicationHostBootstrapEnvelope = (value) => (isApplicationIframeEnvelope(value)
    && value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION
    && value.eventName === APPLICATION_IFRAME_BOOTSTRAP_EVENT
    && isApplicationBootstrapPayload(value.payload));
export const createApplicationUiReadyEnvelope = (payload) => ({
    channel: APPLICATION_IFRAME_CHANNEL,
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
    eventName: APPLICATION_IFRAME_READY_EVENT,
    payload,
});
export const createApplicationHostBootstrapEnvelope = (payload) => ({
    channel: APPLICATION_IFRAME_CHANNEL,
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
    eventName: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
    payload,
});
export const readApplicationIframeLaunchHints = (search) => {
    const searchParams = new URLSearchParams(search);
    const contractVersion = searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)?.trim() ?? "";
    const applicationId = searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_ID)?.trim() ?? "";
    const iframeLaunchId = searchParams.get(APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID)?.trim() ?? "";
    const hostOrigin = searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)?.trim() ?? "";
    if (contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION
        || !applicationId
        || !iframeLaunchId
        || !hostOrigin) {
        return null;
    }
    return {
        contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
        applicationId,
        iframeLaunchId,
        hostOrigin,
    };
};
//# sourceMappingURL=application-iframe-contract.js.map