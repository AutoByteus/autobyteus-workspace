import { describe, expect, it } from "vitest";
import {
  consumeRecentStructuralChangeEchoes,
  recordRecentStructuralChangeEchoes,
  remapOpenFilePaths,
  remapOpenFolderPaths,
  remapPrefixedPath,
} from "~/utils/fileExplorer/stateSync";
import type { FileSystemChangeEvent } from "~/types/fileSystemChangeTypes";

describe("stateSync", () => {
  it("remaps a moved folder subtree across folder and file path state", () => {
    expect(
      remapOpenFolderPaths(
        {
          "tickets/in-progress": true,
          "tickets/in-progress/ticket-123": true,
          "tickets/in-progress/ticket-123/subdir": true,
          "tickets/done": true,
        },
        "tickets/in-progress/ticket-123",
        "tickets/done/ticket-123",
      ),
    ).toEqual({
      "tickets/in-progress": true,
      "tickets/done/ticket-123": true,
      "tickets/done/ticket-123/subdir": true,
      "tickets/done": true,
    });

    expect(
      remapOpenFilePaths(
        [
          { path: "tickets/in-progress/ticket-123/a.txt", type: "Text" as const },
          { path: "tickets/in-progress/ticket-123/subdir/b.txt", type: "Text" as const },
          { path: "notes/root.txt", type: "Text" as const },
        ],
        "tickets/in-progress/ticket-123",
        "tickets/done/ticket-123",
      ),
    ).toEqual([
      { path: "tickets/done/ticket-123/a.txt", type: "Text" },
      { path: "tickets/done/ticket-123/subdir/b.txt", type: "Text" },
      { path: "notes/root.txt", type: "Text" },
    ]);

    expect(
      remapPrefixedPath(
        "tickets/in-progress/ticket-123/subdir/b.txt",
        "tickets/in-progress/ticket-123",
        "tickets/done/ticket-123",
      ),
    ).toBe("tickets/done/ticket-123/subdir/b.txt");
  });

  it("records and consumes matching structural move echoes while preserving unrelated changes", () => {
    const moveEvent: FileSystemChangeEvent = {
      changes: [
        {
          type: "move",
          old_parent_id: "in-progress-id",
          new_parent_id: "done-id",
          node: {
            id: "ticket-123-id",
            name: "ticket-123",
            path: "tickets/done/ticket-123",
            is_file: false,
            children: [],
            childrenLoaded: true,
          },
        },
      ],
    };

    const unrelatedAddEvent: FileSystemChangeEvent = {
      changes: [
        {
          type: "add",
          parent_id: "done-id",
          node: {
            id: "extra-id",
            name: "extra.txt",
            path: "tickets/done/extra.txt",
            is_file: true,
            children: [],
            childrenLoaded: true,
          },
        },
      ],
    };

    const echoes = recordRecentStructuralChangeEchoes([], moveEvent, 1000);
    const consumed = consumeRecentStructuralChangeEchoes(echoes, moveEvent, 1001);
    expect(consumed.filteredEvent.changes).toEqual([]);
    expect(consumed.remainingEchoes).toEqual([]);

    const preserved = consumeRecentStructuralChangeEchoes(echoes, unrelatedAddEvent, 1001);
    expect(preserved.filteredEvent.changes).toEqual(unrelatedAddEvent.changes);
    expect(preserved.remainingEchoes).toHaveLength(1);
  });
});
