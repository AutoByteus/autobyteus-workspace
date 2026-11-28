import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFINITION_AVATAR_MAX_BYTES,
  readDefinitionAvatar,
  readPackageAvatar,
} from "../../../src/agent-package-definitions/domain/definition-avatar-file.js";

/** Synthetic picture bytes (a 1×1 PNG; JPEG and WebP headers): no picture of anything, let alone a person. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([24, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(16, 2)]);
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

// autobyteus-669 S-1 (REQ-001, REQ-002, AC-002; ARCH-REV-002 N-1…N-3).
describe("readDefinitionAvatar", () => {
  let folder = "";
  beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), "definition-avatar-")); });
  afterEach(() => { fs.rmSync(folder, { recursive: true, force: true }); vi.restoreAllMocks(); });
  const write = (name: string, bytes: Buffer | string) => fs.writeFileSync(path.join(folder, name), bytes);

  it("has none without a picture file, and none for a missing folder", async () => {
    write("agent.md", "---\nname: x\n---\n");
    expect(await readDefinitionAvatar(folder)).toEqual({ status: "none" });
    expect(await readDefinitionAvatar(path.join(folder, "missing"))).toEqual({ status: "none" });
  });

  it.each([
    ["avatar.png", PNG, "image/png"],
    ["avatar.jpg", JPEG, "image/jpeg"],
    ["avatar.jpeg", JPEG, "image/jpeg"],
    ["avatar.webp", WEBP, "image/webp"],
  ] as const)("reads %s: its type and a version from its SHA-256", async (name, bytes, mimeType) => {
    write(name, bytes);
    expect(await readDefinitionAvatar(folder)).toEqual({
      status: "valid",
      avatar: { folder, fileName: name, mimeType, hash: sha(bytes), version: sha(bytes).slice(0, 12) },
    });
  });

  it.each([
    ["a 2 MiB avatar.png", () => write("avatar.png", Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)])), /larger than 1 MiB/],
    ["a text file named avatar.webp", () => write("avatar.webp", "not a picture"), /avatar\.webp is not a WEBP picture/],
    ["a PNG named avatar.jpg", () => write("avatar.jpg", PNG), /avatar\.jpg is not a JPEG picture/],
    ["two candidates", () => { write("avatar.png", PNG); write("avatar.webp", WEBP); }, /more than one picture \(avatar\.png, avatar\.webp\)/],
    ["a folder named avatar.png", () => fs.mkdirSync(path.join(folder, "avatar.png")), /not a regular file/],
    ["a symbolic link (N-1)", () => {
      // The link's target is a valid picture in a folder of its own (inside the test's folder, removed with it).
      const elsewhere = path.join(folder, "elsewhere", "picture.png");
      fs.mkdirSync(path.dirname(elsewhere));
      fs.writeFileSync(elsewhere, PNG);
      fs.symlinkSync(elsewhere, path.join(folder, "avatar.png"));
    }, /symbolic link/],
  ])("ignores %s, with its reason", async (_name, arrange, reason) => {
    arrange();
    const read = await readDefinitionAvatar(folder);
    expect(read.status).toBe("invalid");
    expect(read.status === "invalid" && read.reason).toMatch(reason);
  });

  it("accepts exactly 1 MiB", async () => {
    write("avatar.png", Buffer.concat([PNG, Buffer.alloc(DEFINITION_AVATAR_MAX_BYTES - PNG.length)]));
    expect((await readDefinitionAvatar(folder)).status).toBe("valid");
  });

  it("gives a replaced picture a new version", async () => {
    write("avatar.png", PNG);
    const first = await readDefinitionAvatar(folder);
    const other = Buffer.concat([PNG, Buffer.from("other")]);
    write("avatar.png", other);
    const second = await readDefinitionAvatar(folder);
    expect(first.status === "valid" && second.status === "valid" && first.avatar.version !== second.avatar.version).toBe(true);
    expect(second.status === "valid" && second.avatar.hash).toBe(sha(other));
  });

  it("does not read an unchanged picture again: the hash is kept while its size and time are unchanged (N-3)", async () => {
    write("avatar.png", PNG);
    const filePath = path.join(folder, "avatar.png");
    const time = 1_700_000_000; // whole seconds: the same time again, exactly
    fs.utimesSync(filePath, time, time);
    const first = await readDefinitionAvatar(folder);
    // The same size and time, other bytes: the kept hash shows the file was not read again.
    const same = Buffer.from(PNG); same[PNG.length - 1] ^= 0xff;
    fs.writeFileSync(filePath, same);
    fs.utimesSync(filePath, time, time);
    const second = await readDefinitionAvatar(folder);
    expect(second).toEqual(first);
  });
});

describe("readPackageAvatar", () => {
  let folder = "";
  beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), "package-avatar-")); });
  afterEach(() => { fs.rmSync(folder, { recursive: true, force: true }); vi.restoreAllMocks(); });

  it("gives the valid picture, and null with no picture", async () => {
    expect(await readPackageAvatar(folder)).toBeNull();
    fs.writeFileSync(path.join(folder, "avatar.png"), PNG);
    expect(await readPackageAvatar(folder)).toMatchObject({ fileName: "avatar.png", mimeType: "image/png" });
  });

  it("logs an ignored picture once per reason, again only when the reason changes (N-2)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(folder, "avatar.webp"), "text");
    expect(await readPackageAvatar(folder)).toBeNull();
    expect(await readPackageAvatar(folder)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("DEFINITION_AVATAR_IGNORED");
    expect(String(warn.mock.calls[0]![0])).toContain(folder);
    fs.writeFileSync(path.join(folder, "avatar.png"), PNG);
    await readPackageAvatar(folder);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[1]![0])).toContain("more than one picture");
    // Fixed, then broken the same way again: logged again.
    fs.rmSync(path.join(folder, "avatar.webp"));
    expect(await readPackageAvatar(folder)).not.toBeNull();
    fs.writeFileSync(path.join(folder, "avatar.webp"), "text");
    await readPackageAvatar(folder);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});
