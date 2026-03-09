export type RetryPolicy = {
    baseDelayMs: number;
    maxDelayMs: number;
    factor: number;
};
export declare function nextDelayMs(attempt: number, policy: RetryPolicy): number;
//# sourceMappingURL=exponential-backoff.d.ts.map