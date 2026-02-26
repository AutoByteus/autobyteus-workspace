import type { FastifyReply, FastifyRequest } from "fastify";

const ADMIN_TOKEN_ERROR_PAYLOAD = {
  code: "ADMIN_TOKEN_REQUIRED",
  detail: "Valid admin token is required.",
};

export const requireAdminToken =
  (adminToken: string | null | undefined) =>
  async (_request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!adminToken) {
      return;
    }

    const request = _request as FastifyRequest<{ Headers: Record<string, unknown> }>;
    const headerValue = request.headers.authorization;
    const presentedToken = parseBearerToken(
      typeof headerValue === "string" ? headerValue : undefined,
    );

    if (!presentedToken || presentedToken !== adminToken) {
      await _reply.code(401).send(ADMIN_TOKEN_ERROR_PAYLOAD);
    }
  };

const parseBearerToken = (header: string | undefined): string | null => {
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
