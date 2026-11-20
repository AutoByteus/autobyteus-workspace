import { describe, expect, it } from "vitest";
import {
  isWatcherRuntimeCommand,
  isWatcherRuntimeMessage,
} from "../../../src/file-explorer/watcher/runtime/watcher-runtime-protocol.js";

describe("watcher runtime protocol guards", () => {
  it("accepts start commands with explicit watcher identity and link policy", () => {
    expect(
      isWatcherRuntimeCommand({
        type: "start",
        watcherId: "watcher-1",
        generation: 1,
        workspaceRootPath: "/tmp/workspace",
        followSymbolicLinks: false,
      }),
    ).toBe(true);
  });

  it("rejects a start command without its link policy (autobyteus-554)", () => {
    expect(
      isWatcherRuntimeCommand({
        type: "start",
        watcherId: "watcher-1",
        generation: 1,
        workspaceRootPath: "/tmp/workspace",
      }),
    ).toBe(false);
  });

  it("rejects commands without watcher generation identity", () => {
    expect(
      isWatcherRuntimeCommand({
        type: "start",
        watcherId: "watcher-1",
        workspaceRootPath: "/tmp/workspace",
      }),
    ).toBe(false);
  });

  it("accepts raw event messages and rejects identity-free messages", () => {
    expect(
      isWatcherRuntimeMessage({
        type: "rawEvent",
        watcherId: "watcher-1",
        generation: 1,
        event: {
          eventType: "add",
          path: "/tmp/workspace/new.txt",
          isDirectory: false,
        },
      }),
    ).toBe(true);

    expect(
      isWatcherRuntimeMessage({
        type: "rawEvent",
        event: {
          eventType: "add",
          path: "/tmp/workspace/new.txt",
          isDirectory: false,
        },
      }),
    ).toBe(false);
  });
});
