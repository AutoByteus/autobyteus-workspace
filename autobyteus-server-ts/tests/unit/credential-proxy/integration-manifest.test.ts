/**
 * The manifest contract (DS-006) and the tool check: a folder is read by the contract's rules, an invalid one is
 * skipped with a warning naming it and the reason, a plain skill folder is not an integration, and an icon is kept only
 * as an SVG data URL under 64 KB. Tools are looked up on PATH without spawning a shell.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseIntegrationFolder, parseIntegrationSource } from "../../../src/credential-proxy/integration-manifest.js";
import { checkTools } from "../../../src/credential-proxy/tool-presence.js";

const GITHUB_MANIFEST = {
  name: "GitHub",
  description: "Work with GitHub issues.",
  token: { help: "Create a token at https://github.com/settings/tokens." },
  prerequisites: ["curl", "jq", "git"],
};

describe("integration manifest", () => {
  let root = "";
  let warnings: string[] = [];
  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "integration-manifest-")));
    warnings = [];
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const write = (id: string, manifest: unknown, skill: string | null = `---\nname: ${id}-integration\ndescription: d\n---\nbody\n`) => {
    const folder = path.join(root, id);
    fs.mkdirSync(folder, { recursive: true });
    if (manifest !== undefined) fs.writeFileSync(path.join(folder, "integration.json"), typeof manifest === "string" ? manifest : JSON.stringify(manifest));
    if (skill !== null) fs.writeFileSync(path.join(folder, "SKILL.md"), skill);
    return folder;
  };

  it("reads a valid folder: ID from the folder, the fields, and the SKILL.md name", () => {
    const folder = write("github", GITHUB_MANIFEST);
    expect(parseIntegrationFolder(folder)).toEqual({
      id: "github", name: "GitHub", description: "Work with GitHub issues.",
      tokenHelp: "Create a token at https://github.com/settings/tokens.", prerequisites: ["curl", "jq", "git"],
      skillName: "github-integration", iconDataUrl: null, folderPath: folder,
    });
  });

  it("allows a manifest without token or prerequisites", () => {
    const entry = parseIntegrationFolder(write("ssh", { name: "SSH", description: "Reach hosts." }));
    expect(entry).toMatchObject({ id: "ssh", tokenHelp: null, prerequisites: [] });
  });

  it.each([
    ["an unknown field", { ...GITHUB_MANIFEST, version: 2 }, "unknown field(s) version"],
    ["a missing name", { description: "d" }, "'name' must be a non-empty string"],
    ["an empty description", { name: "N", description: " " }, "'description' must be a non-empty string"],
    ["token without help", { name: "N", description: "d", token: {} }, "'token.help' must be a non-empty string"],
    ["an extra token field", { name: "N", description: "d", token: { help: "h", value: "x" } }, "'token' may only hold 'help'"],
    ["a prerequisite that is a command line", { name: "N", description: "d", prerequisites: ["rm -rf /"] }, "list of tool names"],
    ["unreadable JSON", "{not json", "integration.json is not readable JSON"],
  ])("skips a folder with %s, with a warning naming the folder and the reason", (_label, manifest, reason) => {
    const folder = write("broken", manifest);
    expect(parseIntegrationFolder(folder)).toBeNull();
    expect(warnings.some((line) => line.includes(folder) && line.includes(reason))).toBe(true);
  });

  it("skips an invalid ID and a folder without SKILL.md; a plain skill folder is not an integration", () => {
    expect(parseIntegrationFolder(write("Bad_ID", GITHUB_MANIFEST))).toBeNull();
    expect(parseIntegrationFolder(write("noskill", GITHUB_MANIFEST, null))).toBeNull();
    expect(warnings.some((line) => line.includes("SKILL.md is missing"))).toBe(true);
    warnings = [];
    expect(parseIntegrationFolder(write("plain-skill", undefined))).toBeNull();
    expect(warnings).toEqual([]);
  });

  it("keeps an SVG icon as a data URL, and drops a non-SVG or oversized one with a warning", () => {
    const good = write("good", GITHUB_MANIFEST);
    const svg = '<?xml version="1.0"?>\n<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>\n';
    fs.writeFileSync(path.join(good, "icon.svg"), svg);
    expect(parseIntegrationFolder(good)?.iconDataUrl).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);

    const html = write("html-icon", GITHUB_MANIFEST);
    fs.writeFileSync(path.join(html, "icon.svg"), "<html><script>alert(1)</script></html>");
    expect(parseIntegrationFolder(html)?.iconDataUrl).toBeNull();

    const big = write("big-icon", GITHUB_MANIFEST);
    fs.writeFileSync(path.join(big, "icon.svg"), `<svg>${" ".repeat(70 * 1024)}</svg>`);
    expect(parseIntegrationFolder(big)?.iconDataUrl).toBeNull();
    expect(warnings.filter((line) => line.includes("icon.svg"))).toHaveLength(2);
  });

  it("reads every valid integration in a source and ignores dot folders and plain files", () => {
    write("github", GITHUB_MANIFEST);
    write("broken", { name: "x" });
    write("docs", undefined, null);
    fs.mkdirSync(path.join(root, ".git"));
    fs.writeFileSync(path.join(root, "README.md"), "readme");
    expect(parseIntegrationSource(root).map((entry) => entry.id)).toEqual(["github"]);
    expect(parseIntegrationSource(path.join(root, "missing"))).toEqual([]);
  });
});

describe("tool presence", () => {
  let bin = "";
  beforeEach(() => { bin = fs.mkdtempSync(path.join(os.tmpdir(), "tool-presence-")); });
  afterEach(() => { fs.rmSync(bin, { recursive: true, force: true }); });

  it("finds executable files on PATH only", () => {
    fs.writeFileSync(path.join(bin, "jq"), "#!/bin/sh\n", { mode: 0o755 });
    fs.writeFileSync(path.join(bin, "notexec"), "x", { mode: 0o644 });
    fs.mkdirSync(path.join(bin, "dir"));
    expect(checkTools(["jq", "notexec", "dir", "missing"], { PATH: bin }, "linux")).toEqual([
      { tool: "jq", found: true }, { tool: "notexec", found: false }, { tool: "dir", found: false }, { tool: "missing", found: false },
    ]);
  });

  it("uses PATHEXT on Windows", () => {
    fs.writeFileSync(path.join(bin, "git.EXE"), "x");
    expect(checkTools(["git", "curl"], { PATH: bin, PATHEXT: ".COM;.EXE" }, "win32")).toEqual([
      { tool: "git", found: true }, { tool: "curl", found: false },
    ]);
  });
});
