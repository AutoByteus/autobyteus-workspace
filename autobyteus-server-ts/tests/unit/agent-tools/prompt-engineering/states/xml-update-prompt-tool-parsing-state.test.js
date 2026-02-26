import { describe, it, expect } from "vitest";
import { ParserContext } from "autobyteus-ts/agent/streaming/parser/parser-context.js";
import { SegmentEventType } from "autobyteus-ts/agent/streaming/parser/events.js";
import { XmlUpdatePromptToolParsingState } from "../../../../../src/agent-tools/prompt-engineering/states/xml-update-prompt-tool-parsing-state.js";
const getEndMetadata = (ctx) => {
    const events = ctx.getAndClearEvents();
    const endEvent = events.find((e) => e.event_type === SegmentEventType.END);
    return endEvent?.payload?.metadata;
};
describe("XmlUpdatePromptToolParsingState", () => {
    it("parses standard sentinel content", () => {
        const signature = '<tool name="update_prompt">';
        const chunks = [
            '<tool name="update_prompt"><arguments><arg name="prompt_id">123</arg><arg name="new_content">',
            "__START_CONTENT__\nNew prompt content here.\nLine 2 of prompt.\n__END_CONTENT__",
            "</arg></arguments></tool>",
        ];
        const ctx = new ParserContext();
        ctx.append(signature);
        const state = new XmlUpdatePromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        for (const chunk of chunks) {
            ctx.append(chunk);
            state.run();
        }
        const metadata = getEndMetadata(ctx);
        expect(metadata?.tool_name).toBe("update_prompt");
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("123");
        expect(args.new_content).toContain("New prompt content here.");
        expect(args.new_content).toContain("Line 2 of prompt.");
        expect(args.new_content).not.toContain("__START_CONTENT__");
        expect(args.new_content).not.toContain("__END_CONTENT__");
    });
    it("parses nested XML-like content", () => {
        const signature = '<tool name="update_prompt">';
        const content = `<tool name="update_prompt">
    <arguments>
        <arg name="prompt_id">70</arg>
        <arg name="new_content">
__START_CONTENT__
You are an AI assistant.

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
        const state = new XmlUpdatePromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        state.run();
        while (ctx.hasMoreChars()) {
            ctx.currentState.run();
        }
        const metadata = getEndMetadata(ctx);
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("70");
        expect(args.new_content).toContain("send_message");
        expect(args.new_content).toContain("{{recipient}}");
        expect(args.new_content).not.toContain("__START_CONTENT__");
        expect(args.new_content).not.toContain("__END_CONTENT__");
    });
});
