export function registerHealthRoutes(app) {
    app.get("/health", async () => ({
        service: "autobyteus-message-gateway",
        status: "ok",
        timestamp: new Date().toISOString(),
    }));
}
//# sourceMappingURL=health-route.js.map