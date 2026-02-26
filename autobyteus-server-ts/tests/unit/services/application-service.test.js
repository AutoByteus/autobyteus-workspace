import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { ApplicationService } from "../../../src/services/application-service.js";
function createTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-app-"));
}
function writeManifest(appRoot, appId, manifest) {
    const appDir = path.join(appRoot, "applications", appId);
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "manifest.json"), JSON.stringify(manifest), "utf-8");
}
function writeModule(appRoot, appId, content, fileName = "app.mjs") {
    const appDir = path.join(appRoot, "applications", appId);
    fs.mkdirSync(appDir, { recursive: true });
    const modulePath = path.join(appDir, fileName);
    fs.writeFileSync(modulePath, content, "utf-8");
    return pathToFileURL(modulePath).href;
}
describe("ApplicationService", () => {
    it("loads a valid application manifest", () => {
        const appRoot = createTempRoot();
        writeManifest(appRoot, "test_app", {
            id: "test_app",
            name: "Test App",
        });
        const service = new ApplicationService(appRoot);
        const apps = service.listApplications();
        expect(apps).toHaveLength(1);
        expect(apps[0]?.id).toBe("test_app");
    });
    it("skips when applications directory is missing", () => {
        const appRoot = createTempRoot();
        const service = new ApplicationService(appRoot);
        expect(service.listApplications()).toHaveLength(0);
    });
    it("skips invalid json", () => {
        const appRoot = createTempRoot();
        const appDir = path.join(appRoot, "applications", "bad_json");
        fs.mkdirSync(appDir, { recursive: true });
        fs.writeFileSync(path.join(appDir, "manifest.json"), "{ not valid json }", "utf-8");
        const service = new ApplicationService(appRoot);
        expect(service.listApplications()).toHaveLength(0);
    });
    it("skips manifests missing required keys", () => {
        const appRoot = createTempRoot();
        writeManifest(appRoot, "missing_keys", {
            id: "missing_keys",
        });
        const service = new ApplicationService(appRoot);
        expect(service.listApplications()).toHaveLength(0);
    });
    it("skips manifest id mismatch", () => {
        const appRoot = createTempRoot();
        writeManifest(appRoot, "folder_id", {
            id: "wrong_id",
            name: "Mismatch",
        });
        const service = new ApplicationService(appRoot);
        expect(service.listApplications()).toHaveLength(0);
    });
    it("runs async entrypoint", async () => {
        const appRoot = createTempRoot();
        const moduleUrl = writeModule(appRoot, "async_app", "export async function run(input) { return { status: 'ok', input }; }\n");
        writeManifest(appRoot, "async_app", {
            id: "async_app",
            name: "Async App",
            entrypointModule: moduleUrl,
            entrypointFunction: "run",
        });
        const service = new ApplicationService(appRoot);
        const result = await service.runApplication("async_app", { key: "value" });
        expect(result).toEqual({ status: "ok", input: { key: "value" } });
    });
    it("runs sync entrypoint", async () => {
        const appRoot = createTempRoot();
        const moduleUrl = writeModule(appRoot, "sync_app", "export function run(input) { return { status: 'sync_ok', input }; }\n");
        writeManifest(appRoot, "sync_app", {
            id: "sync_app",
            name: "Sync App",
            entrypointModule: moduleUrl,
            entrypointFunction: "run",
        });
        const service = new ApplicationService(appRoot);
        const result = await service.runApplication("sync_app", { key: "value" });
        expect(result).toEqual({ status: "sync_ok", input: { key: "value" } });
    });
    it("throws when app not found", async () => {
        const appRoot = createTempRoot();
        const service = new ApplicationService(appRoot);
        await expect(service.runApplication("missing", {})).rejects.toThrow("Application with ID 'missing' not found.");
    });
    it("throws when app is team-based", async () => {
        const appRoot = createTempRoot();
        writeManifest(appRoot, "team_app", {
            id: "team_app",
            name: "Team App",
            type: "AGENT_TEAM",
        });
        const service = new ApplicationService(appRoot);
        await expect(service.runApplication("team_app", {})).rejects.toThrow("team-based application");
    });
    it("throws when entrypoint module is missing", async () => {
        const appRoot = createTempRoot();
        writeManifest(appRoot, "missing_module", {
            id: "missing_module",
            name: "Missing Module",
            entrypointModule: pathToFileURL(path.join(appRoot, "missing.mjs")).href,
            entrypointFunction: "run",
        });
        const service = new ApplicationService(appRoot);
        await expect(service.runApplication("missing_module", {})).rejects.toThrow("Could not load the entry point");
    });
    it("throws when entrypoint function is missing", async () => {
        const appRoot = createTempRoot();
        const moduleUrl = writeModule(appRoot, "missing_fn", "export const nope = () => {};\n");
        writeManifest(appRoot, "missing_fn", {
            id: "missing_fn",
            name: "Missing Fn",
            entrypointModule: moduleUrl,
            entrypointFunction: "run",
        });
        const service = new ApplicationService(appRoot);
        await expect(service.runApplication("missing_fn", {})).rejects.toThrow("Could not load the entry point");
    });
    it("propagates errors from entrypoint execution", async () => {
        const appRoot = createTempRoot();
        const moduleUrl = writeModule(appRoot, "fail_app", "export function run() { throw new Error('App failed!'); }\n");
        writeManifest(appRoot, "fail_app", {
            id: "fail_app",
            name: "Fail App",
            entrypointModule: moduleUrl,
            entrypointFunction: "run",
        });
        const service = new ApplicationService(appRoot);
        await expect(service.runApplication("fail_app", {})).rejects.toThrow("App failed!");
    });
});
