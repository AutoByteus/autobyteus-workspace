import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import {
  buildClaudeUserMessage,
  CLAUDE_INLINE_IMAGE_MAX_BYTES,
  hasClaudeUserMessageContent,
} from "../../../../../../src/agent-execution/backends/claude/session/claude-user-message-builder.js";

const image = (uri: string) => new ContextFile(uri, ContextFileType.IMAGE);

describe("buildClaudeUserMessage (REQ-011)", () => {
  it("puts system notes first, then text with non-image references, then inline images", async () => {
    const message = await buildClaudeUserMessage({
      uuid: "u-1",
      message: new AgentInputUserMessage("look", undefined, [
        image("data:image/jpeg;base64,/9j/AA=="),
        image("https://example.com/chart.png"),
        new ContextFile("/abs/report.pdf", ContextFileType.PDF),
      ]),
      systemNotes: ["[System note: carried over]"],
    });

    expect(message).toEqual({
      type: "user",
      uuid: "u-1",
      parent_tool_use_id: null,
      message: {
        role: "user",
        content: [
          { type: "text", text: "[System note: carried over]" },
          { type: "text", text: "look\n\nReference files:\n- /abs/report.pdf" },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "/9j/AA==" } },
          { type: "image", source: { type: "url", url: "https://example.com/chart.png" } },
        ],
      },
    });
  });

  it("notes an oversized or non-base64 image instead of attaching it", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "claude-builder-"));
    try {
      const big = path.join(directory, "big.png");
      await fs.writeFile(big, "");
      await fs.truncate(big, CLAUDE_INLINE_IMAGE_MAX_BYTES + 1);
      const message = await buildClaudeUserMessage({
        uuid: "u-2",
        message: new AgentInputUserMessage("", undefined, [image(big), image("data:image/png,rawtext")]),
      });

      expect(message.message.content).toEqual([
        { type: "text", text: `[Attached image could not be attached: ${big} (file is larger than 20 MB).]` },
        { type: "text", text: "[Attached image could not be attached: data URL (not a base64 image data URL).]" },
      ]);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("treats a message with only an image as sendable and a blank one as empty", () => {
    expect(hasClaudeUserMessageContent(new AgentInputUserMessage("", undefined, [image("/abs/a.png")]))).toBe(true);
    expect(hasClaudeUserMessageContent(new AgentInputUserMessage("  "))).toBe(false);
  });
});
