import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { buildAgyUserMessageText } from "../../../../../src/agent-execution/backends/antigravity/input/agy-user-message-text.js";

const message = (content: string, contextFiles: ContextFile[] | null) =>
  new AgentInputUserMessage(content, SenderType.USER, contextFiles);
const image = (uri: string) => new ContextFile(uri, ContextFileType.IMAGE);
const IMAGE_PATH = "/Users/u/.autobyteus/server-data/attachments/ctx_13d2e97292bc__10.png";

describe("buildAgyUserMessageText", () => {
  it("lists a local image path under the explicit view_file heading after the typed text (AC-001)", () => {
    const text = buildAgyUserMessageText(message("her", [image(IMAGE_PATH)]));

    expect(typeof text).toBe("string");
    expect(text).toBe(`her\n\nAttached images (open each with view_file to see it):\n- ${IMAGE_PATH}`);
    expect(text).not.toContain("Reference files:");
  });

  it("resolves file:// image URIs and lists each image path once, in order", () => {
    const second = "/tmp/attachments/second.jpg";
    const text = buildAgyUserMessageText(message("compare", [
      image(`file://${IMAGE_PATH}`), image(second), image(IMAGE_PATH),
    ]));

    expect(text).toBe(
      `compare\n\nAttached images (open each with view_file to see it):\n- ${IMAGE_PATH}\n- ${second}`,
    );
  });

  it("puts non-image files in the shared Reference files section, not the image section (AC-002)", () => {
    const text = buildAgyUserMessageText(message("read these", [
      new ContextFile("/tmp/attachments/notes.txt", ContextFileType.TEXT),
      new ContextFile("/tmp/attachments/report.pdf", ContextFileType.PDF),
    ]));

    expect(text).toBe("read these\n\nReference files:\n- /tmp/attachments/notes.txt\n- /tmp/attachments/report.pdf");
    expect(text).not.toContain("Attached images");
  });

  it("orders typed text, images, then reference files when both kinds are attached", () => {
    const text = buildAgyUserMessageText(message("look", [
      new ContextFile("/tmp/attachments/notes.txt", ContextFileType.TEXT), image(IMAGE_PATH),
    ]));

    expect(text).toBe([
      "look",
      `Attached images (open each with view_file to see it):\n- ${IMAGE_PATH}`,
      "Reference files:\n- /tmp/attachments/notes.txt",
    ].join("\n\n"));
  });

  it("produces non-empty text when the content is empty (design rule 4; empty content is rejected upstream)", () => {
    expect(buildAgyUserMessageText(message("", [image(IMAGE_PATH)])))
      .toBe(`Attached images (open each with view_file to see it):\n- ${IMAGE_PATH}`);
    expect(buildAgyUserMessageText(message("  \n", [new ContextFile("/tmp/a.txt", ContextFileType.TEXT)])))
      .toBe("Reference files:\n- /tmp/a.txt");
  });

  it("names a remote image URL and notes a data URL image without embedding its bytes (AC-004)", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
    const text = buildAgyUserMessageText(message("what is this", [
      image(IMAGE_PATH), image("https://example.com/cat.png"), image(dataUrl),
    ]));

    expect(text).toBe([
      "what is this",
      [
        "Attached images (open each with view_file to see it):",
        `- ${IMAGE_PATH}`,
        "Attached image URL: https://example.com/cat.png",
        "[An attached image could not be attached: inline data URL images are not supported by Antigravity.]",
      ].join("\n"),
    ].join("\n\n"));
    expect(text).not.toContain("base64");
    expect(text).not.toContain("iVBORw0KGgo");
  });

  it("names a non-image file without a local path as a Context file line", () => {
    const text = buildAgyUserMessageText(message("see", [
      new ContextFile("https://example.com/spec.pdf", ContextFileType.PDF),
    ]));

    expect(text).toBe("see\n\nContext file: https://example.com/spec.pdf");
  });

  it("returns the content unchanged when there are no context files (AC-007)", () => {
    const delegated = "Do the task.\n\nReference files:\n- /tmp/brief.png\n";
    expect(buildAgyUserMessageText(message(delegated, null))).toBe(delegated);
    expect(buildAgyUserMessageText(message(delegated, []))).toBe(delegated);
    expect(buildAgyUserMessageText({ content: "plain" } as AgentInputUserMessage)).toBe("plain");
  });
});
