import { describe, expect, it } from "vitest";
import { RunFileChangeInvocationCache } from "../../../../src/services/run-file-changes/run-file-change-invocation-cache.js";

describe("RunFileChangeInvocationCache", () => {
  it("consumes recorded invocation context through invocation aliases only once", () => {
    const cache = new RunFileChangeInvocationCache();

    cache.record("run-1", "tool-1:0", {
      toolName: "generate_image",
      arguments: { output_file_path: "assets/image.png" },
      candidateOutputPath: "assets/image.png",
    });

    expect(cache.consume("run-1", "tool-1")).toEqual({
      toolName: "generate_image",
      arguments: { output_file_path: "assets/image.png" },
      candidateOutputPath: "assets/image.png",
    });
    expect(cache.consume("run-1", "tool-1:0")).toBeNull();
  });

  it("clears one run without affecting other runs", () => {
    const cache = new RunFileChangeInvocationCache();

    cache.record("run-1", "tool-1", {
      toolName: "generate_image",
      arguments: { output_file_path: "assets/one.png" },
      candidateOutputPath: "assets/one.png",
    });
    cache.record("run-2", "tool-2", {
      toolName: "generate_audio",
      arguments: { output_file_path: "assets/two.mp3" },
      candidateOutputPath: "assets/two.mp3",
    });

    cache.clearRun("run-1");

    expect(cache.consume("run-1", "tool-1")).toBeNull();
    expect(cache.consume("run-2", "tool-2")).toEqual({
      toolName: "generate_audio",
      arguments: { output_file_path: "assets/two.mp3" },
      candidateOutputPath: "assets/two.mp3",
    });
  });
});
