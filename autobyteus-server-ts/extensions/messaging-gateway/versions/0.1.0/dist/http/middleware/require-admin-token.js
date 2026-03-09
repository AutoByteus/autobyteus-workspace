const ADMIN_TOKEN_ERROR_PAYLOAD = {
    code: "ADMIN_TOKEN_REQUIRED",
    detail: "Valid admin token is required.",
};
export const requireAdminToken = (adminToken) => async (_request, _reply) => {
    if (!adminToken) {
        return;
    }
    const request = _request;
    const headerValue = request.headers.authorization;
    const presentedToken = parseBearerToken(typeof headerValue === "string" ? headerValue : undefined);
    if (!presentedToken || presentedToken !== adminToken) {
        await _reply.code(401).send(ADMIN_TOKEN_ERROR_PAYLOAD);
    }
};
const parseBearerToken = (header) => {
    if (!header) {
        return null;
    }
    const [scheme, token, ...rest] = header.trim().split(/\s+/);
    if (scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) {
        return null;
    }
    const normalized = token.trim();
    return normalized.length > 0 ? normalized : null;
};
//# sourceMappingURL=require-admin-token.js.map