const toBinaryFrame = async (value) => {
    if (value instanceof ArrayBuffer)
        return { kind: "binary", data: new Uint8Array(value) };
    if (value instanceof Uint8Array)
        return { kind: "binary", data: value };
    if (value && typeof value === "object" && "arrayBuffer" in value) {
        const arrayBuffer = await value.arrayBuffer();
        return { kind: "binary", data: new Uint8Array(arrayBuffer) };
    }
    return null;
};
export const createApplicationBackendWebSocketTransport = (input) => {
    const factory = input.webSocketFactory ?? ((url) => {
        const Constructor = globalThis.WebSocket;
        if (!Constructor)
            throw new Error("A WebSocket implementation is required.");
        return new Constructor(url);
    });
    const socket = factory(input.url);
    socket.binaryType = "arraybuffer";
    let messageTail = Promise.resolve();
    const bind = (type, listener) => {
        socket.addEventListener(type, listener);
        return () => socket.removeEventListener(type, listener);
    };
    return {
        send: (frame) => socket.send(frame.kind === "text" ? frame.text : frame.data),
        close: (code, reason) => socket.close(code, reason),
        onMessage: (listener) => bind("message", (event) => {
            messageTail = messageTail.then(async () => {
                if (typeof event.data === "string") {
                    listener({ kind: "text", text: event.data });
                    return;
                }
                const frame = await toBinaryFrame(event.data);
                if (frame)
                    listener(frame);
            }).catch(() => undefined);
        }),
        onError: (listener) => bind("error", () => listener()),
        onClose: (listener) => bind("close", (event) => listener({
            code: event.code ?? 1006,
            reason: event.reason ?? "",
            wasClean: event.wasClean === true,
        })),
    };
};
//# sourceMappingURL=application-backend-websocket-transport.js.map