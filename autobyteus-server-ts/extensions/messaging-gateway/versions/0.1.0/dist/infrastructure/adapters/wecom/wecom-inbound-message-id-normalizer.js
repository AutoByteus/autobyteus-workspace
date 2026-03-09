import { createHash } from "node:crypto";
export function normalizeInboundMessageId(payload) {
    const directCandidate = pickFirstNonEmptyString(payload, [
        "externalMessageId",
        "messageId",
        "msgId",
        "msgid",
        "id",
    ]);
    if (directCandidate) {
        return directCandidate;
    }
    const hashBase = stableStringify(payload);
    const digest = createHash("sha1").update(hashBase).digest("hex");
    return `wecom-hash-${digest.slice(0, 24)}`;
}
const pickFirstNonEmptyString = (input, keys) => {
    for (const key of keys) {
        const value = input[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
};
const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const record = value;
        const keys = Object.keys(record).sort();
        const content = keys
            .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
            .join(",");
        return `{${content}}`;
    }
    return JSON.stringify(value);
};
//# sourceMappingURL=wecom-inbound-message-id-normalizer.js.map