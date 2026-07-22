import { APPLICATION_AGENT_COMMUNICATION_PROTOCOL, ApplicationAgentConnectionError, } from "@autobyteus/application-sdk-contracts";
import { parseApplicationAgentServerFrame, sameApplicationAgentTargetAddress, } from "./application-agent-server-frame-parser.js";
const APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT = 1024 * 1024;
let requestSequence = 0;
const nextRequestId = () => {
    const randomUUID = globalThis.crypto?.randomUUID;
    return randomUUID ? randomUUID.call(globalThis.crypto) : `application-agent-input-${Date.now()}-${++requestSequence}`;
};
const hasOnlyKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
export const createApplicationAgentConnection = (input) => {
    const address = structuredClone(input.address);
    let state = "connecting";
    let readySettled = false;
    let closeEmitted = false;
    let announcedClose = null;
    const events = new Set();
    const errors = new Set();
    const closes = new Set();
    const pendingInputs = new Map();
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    void ready.catch(() => undefined);
    let releases = [];
    const dispatch = (listeners, value) => {
        for (const listener of listeners)
            queueMicrotask(() => { try {
                listener(value);
            }
            catch { /* listener isolation */ } });
    };
    const settleReadyFailure = (error, emit) => {
        if (!readySettled) {
            readySettled = true;
            rejectReady(error);
        }
        if (emit)
            dispatch(errors, error);
    };
    const rejectInputs = (error) => {
        for (const pending of pendingInputs.values())
            pending.reject(error);
        pendingInputs.clear();
    };
    const emitClose = (reason) => {
        if (closeEmitted)
            return;
        closeEmitted = true;
        state = "closed";
        input.signal?.removeEventListener("abort", abort);
        for (const release of releases.splice(0))
            release();
        rejectInputs(new ApplicationAgentConnectionError({
            code: "TRANSPORT_FAILED",
            message: "The application agent connection transport failed.",
            recoverable: true,
        }));
        dispatch(closes, { reason });
    };
    const fail = (error, reason) => {
        if (state === "closed" || state === "closing")
            return;
        const wasConnecting = state === "connecting";
        state = "closing";
        announcedClose = reason;
        if (wasConnecting)
            settleReadyFailure(error, true);
        else
            dispatch(errors, error);
    };
    const failProtocol = () => {
        fail(new ApplicationAgentConnectionError({
            code: "PROTOCOL_ERROR",
            message: "The application agent connection protocol was invalid.",
            recoverable: false,
        }), "PROTOCOL_ERROR");
        try {
            input.transport.close(1002, "Protocol error");
        }
        catch {
            emitClose("PROTOCOL_ERROR");
        }
    };
    const onMessage = (raw) => {
        const frame = parseApplicationAgentServerFrame(raw);
        if (!frame) {
            failProtocol();
            return;
        }
        if (state === "connecting") {
            if (frame.type === "ERROR" && hasOnlyKeys(frame, ["protocol", "type", "error"])) {
                fail(new ApplicationAgentConnectionError(frame.error), "ESTABLISHMENT_FAILED");
                return;
            }
            if (frame.type !== "READY" || !sameApplicationAgentTargetAddress(frame.address, address)) {
                failProtocol();
                return;
            }
            state = "open";
            readySettled = true;
            resolveReady();
            return;
        }
        if (state === "closing") {
            if (frame.type === "CLOSED") {
                announcedClose = frame.close.reason;
                emitClose(frame.close.reason);
                try {
                    input.transport.close(1000, "");
                }
                catch { /* finalized */ }
            }
            return;
        }
        if (state !== "open")
            return;
        if (frame.type === "EVENT" && hasOnlyKeys(frame, ["protocol", "type", "event"])) {
            if (!sameApplicationAgentTargetAddress(frame.event.address, address)) {
                failProtocol();
                return;
            }
            dispatch(events, frame.event);
            return;
        }
        if ((frame.type === "INPUT_ACCEPTED" || frame.type === "INPUT_REJECTED") && typeof frame.requestId === "string") {
            const expected = frame.type === "INPUT_ACCEPTED"
                ? ["protocol", "type", "requestId"]
                : ["protocol", "type", "requestId", "error"];
            if (!hasOnlyKeys(frame, expected))
                return failProtocol();
            const pending = pendingInputs.get(frame.requestId);
            if (!pending) {
                failProtocol();
                return;
            }
            pendingInputs.delete(frame.requestId);
            if (frame.type === "INPUT_ACCEPTED")
                pending.resolve();
            else
                pending.reject(new ApplicationAgentConnectionError(frame.error));
            return;
        }
        if (frame.type === "ERROR" && hasOnlyKeys(frame, ["protocol", "type", "error"])) {
            dispatch(errors, new ApplicationAgentConnectionError(frame.error));
            return;
        }
        if (frame.type === "CLOSED" && hasOnlyKeys(frame, ["protocol", "type", "close"])) {
            state = "closing";
            announcedClose = frame.close.reason;
            emitClose(frame.close.reason);
            try {
                input.transport.close(1000, "");
            }
            catch { /* finalized */ }
            return;
        }
        failProtocol();
    };
    const onTransportFailure = () => {
        if (state === "closed" || state === "closing")
            return;
        fail(new ApplicationAgentConnectionError({
            code: "TRANSPORT_FAILED",
            message: "The application agent connection transport failed.",
            recoverable: true,
        }), "TRANSPORT_FAILED");
    };
    const abort = () => {
        if (state === "closed" || state === "closing")
            return;
        const wasConnecting = state === "connecting";
        state = "closing";
        announcedClose = "ABORTED";
        if (wasConnecting)
            settleReadyFailure(new ApplicationAgentConnectionError({
                code: "CONNECTION_ABORTED",
                message: "Application agent connection was aborted.",
                recoverable: true,
            }), false);
        try {
            input.transport.close(1000, "Aborted");
        }
        catch {
            emitClose("ABORTED");
        }
    };
    releases = [
        input.transport.onMessage(onMessage),
        input.transport.onError(onTransportFailure),
        input.transport.onClose(() => {
            if (state === "connecting")
                onTransportFailure();
            emitClose(announcedClose ?? "TRANSPORT_FAILED");
        }),
    ];
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted)
        abort();
    return {
        get address() { return structuredClone(address); },
        get state() { return state; },
        ready,
        sendInput: (agentInput) => {
            if (state !== "open") {
                return Promise.reject(new ApplicationAgentConnectionError({
                    code: state === "connecting" ? "INPUT_REJECTED" : "TRANSPORT_FAILED",
                    message: state === "connecting"
                        ? "Application agent input was rejected."
                        : "The application agent connection transport failed.",
                    recoverable: true,
                }));
            }
            const requestId = nextRequestId();
            return new Promise((resolve, reject) => {
                let serialized;
                try {
                    const frame = {
                        protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
                        type: "INPUT",
                        requestId,
                        input: structuredClone(agentInput),
                    };
                    serialized = JSON.stringify(frame);
                    if (new TextEncoder().encode(serialized).byteLength > APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT) {
                        reject(new ApplicationAgentConnectionError({
                            code: "INPUT_REJECTED",
                            message: "Application agent input was rejected.",
                            recoverable: true,
                        }));
                        return;
                    }
                }
                catch {
                    reject(new ApplicationAgentConnectionError({
                        code: "INPUT_REJECTED",
                        message: "Application agent input was rejected.",
                        recoverable: true,
                    }));
                    return;
                }
                pendingInputs.set(requestId, { resolve, reject });
                try {
                    input.transport.send(serialized);
                }
                catch {
                    pendingInputs.delete(requestId);
                    reject(new ApplicationAgentConnectionError({
                        code: "TRANSPORT_FAILED",
                        message: "The application agent connection transport failed.",
                        recoverable: true,
                    }));
                }
            });
        },
        onEvent: (listener) => { events.add(listener); return () => { events.delete(listener); }; },
        onError: (listener) => { errors.add(listener); return () => { errors.delete(listener); }; },
        onClose: (listener) => { closes.add(listener); return () => { closes.delete(listener); }; },
        close: () => {
            if (state === "closed" || state === "closing")
                return;
            const wasConnecting = state === "connecting";
            state = "closing";
            announcedClose = "CLIENT_CLOSED";
            if (wasConnecting)
                settleReadyFailure(new ApplicationAgentConnectionError({
                    code: "CONNECTION_ABORTED",
                    message: "Application agent connection was aborted.",
                    recoverable: true,
                }), false);
            try {
                input.transport.close(1000, "");
            }
            catch {
                emitClose("CLIENT_CLOSED");
            }
        },
    };
};
//# sourceMappingURL=application-agent-connection.js.map