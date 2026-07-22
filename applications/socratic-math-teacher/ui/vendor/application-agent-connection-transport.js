export const createApplicationAgentConnectionTransport = (input) => {
    const factory = input.webSocketFactory ?? ((url) => {
        const WebSocketConstructor = globalThis.WebSocket;
        if (!WebSocketConstructor)
            throw new Error("A WebSocket implementation is required.");
        return new WebSocketConstructor(url);
    });
    const socket = factory(input.url);
    const bind = (type, listener) => {
        socket.addEventListener(type, listener);
        return () => socket.removeEventListener(type, listener);
    };
    return {
        send: (data) => socket.send(data),
        close: (code, reason) => socket.close(code, reason),
        onMessage: (listener) => bind("message", (event) => listener(event?.data)),
        onError: (listener) => bind("error", listener),
        onClose: (listener) => bind("close", (event) => listener({
            code: typeof event?.code === "number" ? event.code : 1006,
            reason: typeof event?.reason === "string" ? event.reason : "",
            wasClean: event?.wasClean === true,
        })),
    };
};
//# sourceMappingURL=application-agent-connection-transport.js.map