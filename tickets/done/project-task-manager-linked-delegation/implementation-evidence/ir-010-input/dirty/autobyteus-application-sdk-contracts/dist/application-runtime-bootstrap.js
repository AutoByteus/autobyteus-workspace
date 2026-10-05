const isObjectRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasOnlyKeys = (record, keys) => {
    const recordKeys = Object.keys(record);
    return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isNullableAbsoluteUrl = (value, allowedProtocols) => {
    if (value === null) {
        return true;
    }
    if (!isNonEmptyString(value)) {
        return false;
    }
    try {
        return allowedProtocols.has(new URL(value).protocol);
    }
    catch {
        return false;
    }
};
export const isApplicationRuntimeBootstrap = (value) => {
    if (!isObjectRecord(value) || !hasOnlyKeys(value, ["contractVersion", "application", "transport"])) {
        return false;
    }
    if (value.contractVersion !== "1") {
        return false;
    }
    const application = value.application;
    const transport = value.transport;
    if (!isObjectRecord(application)
        || !hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"])
        || !isNonEmptyString(application.applicationId)
        || !isNonEmptyString(application.localApplicationId)
        || !isNonEmptyString(application.packageId)
        || !isNonEmptyString(application.name)) {
        return false;
    }
    return (isObjectRecord(transport)
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
        && isNullableAbsoluteUrl(transport.agentCommunicationWebSocketBaseUrl, new Set(["ws:", "wss:"])));
};
export const normalizeStudioIframeBootstrap = (payload) => {
    const runtimeBootstrap = {
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
//# sourceMappingURL=application-runtime-bootstrap.js.map