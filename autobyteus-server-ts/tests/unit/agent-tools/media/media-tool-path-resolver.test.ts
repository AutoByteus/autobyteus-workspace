import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MediaPathResolver } from "../../../../src/agent-tools/media/media-tool-path-resolver.js";

describe("MediaPathResolver", () => {
  let workspaceRoot: string;
  let externalMediaRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-path-resolver-"));
    externalMediaRoot = fs.mkdtempSync(path.join(process.cwd(), ".media-path-resolver-external-"));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    fs.rmSync(externalMediaRoot, { recursive: true, force: true });
  });

  it("accepts absolute output paths outside the workspace allowlist roots", () => {
    const resolver = new MediaPathResolver();
    const externalOutputPath = path.join(externalMediaRoot, "generated.png");

    expect(resolver.resolveOutputFilePath(externalOutputPath, {
      workspaceRootPath: workspaceRoot,
    })).toBe(externalOutputPath);
  });

  it("resolves relative output paths inside the workspace", () => {
    const resolver = new MediaPathResolver();

    expect(resolver.resolveOutputFilePath("outputs/generated.png", {
      workspaceRootPath: workspaceRoot,
    })).toBe(path.join(workspaceRoot, "outputs", "generated.png"));
    expect(resolver.resolveOutputFilePath("..media/generated.png", {
      workspaceRootPath: workspaceRoot,
    })).toBe(path.join(workspaceRoot, "..media", "generated.png"));
  });

  it("rejects relative output paths that escape the workspace", () => {
    const resolver = new MediaPathResolver();

    expect(() => resolver.resolveOutputFilePath("../generated.png", {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/escapes the workspace/);
  });

  it("requires output paths to be non-empty", () => {
    const resolver = new MediaPathResolver();

    expect(() => resolver.resolveOutputFilePath("   ", {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/non-empty/);
  });

  it("passes through URL and data URI input image references", () => {
    const resolver = new MediaPathResolver();
    expect(resolver.resolveInputImageReference("https://example.com/image.png", { workspaceRootPath: workspaceRoot })).toBe("https://example.com/image.png");
    expect(resolver.resolveInputImageReference("data:image/png;base64,AA==", { workspaceRootPath: workspaceRoot })).toBe("data:image/png;base64,AA==");
  });

  it("resolves workspace-relative, external absolute, and file URL input images", () => {
    const resolver = new MediaPathResolver();
    const workspaceImagePath = path.join(workspaceRoot, "images", "ref.png");
    const externalImagePath = path.join(externalMediaRoot, "external-ref.png");
    fs.mkdirSync(path.dirname(workspaceImagePath), { recursive: true });
    fs.writeFileSync(workspaceImagePath, "workspace image");
    fs.writeFileSync(externalImagePath, "external image");

    expect(resolver.resolveInputImageReference("images/ref.png", {
      workspaceRootPath: workspaceRoot,
    })).toBe(workspaceImagePath);
    expect(resolver.resolveInputImageReference(externalImagePath, {
      workspaceRootPath: workspaceRoot,
    })).toBe(externalImagePath);
    expect(resolver.resolveInputImageReference(pathToFileURL(externalImagePath).href, {
      workspaceRootPath: workspaceRoot,
    })).toBe(externalImagePath);
  });

  it("rejects relative traversal, missing, and non-file input image references", () => {
    const resolver = new MediaPathResolver();
    const nonFilePath = path.join(externalMediaRoot, "not-a-file");
    fs.mkdirSync(nonFilePath);

    expect(() => resolver.resolveInputImageReference("../ref.png", {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/escapes the workspace/);
    expect(() => resolver.resolveInputImageReference(path.join(externalMediaRoot, "missing.png"), {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/does not resolve to an existing file/);
    expect(() => resolver.resolveInputImageReference(nonFilePath, {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/does not resolve to an existing file/);
  });

  it("requires a workspace root for local media paths", () => {
    const resolver = new MediaPathResolver();
    expect(() => resolver.resolveOutputFilePath("out.png", {})).toThrow(/workspace root/);
    expect(() => resolver.resolveInputImageReference("images/ref.png", {})).toThrow(/workspace root/);
  });
});
