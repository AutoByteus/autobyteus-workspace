export const createApplicationClient = (options) => {
    const getRequestContext = () => options.requestContext ?? { applicationId: options.applicationId };
    return {
        getApplicationInfo: () => ({
            applicationId: options.applicationId,
            requestContext: getRequestContext(),
        }),
        agentCommunication: {
            connect: (address, connectOptions) => options.transport.connectAgentCommunication(address, connectOptions),
        },
        notifications: {
            subscribe: (listener) => options.transport.subscribeNotifications?.({ applicationId: options.applicationId, listener }) ?? { close: () => undefined },
        },
        backend: {
            query: (queryName, input) => options.transport.invokeQuery({
                applicationId: options.applicationId, queryName, requestContext: getRequestContext(), input: input ?? null,
            }),
            command: (commandName, input) => options.transport.invokeCommand({
                applicationId: options.applicationId, commandName, requestContext: getRequestContext(), input: input ?? null,
            }),
            graphql: (request) => options.transport.executeGraphql({
                applicationId: options.applicationId, requestContext: getRequestContext(), request,
            }),
            route: (request) => {
                if (!options.transport.invokeRoute)
                    throw new Error("The application transport does not support route invocation.");
                return options.transport.invokeRoute({ applicationId: options.applicationId, requestContext: getRequestContext(), request });
            },
            connectWebSocket: (path, connectOptions) => {
                if (!options.transport.connectWebSocket)
                    throw new Error("The application transport does not support WebSocket connections.");
                return options.transport.connectWebSocket(path, connectOptions);
            },
        },
    };
};
//# sourceMappingURL=application-client.js.map