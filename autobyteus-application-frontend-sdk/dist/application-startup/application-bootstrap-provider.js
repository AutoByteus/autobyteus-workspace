export const resolveApplicationStartupWindow = () => {
    const startupWindow = globalThis.window;
    if (!startupWindow) {
        throw new Error("A browser window is required to start an application.");
    }
    return startupWindow;
};
//# sourceMappingURL=application-bootstrap-provider.js.map