const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isNullableString = (value) => value === null || isString(value);
const isStringArray = (value) => Array.isArray(value) && value.every(isString);
const isOneOf = (...allowed) => (value) => typeof value === "string" && allowed.includes(value);
const exact = (value, shape) => {
    if (!isRecord(value))
        return false;
    const keys = Object.keys(shape);
    return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key) && shape[key](value[key]));
};
export const isApplicationAgentTargetAddress = (value) => {
    if (!isRecord(value) || !exact(value, { bindingId: isString, target: isRecord }))
        return false;
    const bindingId = value.bindingId;
    const target = value.target;
    if (typeof bindingId !== "string" || !bindingId.trim() || !isRecord(target) || typeof target.kind !== "string")
        return false;
    if (target.kind === "AGENT_RUN")
        return exact(target, { kind: isOneOf("AGENT_RUN") });
    if (target.kind === "AGENT_TEAM_RUN")
        return exact(target, { kind: isOneOf("AGENT_TEAM_RUN") });
    return target.kind === "AGENT_TEAM_MEMBER" && exact(target, {
        kind: isOneOf("AGENT_TEAM_MEMBER"),
        memberRouteKey: (memberRouteKey) => typeof memberRouteKey === "string" && memberRouteKey.trim().length > 0,
    });
};
const isProducer = (value) => exact(value, {
    runId: isString,
    memberRouteKey: isString,
    memberName: isNullableString,
    displayName: isNullableString,
    runtimeKind: isOneOf("AGENT", "AGENT_TEAM_MEMBER"),
    teamPath: isStringArray,
});
const isStreamEvent = (value) => {
    if (!isRecord(value) || typeof value.type !== "string")
        return false;
    switch (value.type) {
        case "TURN_STARTED":
        case "TURN_COMPLETED":
        case "TURN_INTERRUPTED":
            return exact(value, { type: isOneOf(value.type) });
        case "TEXT_DELTA":
            return exact(value, {
                type: isOneOf("TEXT_DELTA"),
                delta: (delta) => typeof delta === "string" && delta.length > 0,
            });
        case "ERROR":
            return exact(value, {
                type: isOneOf("ERROR"),
                message: (message) => typeof message === "string" && message.length > 0,
            });
        default:
            return false;
    }
};
export const isApplicationAgentEvent = (value) => {
    if (!isRecord(value) || !exact(value, {
        sequence: (sequence) => typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence > 0,
        observedAt: isString,
        applicationId: isString,
        address: isApplicationAgentTargetAddress,
        runtimeSubject: isOneOf("AGENT_RUN", "TEAM_RUN"),
        producer: isProducer,
        event: isStreamEvent,
    }))
        return false;
    const address = value.address;
    const expectedRuntimeSubject = address.target.kind === "AGENT_RUN" ? "AGENT_RUN" : "TEAM_RUN";
    return value.runtimeSubject === expectedRuntimeSubject;
};
//# sourceMappingURL=application-agent-event-validator.js.map