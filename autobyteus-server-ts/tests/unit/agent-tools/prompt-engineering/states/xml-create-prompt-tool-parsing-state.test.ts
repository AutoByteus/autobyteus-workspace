import { describe, it, expect } from "vitest";
import { ParserContext } from "autobyteus-ts/agent/streaming/parser/parser-context.js";
import { SegmentEventType } from "autobyteus-ts/agent/streaming/parser/events.js";
import { XmlCreatePromptToolParsingState } from "../../../../../src/agent-tools/prompt-engineering/states/xml-create-prompt-tool-parsing-state.js";

const getEndMetadata = (ctx: ParserContext): Record<string, any> | undefined => {
  const events = ctx.getAndClearEvents();
  const endEvent = events.find((e) => e.event_type === SegmentEventType.END);
  return endEvent?.payload?.metadata;
};

describe("XmlCreatePromptToolParsingState", () => {
  it("parses all arguments with sentinel content", () => {
    const signature = '<tool name="create_prompt">';
    const content = `<tool name="create_prompt">
    <arguments>
        <arg name="name">TestPrompt</arg>
        <arg name="category">Testing</arg>
        <arg name="description">A test prompt</arg>
        <arg name="prompt_content">
__START_CONTENT__
You are an AI assistant.
Be helpful and concise.
__END_CONTENT__
        </arg>
    </arguments>
</tool>`;

    const ctx = new ParserContext();
    ctx.append(signature + content);
    const state = new XmlCreatePromptToolParsingState(ctx, signature);
    ctx.currentState = state;

    state.run();
    while (ctx.hasMoreChars()) {
      ctx.currentState.run();
    }

    const metadata = getEndMetadata(ctx);
    expect(metadata?.tool_name).toBe("create_prompt");
    const args = metadata?.arguments ?? {};
    expect(args.name).toBe("TestPrompt");
    expect(args.category).toBe("Testing");
    expect(args.description).toBe("A test prompt");
    expect(args.prompt_content).toContain("You are an AI assistant.");
    expect(args.prompt_content).toContain("Be helpful and concise.");
    expect(args.prompt_content).not.toContain("__START_CONTENT__");
    expect(args.prompt_content).not.toContain("__END_CONTENT__");
  });

  it("parses nested XML-like content", () => {
    const signature = '<tool name="create_prompt">';
    const content = `<tool name="create_prompt">
    <arguments>
        <arg name="name">AgentPrompt</arg>
        <arg name="category">Agents</arg>
        <arg name="prompt_content">
__START_CONTENT__
You are an AI agent.

Use the following tool to send messages:
<tool name="send_message">
    <arguments>
        <arg name="to">{{recipient}}</arg>
    </arguments>
</tool>
__END_CONTENT__
        </arg>
    </arguments>
</tool>`;

    const ctx = new ParserContext();
    ctx.append(signature + content);
    const state = new XmlCreatePromptToolParsingState(ctx, signature);
    ctx.currentState = state;

    state.run();
    while (ctx.hasMoreChars()) {
      ctx.currentState.run();
    }

    const metadata = getEndMetadata(ctx);
    const args = metadata?.arguments ?? {};
    expect(args.name).toBe("AgentPrompt");
    expect(args.category).toBe("Agents");
    expect(args.prompt_content).toContain("send_message");
    expect(args.prompt_content).toContain("{{recipient}}");
    expect(args.prompt_content).not.toContain("__START_CONTENT__");
    expect(args.prompt_content).not.toContain("__END_CONTENT__");
  });

  it("includes tool_name in start metadata", () => {
    const signature = '<tool name="create_prompt">';
    const content = `<tool name="create_prompt">
    <arguments>
        <arg name="name">TestPrompt</arg>
        <arg name="category">Testing</arg>
        <arg name="prompt_content">
__START_CONTENT__
Test content
__END_CONTENT__
        </arg>
    </arguments>
</tool>`;

    const ctx = new ParserContext();
    ctx.append(signature + content);
    const state = new XmlCreatePromptToolParsingState(ctx, signature);
    ctx.currentState = state;

    state.run();

    const startEvent = ctx
      .getEvents()
      .find((event) => event.event_type === SegmentEventType.START);
    expect(startEvent?.payload?.metadata?.tool_name).toBe("create_prompt");
  });
});
