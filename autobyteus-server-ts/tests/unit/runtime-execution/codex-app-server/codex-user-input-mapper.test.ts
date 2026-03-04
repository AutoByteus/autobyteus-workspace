import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { ContextFileType } from "autobyteus-ts";

let baseUrl = "http://localhost:8000";
let mediaRoot = "";

vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getBaseUrl: () => baseUrl,
    },
  },
}));

vi.mock("../../../../src/services/media-storage-service.js", () => ({
  getMediaStorageService: () => ({
    getMediaRoot: () => mediaRoot,
  }),
}));

import { toCodexUserInput } from "../../../../src/runtime-execution/codex-app-server/codex-user-input-mapper.js";

const asImageInput = (uri: string) => {
  const items = toCodexUserInput({
    content: "Describe the image",
    contextFiles: [{ fileType: ContextFileType.IMAGE, uri }],
  } as any);

  return items.filter((item) => item.type !== "text");
};

describe("toCodexUserInput image mapping", () => {
  beforeEach(() => {
    mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-media-"));
    fs.mkdirSync(path.join(mediaRoot, "images"), { recursive: true });
    fs.writeFileSync(path.join(mediaRoot, "images", "uploaded.png"), "png");
    baseUrl = "http://localhost:8000";
  });

  afterEach(() => {
    if (mediaRoot && fs.existsSync(mediaRoot)) {
      fs.rmSync(mediaRoot, { recursive: true, force: true });
    }
  });

  it("maps same-origin /rest/files image URLs to localImage absolute paths", () => {
    const inputs = asImageInput(`${baseUrl}/rest/files/images/uploaded.png`);

    expect(inputs).toEqual([
      {
        type: "localImage",
        path: path.join(mediaRoot, "images", "uploaded.png"),
      },
    ]);
  });

  it("maps rooted /rest/files paths to localImage absolute paths", () => {
    const inputs = asImageInput("/rest/files/images/uploaded.png");

    expect(inputs).toEqual([
      {
        type: "localImage",
        path: path.join(mediaRoot, "images", "uploaded.png"),
      },
    ]);
  });

  it("keeps external image URLs as remote image inputs", () => {
    const inputs = asImageInput("https://example.com/diagram.png");

    expect(inputs).toEqual([
      {
        type: "image",
        url: "https://example.com/diagram.png",
      },
    ]);
  });

  it("maps absolute image paths to localImage inputs", () => {
    const absolutePath = path.join(mediaRoot, "images", "uploaded.png");
    const inputs = asImageInput(absolutePath);

    expect(inputs).toEqual([
      {
        type: "localImage",
        path: absolutePath,
      },
    ]);
  });

  it("maps file:// image URLs to localImage absolute paths", () => {
    const absolutePath = path.join(mediaRoot, "images", "uploaded.png");
    const fileUrl = pathToFileURL(absolutePath).toString();
    const inputs = asImageInput(fileUrl);

    expect(inputs).toEqual([
      {
        type: "localImage",
        path: absolutePath,
      },
    ]);
  });

  it("keeps data image URLs as remote image inputs", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    const inputs = asImageInput(dataUrl);

    expect(inputs).toEqual([
      {
        type: "image",
        url: dataUrl,
      },
    ]);
  });

  it("drops unsafe /rest/files traversal inputs instead of emitting unsafe localImage paths", () => {
    const inputs = asImageInput("/rest/files/../../etc/passwd");
    expect(inputs).toEqual([]);
  });
});
