export type InboundHttpRequest = {
    method: string;
    path: string;
    headers: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
    body: unknown;
    rawBody: string;
};
//# sourceMappingURL=inbound-http-request.d.ts.map