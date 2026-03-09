export function toInboundHttpRequest(request) {
    const headers = {};
    for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === "string") {
            headers[key.toLowerCase()] = value;
        }
        else if (Array.isArray(value) && value.length > 0) {
            headers[key.toLowerCase()] = value[0];
        }
    }
    const query = {};
    const queryRecord = request.query;
    for (const [key, value] of Object.entries(queryRecord ?? {})) {
        if (typeof value === "string") {
            query[key] = value;
        }
    }
    const rawBodyFromHook = request.rawBody;
    const rawBody = typeof rawBodyFromHook === "string"
        ? rawBodyFromHook
        : typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body ?? {});
    return {
        method: request.method,
        path: request.url,
        headers,
        query,
        body: request.body,
        rawBody,
    };
}
//# sourceMappingURL=http-request-mapper.js.map