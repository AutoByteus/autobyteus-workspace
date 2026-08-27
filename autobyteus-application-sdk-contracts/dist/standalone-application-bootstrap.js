export const STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION = "1";
export const STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX = "/_autobyteus/";
const isObjectRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasOnlyKeys = (record, keys) => {
    const recordKeys = Object.keys(record);
    return recordKeys.length === keys.length && keys.every((key) => recordKeys.includes(key));
};
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
export const isConfinedStandalonePlatformPath = (value) => {
    if (!isNonEmptyString(value) || !value.startsWith(STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX)) {
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
    }
    catch {
        return false;
    }
};
const isNullablePlatformPath = (value) => value === null || isConfinedStandalonePlatformPath(value);
export const isStandaloneApplicationBootstrapPayload = (value) => {
    if (!isObjectRecord(value) || !hasOnlyKeys(value, ["contractVersion", "application", "transportPaths"])) {
        return false;
    }
    if (value.contractVersion !== STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION) {
        return false;
    }
    const application = value.application;
    const transportPaths = value.transportPaths;
    return (isObjectRecord(application)
        && hasOnlyKeys(application, ["applicationId", "localApplicationId", "packageId", "name"])
        && isNonEmptyString(application.applicationId)
        && isNonEmptyString(application.localApplicationId)
        && isNonEmptyString(application.packageId)
        && isNonEmptyString(application.name)
        && isObjectRecord(transportPaths)
        && hasOnlyKeys(transportPaths, [
            "backendBasePath",
            "backendNotificationsPath",
            "backendWebSocketBasePath",
            "agentCommunicationWebSocketBasePath",
        ])
        && isConfinedStandalonePlatformPath(transportPaths.backendBasePath)
        && isNullablePlatformPath(transportPaths.backendNotificationsPath)
        && isNullablePlatformPath(transportPaths.backendWebSocketBasePath)
        && isNullablePlatformPath(transportPaths.agentCommunicationWebSocketBasePath));
};
export const validateStandaloneApplicationBootstrapPayload = (value) => {
    if (!isStandaloneApplicationBootstrapPayload(value)) {
        throw new Error("The standalone application bootstrap response is invalid.");
    }
    return value;
};
//# sourceMappingURL=standalone-application-bootstrap.js.map