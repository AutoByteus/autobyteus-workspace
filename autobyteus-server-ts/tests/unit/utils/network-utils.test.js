import { describe, expect, it } from "vitest";
import { getLocalIp, isPrivateIp } from "../../../src/utils/network-utils.js";
describe("network-utils", () => {
    it("validates private IPs", () => {
        expect(isPrivateIp("10.0.0.1")).toBe(true);
        expect(isPrivateIp("172.16.0.1")).toBe(true);
        expect(isPrivateIp("172.31.255.255")).toBe(true);
        expect(isPrivateIp("192.168.1.1")).toBe(true);
        expect(isPrivateIp("8.8.8.8")).toBe(false);
        expect(isPrivateIp("203.0.113.1")).toBe(false);
        expect(isPrivateIp("172.32.0.1")).toBe(false);
        expect(isPrivateIp("192.168.1.256")).toBe(false);
        expect(isPrivateIp("not an ip")).toBe(false);
    });
    it("returns a private local IP when available", () => {
        const localIp = getLocalIp();
        if (localIp === null) {
            return;
        }
        expect(localIp).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
        expect(isPrivateIp(localIp)).toBe(true);
        expect(localIp).not.toBe("127.0.0.1");
    });
});
