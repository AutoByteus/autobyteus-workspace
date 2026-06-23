export const readBearerToken = (authorizationHeader: string | string[] | undefined): string | null => {
  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!header) {
    return null;
  }
  const match = header.match(/^\s*Bearer\s+(.+)\s*$/i);
  return match?.[1]?.trim() || null;
};
