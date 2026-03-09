export type WechatSidecarAuthResult = {
    valid: boolean;
    errorCode: null | "MISSING_SECRET" | "MISSING_SIGNATURE" | "MISSING_TIMESTAMP" | "INVALID_TIMESTAMP" | "TIMESTAMP_OUT_OF_RANGE" | "INVALID_SIGNATURE";
    message: string;
};
export type VerifyWechatSidecarSignatureInput = {
    rawBody: string;
    signatureHeader: string | null | undefined;
    timestampHeader: string | null | undefined;
    secret: string | null | undefined;
    maxSkewSeconds?: number;
    now?: Date;
};
export declare function verifyWechatSidecarSignature(input: VerifyWechatSidecarSignatureInput): WechatSidecarAuthResult;
//# sourceMappingURL=verify-wechat-sidecar-signature.d.ts.map