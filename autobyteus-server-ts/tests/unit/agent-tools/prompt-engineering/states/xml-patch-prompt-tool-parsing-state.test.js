import { describe, it, expect } from "vitest";
import { ParserContext } from "autobyteus-ts/agent/streaming/parser/parser-context.js";
import { SegmentEventType } from "autobyteus-ts/agent/streaming/parser/events.js";
import { XmlPatchPromptToolParsingState } from "../../../../../src/agent-tools/prompt-engineering/states/xml-patch-prompt-tool-parsing-state.js";
const getEndMetadata = (ctx) => {
    const events = ctx.getAndClearEvents();
    const endEvent = events.find((e) => e.event_type === SegmentEventType.END);
    return endEvent?.payload?.metadata;
};
describe("XmlPatchPromptToolParsingState", () => {
    it("parses a standard patch with sentinels", () => {
        const signature = '<tool name="patch_prompt">';
        const chunks = [
            '<tool name="patch_prompt"><arguments><arg name="prompt_id">123</arg><arg name="patch">',
            "__START_PATCH__\n@@ -1 +1 @@\n-foo\n+bar\n__END_PATCH__",
            "</arg></arguments></tool>",
        ];
        const ctx = new ParserContext();
        ctx.append(signature);
        const state = new XmlPatchPromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        for (const chunk of chunks) {
            ctx.append(chunk);
            state.run();
        }
        const metadata = getEndMetadata(ctx);
        expect(metadata?.tool_name).toBe("patch_prompt");
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("123");
        expect(args.patch).toContain("@@ -1 +1 @@");
        expect(args.patch).toContain("-foo");
        expect(args.patch).toContain("+bar");
        expect(args.patch).not.toContain("__START_PATCH__");
        expect(args.patch).not.toContain("__END_PATCH__");
    });
    it("parses content when sentinels are missing", () => {
        const signature = '<tool name="patch_prompt">';
        const content = '<tool name="patch_prompt"><arguments><arg name="prompt_id">456</arg><arg name="patch">simple content</arg></arguments></tool>';
        const ctx = new ParserContext();
        ctx.append(signature + content);
        const state = new XmlPatchPromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        state.run();
        while (ctx.hasMoreChars()) {
            ctx.currentState.run();
        }
        const metadata = getEndMetadata(ctx);
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("456");
        expect(args.patch).toContain("simple content");
    });
    it("handles sentinel markers split across chunks", () => {
        const signature = '<tool name="patch_prompt">';
        const chunks = [
            '<tool name="patch_prompt"><arguments><arg name="prompt_id">789</arg><arg name="patch">',
            "__START_",
            "PATCH__\ncontent\n__END_",
            "PATCH__</arg></arguments></tool>",
        ];
        const ctx = new ParserContext();
        ctx.append(signature);
        const state = new XmlPatchPromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        for (const chunk of chunks) {
            ctx.append(chunk);
            state.run();
        }
        const metadata = getEndMetadata(ctx);
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("789");
        expect(args.patch).toContain("content");
        expect(args.patch).not.toContain("__START_PATCH__");
        expect(args.patch).not.toContain("__END_PATCH__");
    });
    it("extracts patch content with nested XML-like tags", () => {
        const signature = '<tool name="patch_prompt">';
        const productionContent = `<tool name="patch_prompt">
    <arguments>
        <arg name="prompt_id">70</arg>
        <arg name="patch">
__START_PATCH__
@@ -10,5 +10,5 @@
 10: * **Persona:** You are eager to learn but sometimes struggle with complex concepts. You ask "Why?" often and use modern slang occasionally.
 11: * **Interaction:**
- 12:      1.  If you receive a message from the \`Professor_Agent\`, reply with a relevant question, an expression of amazement ("Whoa, really?"), or an attempt to summarize what they said.
+ 12:      1.  If you receive a message from the \`Professor Agent\`, reply with a relevant question, an expression of amazement ("Whoa, really?"), or an attempt to summarize what they said.
 13:      2.  If you are asked to **START** the conversation, ask the Professor a random question about the world.
@@ -21,5 +21,5 @@
 21: <tool name="send_message_to">
 22:    <arguments>
- 23:      <arg name="recipient_name">Professor_Agent</arg>
+ 23:      <arg name="recipient_name">Professor Agent</arg>
 24:      <arg name="content">Your message text here...</arg>
__END_PATCH__
        </arg>
    </arguments>
</tool>`;
        const ctx = new ParserContext();
        ctx.append(signature + productionContent);
        const state = new XmlPatchPromptToolParsingState(ctx, signature);
        ctx.currentState = state;
        state.run();
        while (ctx.hasMoreChars()) {
            ctx.currentState.run();
        }
        const metadata = getEndMetadata(ctx);
        const args = metadata?.arguments ?? {};
        expect(args.prompt_id).toBe("70");
        expect(args.patch).toContain("Professor Agent");
        expect(args.patch).not.toContain("__START_PATCH__");
        expect(args.patch).not.toContain("__END_PATCH__");
    });
});
