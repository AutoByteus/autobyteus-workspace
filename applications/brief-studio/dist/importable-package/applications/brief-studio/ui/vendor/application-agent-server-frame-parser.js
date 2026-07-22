import { APPLICATION_AGENT_COMMUNICATION_PROTOCOL, } from "./application-sdk-contracts/index.js";
import { isApplicationAgentEvent, isApplicationAgentTargetAddress, } from "./application-agent-event-validator.js";
const APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT = 1024 * 1024;
const ERROR_CODES = new Set([
    "APPLICATION_NOT_AVAILABLE", "TARGET_NOT_AVAILABLE", "INVALID_TARGET", "RUNTIME_NOT_ACTIVE",
    "CONNECTION_ABORTED", "PROTOCOL_ERROR", "INPUT_REJECTED", "EVENT_MAPPING_FAILED",
    "EVENT_SERIALIZATION_FAILED", "BACKPRESSURE_LIMIT", "TRANSPORT_FAILED",
]);
const CLOSE_REASONS = new Set([
    "CLIENT_CLOSED", "ABORTED", "ESTABLISHMENT_FAILED", "BINDING_ENDED", "STREAM_FAILED",
    "BACKPRESSURE_LIMIT", "PROTOCOL_ERROR", "TRANSPORT_FAILED",
]);
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasExactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isError = (value) => isRecord(value) && hasExactKeys(value, ["code", "message", "recoverable"]) &&
    typeof value.code === "string" && ERROR_CODES.has(value.code) &&
    typeof value.message === "string" && typeof value.recoverable === "boolean";
const isClose = (value) => isRecord(value) && hasExactKeys(value, ["reason"]) &&
    typeof value.reason === "string" && CLOSE_REASONS.has(value.reason);
export const sameApplicationAgentTargetAddress = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export const parseApplicationAgentServerFrame = (raw) => {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT) {
        return null;
    }
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        return null;
    }
    if (!isRecord(value) || value.protocol !== APPLICATION_AGENT_COMMUNICATION_PROTOCOL || typeof value.type !== "string") {
        return null;
    }
    if (value.type === "READY") {
        return hasExactKeys(value, ["protocol", "type", "address"]) && isApplicationAgentTargetAddress(value.address)
            ? value
            : null;
    }
    if (value.type === "INPUT_ACCEPTED") {
        return hasExactKeys(value, ["protocol", "type", "requestId"]) && typeof value.requestId === "string" && value.requestId.length > 0
            ? value
            : null;
    }
    if (value.type === "INPUT_REJECTED") {
        return hasExactKeys(value, ["protocol", "type", "requestId", "error"]) &&
            typeof value.requestId === "string" && value.requestId.length > 0 && isError(value.error)
            ? value
            : null;
    }
    if (value.type === "EVENT") {
        return hasExactKeys(value, ["protocol", "type", "event"]) && isApplicationAgentEvent(value.event)
            ? value
            : null;
    }
    if (value.type === "ERROR") {
        return hasExactKeys(value, ["protocol", "type", "error"]) && isError(value.error)
            ? value
            : null;
    }
    if (value.type === "CLOSED") {
        return hasExactKeys(value, ["protocol", "type", "close"]) && isClose(value.close)
            ? value
            : null;
    }
    return null;
};
//# sourceMappingURL=application-agent-server-frame-parser.js.map