import { describe, expect, it } from "vitest";
import { ContextFileType } from "autobyteus-ts";
import { UserInputConverter } from "../../../../../src/api/graphql/converters/user-input-converter.js";

describe("UserInputConverter", () => {
  it("maps context files into AgentInputUserMessage", () => {
    const input = {
      content: "Hello",
      contextFiles: [
        { path: "/tmp/note.txt", type: ContextFileType.TEXT },
        { path: "https://example.com/image.png", type: ContextFileType.IMAGE },
      ],
    };

    const message = UserInputConverter.toAgentInputUserMessage(input as any);

    expect(message.content).toBe("Hello");
    expect(message.contextFiles?.length).toBe(2);
    expect(message.contextFiles?.[0].uri).toBe("/tmp/note.txt");
    expect(message.contextFiles?.[0].fileType).toBe(ContextFileType.TEXT);
    expect(message.contextFiles?.[1].fileType).toBe(ContextFileType.IMAGE);
  });
});
