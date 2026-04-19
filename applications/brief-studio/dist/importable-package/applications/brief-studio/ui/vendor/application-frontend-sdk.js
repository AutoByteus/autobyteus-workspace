export const createApplicationClient = (options) => {
    const getRequestContext = () => options.requestContext ?? { applicationId: options.applicationId, launchInstanceId: null };
    return {
        getApplicationInfo: () => ({
            applicationId: options.applicationId,
            requestContext: getRequestContext(),
        }),
        query: (queryName, input) => options.transport.invokeQuery({
            applicationId: options.applicationId,
            queryName,
            requestContext: getRequestContext(),
            input: input ?? null,
        }),
        command: (commandName, input) => options.transport.invokeCommand({
            applicationId: options.applicationId,
            commandName,
            requestContext: getRequestContext(),
            input: input ?? null,
        }),
        graphql: (request) => options.transport.executeGraphql({
            applicationId: options.applicationId,
            requestContext: getRequestContext(),
            request,
        }),
        subscribeNotifications: (listener) => {
            if (!options.transport.subscribeNotifications) {
                return { close: () => undefined };
            }
            return options.transport.subscribeNotifications({
                applicationId: options.applicationId,
                listener,
            });
        },
    };
};
//# sourceMappingURL=index.js.map