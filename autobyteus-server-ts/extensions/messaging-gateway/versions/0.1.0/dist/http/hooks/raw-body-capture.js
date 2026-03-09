export function registerRawBodyCaptureHook(app) {
    const marker = app;
    if (marker.__rawBodyCaptureRegistered) {
        return;
    }
    marker.__rawBodyCaptureRegistered = true;
    app.removeContentTypeParser("application/json");
    app.addContentTypeParser("application/json", { parseAs: "string" }, (request, rawBody, done) => {
        const rawBodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody;
        request.rawBody = rawBodyText;
        if (rawBodyText.length === 0) {
            done(null, {});
            return;
        }
        try {
            done(null, JSON.parse(rawBodyText));
        }
        catch (error) {
            done(error);
        }
    });
}
//# sourceMappingURL=raw-body-capture.js.map