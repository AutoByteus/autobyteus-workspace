import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LAUNCH_CREDENTIAL_ID, OwnerCredentialService } from "../../../src/node-access/services/owner-credential-service.js";
import { SetupCodeService } from "../../../src/node-access/services/setup-code-service.js";
import { OwnerCredentialStore } from "../../../src/node-access/stores/owner-credential-store.js";

/** Node access model NA-5, NA-10, NA-11; design M-1 (launch credential), M-2 (setup codes). */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const dataDir = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "owner-credentials-")); roots.push(dir); return dir; };
const LAUNCH = "own_launch_credential_for_tests";

describe("OwnerCredentialService", () => {
  it("NAS-01 accepts the launch credential (memory only, never stored) as the owner `launch`", async () => {
    const dir = await dataDir();
    const service = new OwnerCredentialService(new OwnerCredentialStore({ getAppDataDir: () => dir }), LAUNCH);
    await expect(service.verify(LAUNCH)).resolves.toEqual({ ok: true, identity: { kind: "owner", credentialId: LAUNCH_CREDENTIAL_ID } });
    await expect(service.list()).resolves.toEqual([]);
    await expect(fs.readdir(dir)).resolves.toEqual([]);
  });

  it("NAS-03 issues a credential stored as a hash only; NAS-11/NA-11 a revoked one is refused and its revocation is published", async () => {
    const dir = await dataDir();
    const service = new OwnerCredentialService(new OwnerCredentialStore({ getAppDataDir: () => dir }), null, () => new Date("2026-11-08T10:00:00.000Z"));
    const revoked = vi.fn();
    service.onClientRevoked(revoked);
    const issued = await service.issue("  Ryan's MacBook  ");
    expect(issued.credential).toMatch(/^own_[A-Za-z0-9_-]{43}$/);
    const file = await fs.readFile(path.join(dir, "node-access", "owner-credentials.json"), "utf8");
    expect(file).not.toContain(issued.credential);
    await expect(service.list()).resolves.toEqual([{ credentialId: issued.credentialId, desktopName: "Ryan's MacBook", createdAt: "2026-11-08T10:00:00.000Z", lastSeenAt: null }]);
    await expect(service.verify(issued.credential)).resolves.toEqual({ ok: true, identity: { kind: "owner", credentialId: issued.credentialId } });
    await expect(service.verify("own_made_up")).resolves.toMatchObject({ ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID" } });
    await expect(service.revoke(issued.credentialId)).resolves.toBe(true);
    expect(revoked).toHaveBeenCalledWith(expect.objectContaining({ kind: "owner", id: issued.credentialId, refusal: expect.objectContaining({ code: "NODE_CREDENTIAL_REVOKED" }) }));
    await expect(service.verify(issued.credential)).resolves.toMatchObject({ ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID" } });
    await expect(service.revoke(issued.credentialId)).resolves.toBe(false);
  });

  it("QR-002 reads its file once, and writes last-seen at most once a minute", async () => {
    const dir = await dataDir();
    let now = new Date("2026-11-08T10:00:00.000Z");
    const store = new OwnerCredentialStore({ getAppDataDir: () => dir });
    const read = vi.spyOn(store, "read");
    const write = vi.spyOn(store, "write");
    const service = new OwnerCredentialService(store, null, () => now);
    const issued = await service.issue("Desktop");
    write.mockClear();
    await service.verify(issued.credential);
    await service.verify(issued.credential);
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    now = new Date("2026-11-08T10:00:30.000Z");
    await service.verify(issued.credential);
    now = new Date("2026-11-08T10:01:01.000Z");
    await service.verify(issued.credential);
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("DESIGN.md rule 7: a row that cannot be read is left out with a warning and kept as it is on every write", async () => {
    const dir = await dataDir();
    const file = path.join(dir, "node-access", "owner-credentials.json");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify([{ credentialId: 7 }]));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = new OwnerCredentialService(new OwnerCredentialStore({ getAppDataDir: () => dir }), null);
    await service.issue("Desktop");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("row 0 cannot be read"));
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual([expect.objectContaining({ desktopName: "Desktop" }), { credentialId: 7 }]);
    warn.mockRestore();
  });
});

describe("SetupCodeService", () => {
  it("NAS-13 a setup code works once, within 30 minutes; a guessed, used or expired code is NODE_SETUP_CODE_INVALID", async () => {
    let now = 0;
    const issue = vi.fn(async () => ({ credentialId: "owncred_1", credential: "own_x" }));
    const codes = new SetupCodeService({ issue }, () => now);
    const created = codes.create();
    expect(created.setupCode).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(created.expiresAt).toBe(new Date(30 * 60 * 1000).toISOString());
    await expect(codes.exchange({ setupCode: "guessed", desktopName: "Desktop" })).rejects.toMatchObject({ code: "NODE_SETUP_CODE_INVALID", statusCode: 401 });
    await expect(codes.exchange({ setupCode: created.setupCode, desktopName: "Desktop" })).resolves.toEqual({ credentialId: "owncred_1", credential: "own_x" });
    expect(issue).toHaveBeenCalledWith("Desktop");
    await expect(codes.exchange({ setupCode: created.setupCode, desktopName: "Desktop" })).rejects.toMatchObject({ code: "NODE_SETUP_CODE_INVALID" });
    const late = codes.create();
    now = 30 * 60 * 1000;
    await expect(codes.exchange({ setupCode: late.setupCode, desktopName: "Desktop" })).rejects.toMatchObject({ code: "NODE_SETUP_CODE_INVALID" });
  });
});
