const readRequestBody = async (request) => {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString('utf8').trim();
    if (!body) {
        return null;
    }
    try {
        return JSON.parse(body);
    }
    catch {
        return body;
    }
};
const writeJson = (response, statusCode, payload) => {
    response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
    });
    response.end(JSON.stringify(payload));
};
const readRequestContext = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }
    return payload.requestContext ?? null;
};
export const handleMockBackendRoute = async (input) => {
    if (!input.url.pathname.startsWith('/mock-backend')) {
        return false;
    }
    const payload = await readRequestBody(input.request);
    const relativePath = input.url.pathname.replace(/^\/mock-backend\/?/, '');
    const [area, encodedName = ''] = relativePath.split('/');
    const name = decodeURIComponent(encodedName);
    if (area === 'queries' || area === 'commands') {
        writeJson(input.response, 200, {
            result: {
                mock: true,
                kind: area === 'queries' ? 'query' : 'command',
                name,
                requestContext: readRequestContext(payload),
                input: payload && typeof payload === 'object' ? payload.input ?? null : null,
            },
        });
        return true;
    }
    if (area === 'graphql') {
        writeJson(input.response, 200, {
            result: {
                data: {
                    mock: true,
                    requestContext: readRequestContext(payload),
                },
            },
        });
        return true;
    }
    if (area === 'routes') {
        writeJson(input.response, 200, {
            mock: true,
            method: input.request.method,
            path: `/${relativePath.replace(/^routes\/?/, '')}`,
            requestContextHeader: input.request.headers['x-autobyteus-application-id'] ?? null,
        });
        return true;
    }
    writeJson(input.response, 404, { error: `No mock backend route for ${input.url.pathname}` });
    return true;
};
//# sourceMappingURL=mock-backend-routes.js.map