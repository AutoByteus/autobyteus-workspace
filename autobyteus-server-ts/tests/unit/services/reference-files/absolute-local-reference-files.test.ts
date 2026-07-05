import { describe, expect, it } from "vitest";
import {
  normalizeExplicitAbsoluteLocalReferenceFiles,
  validateExplicitAbsoluteLocalReferenceFile,
} from "../../../../src/services/reference-files/absolute-local-reference-files.js";

describe("absolute local reference files", () => {
  it("accepts, normalizes, and deduplicates absolute local paths", () => {
    expect(normalizeExplicitAbsoluteLocalReferenceFiles([
      "/tmp/report.md",
      " /tmp/report.md ",
      "C:\\Users\\normy\\Desktop\\chart.png",
    ])).toEqual({
      ok: true,
      referenceFiles: [
        "/tmp/report.md",
        "C:/Users/normy/Desktop/chart.png",
      ],
    });
  });

  it("accepts omitted and empty reference lists", () => {
    expect(normalizeExplicitAbsoluteLocalReferenceFiles(undefined)).toEqual({
      ok: true,
      referenceFiles: [],
    });
    expect(normalizeExplicitAbsoluteLocalReferenceFiles([])).toEqual({
      ok: true,
      referenceFiles: [],
    });
  });

  it("rejects malformed reference file collections and entries", () => {
    expect(normalizeExplicitAbsoluteLocalReferenceFiles("not-array")).toEqual({
      ok: false,
      error: { reason: "reference_files must be an array of absolute path strings" },
    });
    expect(normalizeExplicitAbsoluteLocalReferenceFiles([42])).toEqual({
      ok: false,
      error: { index: 0, reason: "each reference_files entry must be a string" },
    });
  });

  it.each([
    ["", "empty path"],
    ["relative/report.md", "path must be absolute"],
    ["./report.md", "path must be absolute"],
    ["/tmp/../report.md", "path contains route-template or relative segments"],
    ["/tmp/:id/report.md", "path contains route-template or relative segments"],
    ["/tmp/{id}/report.md", "path contains route-template or relative segments"],
    ["/tmp/report\u0000.md", "path contains a null byte"],
    ["https://example.com/report.md", "path must be a local filesystem path, not a URL or protocol path"],
    ["/tmp/https://example.com/report.md", "path must be a local filesystem path, not a URL or protocol path"],
    ["file:/tmp/report.md", "path must be a local filesystem path, not a URL or protocol path"],
    ["data:text/plain,abc", "path must be a local filesystem path, not a URL or protocol path"],
    ["//server/share/report.md", "path must be a local filesystem path, not a URL or protocol path"],
  ])("rejects invalid path %j", (filePath, reason) => {
    expect(validateExplicitAbsoluteLocalReferenceFile(filePath)).toBe(reason);
  });
});
