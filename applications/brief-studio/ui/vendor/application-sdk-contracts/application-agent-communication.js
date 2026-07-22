export const APPLICATION_AGENT_COMMUNICATION_PROTOCOL = "autobyteus.application-agent-communication.v1";
export class ApplicationAgentConnectionError extends Error {
    code;
    recoverable;
    constructor(input) {
        super(input.message);
        this.name = "ApplicationAgentConnectionError";
        this.code = input.code;
        this.recoverable = input.recoverable;
    }
}
export class ApplicationAgentEventStreamSubscribeError extends Error {
    code;
    recoverable;
    constructor(input) {
        super(input.message);
        this.name = "ApplicationAgentEventStreamSubscribeError";
        this.code = input.code;
        this.recoverable = input.recoverable;
    }
}
//# sourceMappingURL=application-agent-communication.js.map