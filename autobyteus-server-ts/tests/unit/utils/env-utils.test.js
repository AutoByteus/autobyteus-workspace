import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureServerHostEnvVar } from "../../../src/utils/env-utils.js";
import * as networkUtils from "../../../src/utils/network-utils.js";
describe("env-utils", () => {
    let originalEnvValue;
    beforeEach(() => {
        originalEnvValue = process.env.AUTOBYTEUS_SERVER_HOST;
        delete process.env.AUTOBYTEUS_SERVER_HOST;
    });
    afterEach(() => {
        if (originalEnvValue) {
            process.env.AUTOBYTEUS_SERVER_HOST = originalEnvValue;
        }
        else {
            delete process.env.AUTOBYTEUS_SERVER_HOST;
        }
        vi.restoreAllMocks();
    });
    it("does not override when already set", () => {
        process.env.AUTOBYTEUS_SERVER_HOST = "http://example.com:9000";
        ensureServerHostEnvVar("0.0.0.0", 8000);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://example.com:9000");
    });
    it("defaults to localhost for loopback inputs", () => {
        ensureServerHostEnvVar("127.0.0.1", 8080);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://localhost:8080");
        delete process.env.AUTOBYTEUS_SERVER_HOST;
        ensureServerHostEnvVar("localhost", 9000);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://localhost:9000");
    });
    it("uses detected IP when binding to 0.0.0.0", () => {
        vi.spyOn(networkUtils, "getLocalIp").mockReturnValue("192.168.1.100");
        ensureServerHostEnvVar("0.0.0.0", 8000);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://192.168.1.100:8000");
    });
    it("falls back to localhost when binding to 0.0.0.0 and detection fails", () => {
        vi.spyOn(networkUtils, "getLocalIp").mockReturnValue(null);
        ensureServerHostEnvVar("0.0.0.0", 8000);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://localhost:8000");
    });
    it("handles IPv6 wildcard binding", () => {
        vi.spyOn(networkUtils, "getLocalIp").mockReturnValue("192.168.1.50");
        ensureServerHostEnvVar("::", 8000);
        expect(process.env.AUTOBYTEUS_SERVER_HOST).toBe("http://192.168.1.50:8000");
    });
});
