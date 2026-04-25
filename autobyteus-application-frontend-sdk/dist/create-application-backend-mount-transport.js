const normalizeBackendBaseUrl = (backendBaseUrl) => {
    const normalized = backendBaseUrl.trim().replace(/\/+$/, "");
    if (!normalized) {
        throw new Error("backendBaseUrl is required.");
    }
    return normalized;
};
const resolveFetch = (fetchImpl) => {
    if (fetchImpl) {
        return fetchImpl;
    }
    const globalFetch = globalThis.fetch;
    if (typeof globalFetch !== "function") {
        throw new Error("A fetch implementation is required to use the application backend mount transport.");
    }
    return globalFetch;
};
const resolveNotificationSocketFactory = (socketFactory) => {
    if (socketFactory) {
        return socketFactory;
    }
    const GlobalWebSocket = globalThis.WebSocket;
    if (typeof GlobalWebSocket !== "function") {
        throw new Error("A WebSocket implementation is required to subscribe to application notifications.");
    }
    return (url) => new GlobalWebSocket(url);
};
const readJsonPayload = async (response) => {
    try {
        return await response.json();
    }
    catch {
        return null;
    }
};
const readErrorMessage = async (response) => {
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
const invokeJsonResult = async (fetchImpl, url, body) => {
    const response = await fetchImpl(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            accept: "application/json",
        },
        body: JSON.stringify(body),
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
const appendQueryParams = (url, query) => {
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
const normalizeRoutePath = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return "/";
    }
    return `/${trimmed.replace(/^\/+/, "")}`.replace(/\/+/g, "/");
};
const toRouteHeaders = (requestContext, headers) => {
    const nextHeaders = {
        accept: "application/json",
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
const findHeaderKey = (headers, name) => {
    const normalizedName = name.toLowerCase();
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === normalizedName) {
            return key;
        }
    }
    return null;
};
const isJsonContentType = (value) => {
    if (typeof value !== "string") {
        return false;
    }
    const normalized = value.toLowerCase();
    return normalized.includes("/json") || normalized.includes("+json");
};
const hasConstructorName = (value, expectedName) => !!value
    && typeof value === "object"
    && value.constructor?.name === expectedName;
const isNonJsonRouteBody = (value) => typeof value === "string"
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || hasConstructorName(value, "Blob")
    || hasConstructorName(value, "File")
    || hasConstructorName(value, "FormData")
    || hasConstructorName(value, "URLSearchParams")
    || hasConstructorName(value, "ReadableStream");
const prepareRouteFetchRequest = (input) => {
    const headers = toRouteHeaders(input.requestContext, input.request.headers);
    const requestBody = input.request.body;
    if (requestBody == null || isNonJsonRouteBody(requestBody)) {
        return { headers, body: requestBody ?? undefined };
    }
    const contentTypeHeader = findHeaderKey(headers, "content-type");
    if (!isJsonContentType(contentTypeHeader ? headers[contentTypeHeader] : null)) {
        headers[contentTypeHeader ?? "content-type"] = "application/json";
    }
    return {
        headers,
        body: JSON.stringify(requestBody),
    };
};
const parseRouteResponseBody = async (response) => {
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType.toLowerCase().includes("application/json")) {
        return await readJsonPayload(response);
    }
    const text = await response.text().catch(() => "");
    return text || null;
};
export const deriveApplicationBackendMountEndpoints = (backendBaseUrl) => {
    const normalizedBaseUrl = normalizeBackendBaseUrl(backendBaseUrl);
    return {
        backendBaseUrl: normalizedBaseUrl,
        queriesBaseUrl: `${normalizedBaseUrl}/queries`,
        commandsBaseUrl: `${normalizedBaseUrl}/commands`,
        graphqlUrl: `${normalizedBaseUrl}/graphql`,
        routesBaseUrl: `${normalizedBaseUrl}/routes`,
    };
};
export const createApplicationBackendMountTransport = (options) => {
    const endpoints = deriveApplicationBackendMountEndpoints(options.backendBaseUrl);
    const fetchImpl = resolveFetch(options.fetchImpl);
    return {
        invokeQuery: async ({ queryName, requestContext, input }) => invokeJsonResult(fetchImpl, `${endpoints.queriesBaseUrl}/${encodeURIComponent(queryName)}`, { requestContext, input }),
        invokeCommand: async ({ commandName, requestContext, input }) => invokeJsonResult(fetchImpl, `${endpoints.commandsBaseUrl}/${encodeURIComponent(commandName)}`, { requestContext, input }),
        executeGraphql: async ({ requestContext, request }) => invokeJsonResult(fetchImpl, endpoints.graphqlUrl, { requestContext, request }),
        invokeRoute: async ({ requestContext, request }) => {
            const url = appendQueryParams(`${endpoints.routesBaseUrl}${normalizeRoutePath(request.path)}`, request.query);
            const routeRequest = prepareRouteFetchRequest({ requestContext, request });
            const response = await fetchImpl(url, {
                method: request.method,
                headers: routeRequest.headers,
                body: routeRequest.body,
            });
            if (!response.ok) {
                throw new Error(await readErrorMessage(response));
            }
            return {
                status: response.status,
                body: await parseRouteResponseBody(response),
            };
        },
        subscribeNotifications: ({ listener }) => {
            const notificationsUrl = options.backendNotificationsUrl?.trim();
            if (!notificationsUrl) {
                return { close: () => undefined };
            }
            const socket = resolveNotificationSocketFactory(options.webSocketFactory)(notificationsUrl);
            socket.addEventListener?.("message", (event) => {
                try {
                    const message = JSON.parse(String(event.data));
                    if (message.type === "notification" && message.notification) {
                        listener(message.notification);
                    }
                }
                catch {
                    // ignore malformed notifications
                }
            });
            return {
                close: () => {
                    try {
                        socket.close();
                    }
                    catch {
                        // ignore close failures
                    }
                },
            };
        },
    };
};
//# sourceMappingURL=create-application-backend-mount-transport.js.map