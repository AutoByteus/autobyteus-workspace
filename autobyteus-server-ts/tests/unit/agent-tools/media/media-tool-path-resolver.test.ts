import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MediaPathResolver } from "../../../../src/agent-tools/media/media-tool-path-resolver.js";

describe("MediaPathResolver", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-path-resolver-"));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("passes through URL and data URI input image references", () => {
    const resolver = new MediaPathResolver();
    expect(resolver.resolveInputImageReference("https://example.com/image.png", { workspaceRootPath: workspaceRoot })).toBe("https://example.com/image.png");
    expect(resolver.resolveInputImageReference("data:image/png;base64,AA==", { workspaceRootPath: workspaceRoot })).toBe("data:image/png;base64,AA==");
  });

  it("resolves workspace-relative input images and rejects unsafe absolute roots", () => {
    const resolver = new MediaPathResolver();
    const imagePath = path.join(workspaceRoot, "images", "ref.png");
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, "image");

    expect(resolver.resolveInputImageReference("images/ref.png", { workspaceRootPath: workspaceRoot })).toBe(imagePath);
    expect(() => resolver.resolveInputImageReference("/etc/passwd", { workspaceRootPath: workspaceRoot })).toThrow(/Security Violation/);
  });

  it("requires a workspace root for local media paths", () => {
    const resolver = new MediaPathResolver();
    expect(() => resolver.resolveOutputFilePath("out.png", {})).toThrow(/workspace root/);
  });
});
