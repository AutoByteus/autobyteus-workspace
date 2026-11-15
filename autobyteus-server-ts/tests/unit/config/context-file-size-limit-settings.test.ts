import { afterEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: { config: { get: (key: string) => settings.values.get(key) } },
}));

import {
  CONTEXT_FILE_AUDIO_VIDEO_MAX_MB_SETTING_KEY as AUDIO_VIDEO,
  CONTEXT_FILE_OTHER_MAX_MB_SETTING_KEY as OTHER,
  normalizeContextFileAudioVideoMaxMbForPersistence,
  normalizeContextFileOtherMaxMbForPersistence,
  resolveContextFileSizeLimits,
} from "../../../src/config/context-file-size-limit-settings.js";
import {
  audioVideoContextFileMimeTypes, contextFileMaxBytesFor, contextFileUploadCapBytes,
} from "../../../src/context-files/domain/context-file-upload-policy.js";

const MiB = 1024 * 1024;

describe("context-file size limit settings (AC-004)", () => {
  afterEach(() => settings.values.clear());

  it("defaults to 25 MiB for other files and 2048 MiB for audio and video", () => {
    expect(resolveContextFileSizeLimits()).toEqual({ otherFileMaxBytes: 25 * MiB, audioVideoMaxBytes: 2048 * MiB });
  });

  it("reads a changed value at the next call (no restart)", () => {
    settings.values.set(AUDIO_VIDEO, "500");
    expect(resolveContextFileSizeLimits().audioVideoMaxBytes).toBe(500 * MiB);
    settings.values.set(AUDIO_VIDEO, "600");
    expect(resolveContextFileSizeLimits().audioVideoMaxBytes).toBe(600 * MiB);
  });

  it.each(["abc", "0", "-5", "1.5", "", "10241", "1e3", "5 GB"])("ignores the invalid audio/video value %j and uses the default", (raw) => {
    settings.values.set(AUDIO_VIDEO, raw);
    expect(resolveContextFileSizeLimits().audioVideoMaxBytes).toBe(2048 * MiB);
  });

  it.each(["abc", "0", "1025", "2.5"])("ignores the invalid other-file value %j and uses the default", (raw) => {
    settings.values.set(OTHER, raw);
    expect(resolveContextFileSizeLimits().otherFileMaxBytes).toBe(25 * MiB);
  });

  it("accepts the range ends and trims whitespace", () => {
    settings.values.set(OTHER, " 1024 "); settings.values.set(AUDIO_VIDEO, "1");
    expect(resolveContextFileSizeLimits()).toEqual({ otherFileMaxBytes: 1024 * MiB, audioVideoMaxBytes: MiB });
  });

  it("refuses invalid values on save and normalizes valid ones", () => {
    expect(normalizeContextFileAudioVideoMaxMbForPersistence(" 4096 ")).toEqual([true, "4096"]);
    expect(normalizeContextFileAudioVideoMaxMbForPersistence("10241")[0]).toBe(false);
    expect(normalizeContextFileAudioVideoMaxMbForPersistence("two")[0]).toBe(false);
    expect(normalizeContextFileOtherMaxMbForPersistence("50")).toEqual([true, "50"]);
    expect(normalizeContextFileOtherMaxMbForPersistence("1025")[0]).toBe(false);
    expect(normalizeContextFileOtherMaxMbForPersistence("0")[0]).toBe(false);
  });
});

describe("context-file size policy", () => {
  const limits = { audioVideoMaxBytes: 2000, otherFileMaxBytes: 100 };

  it("applies the audio/video limit to exactly the accepted audio and video types", () => {
    expect(audioVideoContextFileMimeTypes).toEqual(expect.arrayContaining(["video/mp4", "video/quicktime", "audio/mpeg", "audio/wav"]));
    expect(audioVideoContextFileMimeTypes.every((t) => t.startsWith("audio/") || t.startsWith("video/"))).toBe(true);
    for (const type of audioVideoContextFileMimeTypes) expect(contextFileMaxBytesFor(type, limits)).toBe(2000);
    for (const type of ["image/png", "application/pdf", "text/plain", "application/octet-stream", ""]) {
      expect(contextFileMaxBytesFor(type, limits)).toBe(100);
    }
  });

  it("caps the multipart read at the larger limit", () => {
    expect(contextFileUploadCapBytes(limits)).toBe(2000);
    expect(contextFileUploadCapBytes({ audioVideoMaxBytes: 50, otherFileMaxBytes: 100 })).toBe(100);
  });
});
