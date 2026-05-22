import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";

const { resolverResolveMock } = vi.hoisted(() => ({
  resolverResolveMock: vi.fn<(uri: string) => string | null>(),
}));

vi.mock("../../../../../../src/context-files/services/context-file-local-path-resolver.js", () => ({
  ContextFileLocalPathResolver: vi.fn(
    function ContextFileLocalPathResolverMock(this: { resolve: typeof resolverResolveMock }) {
      this.resolve = resolverResolveMock;
    },
  ),
}));

import { toCodexUserInput } from "../../../../../../src/agent-execution/backends/codex/thread/codex-user-input-mapper.js";

describe("toCodexUserInput", () => {
  beforeEach(() => {
    resolverResolveMock.mockReset();
    resolverResolveMock.mockReturnValue(null);
  });

  it("emits both localImage input and Reference files text for an image context file", () => {
    const inputs = toCodexUserInput(
      new AgentInputUserMessage("Analyze this", undefined, [
        new ContextFile("/abs/proof.png", ContextFileType.IMAGE),
      ]),
    );

    expect(inputs).toEqual([
      {
        type: "text",
        text: "Analyze this\n\nReference files:\n- /abs/proof.png",
        text_elements: [],
      },
      {
        type: "localImage",
        path: "/abs/proof.png",
      },
    ]);
  });

  it("standardizes duplicate local non-image files into one Reference files block", () => {
    const inputs = toCodexUserInput(
      new AgentInputUserMessage("Review", undefined, [
        new ContextFile("/abs/notes.pdf", ContextFileType.PDF),
        new ContextFile("file:///abs/notes.pdf", ContextFileType.PDF),
      ]),
    );

    expect(inputs[0]).toEqual({
      type: "text",
      text: "Review\n\nReference files:\n- /abs/notes.pdf",
      text_elements: [],
    });
    expect(String(inputs[0]?.text)).not.toContain("Context file: /abs/notes.pdf");
  });

  it("does not include unresolved URLs and data URLs in Reference files", () => {
    const inputs = toCodexUserInput(
      new AgentInputUserMessage("Review", undefined, [
        new ContextFile("https://example.com/notes.pdf", ContextFileType.PDF),
        new ContextFile("data:image/png;base64,abc", ContextFileType.IMAGE),
      ]),
    );

    expect(String(inputs[0]?.text)).toBe("Review\nContext file: https://example.com/notes.pdf");
    expect(String(inputs[0]?.text)).not.toContain("Reference files:");
    expect(inputs[1]).toEqual({
      type: "image",
      url: "data:image/png;base64,abc",
    });
  });

  it("uses ContextFileLocalPathResolver for finalized REST context-file locators", () => {
    resolverResolveMock.mockImplementation((uri) =>
      uri === "/rest/runs/run-1/context-files/proof.png" ? "/resolved/proof.png" : null,
    );

    const inputs = toCodexUserInput(
      new AgentInputUserMessage("Analyze", undefined, [
        new ContextFile(
          "/rest/runs/run-1/context-files/proof.png",
          ContextFileType.IMAGE,
        ),
      ]),
    );

    expect(inputs).toEqual([
      {
        type: "text",
        text: "Analyze\n\nReference files:\n- /resolved/proof.png",
        text_elements: [],
      },
      {
        type: "localImage",
        path: "/resolved/proof.png",
      },
    ]);
    expect(resolverResolveMock).toHaveBeenCalledWith("/rest/runs/run-1/context-files/proof.png");
  });
});
