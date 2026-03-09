export type ServerCallbackAuthResult = {
    valid: boolean;
    errorCode: null | "MISSING_SECRET" | "MISSING_SIGNATURE" | "MISSING_TIMESTAMP" | "INVALID_TIMESTAMP" | "TIMESTAMP_OUT_OF_RANGE" | "INVALID_SIGNATURE";
    message: string;
};
export type VerifyServerCallbackSignatureInput = {
    rawBody: string;
    signatureHeader: string | null | undefined;
    timestampHeader: string | null | undefined;
    secret: string | null | undefined;
    allowInsecureWhenSecretMissing?: boolean;
    maxSkewSeconds?: number;
    now?: Date;
};
export declare function verifyServerCallbackSignature(input: VerifyServerCallbackSignatureInput): ServerCallbackAuthResult;
//# sourceMappingURL=verify-server-callback-signature.d.ts.map