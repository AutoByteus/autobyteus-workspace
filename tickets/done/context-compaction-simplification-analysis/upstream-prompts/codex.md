# Codex — compaction prompt

- Source snapshot: `25270df2615eb4da5b9d4a9a392226933fb096c5`
- License: [codex license](licenses/codex-LICENSE); see also [notice](licenses/codex-NOTICE).
- Source: [codex-rs/prompts/templates/compact/prompt.md](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/prompts/templates/compact/prompt.md), [codex-rs/prompts/templates/compact/summary_prefix.md](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/prompts/templates/compact/summary_prefix.md).

Verbatim default local text-compaction template and separate reinjection prefix. This does not expose or describe the private prompt behind remote/opaque compaction, and is not a dump of the entire session request. Custom prompts may differ.

## Default local compaction instruction

````text
You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task.

Include:
- Current progress and key decisions made
- Important context, constraints, or user preferences
- What remains to be done (clear next steps)
- Any critical data, examples, or references needed to continue

Be concise, structured, and focused on helping the next LLM seamlessly continue the work.
````

## Result reinjection prefix — not the summarization instruction

````text
Another language model started to solve this problem and produced a summary of its thinking process. You also have access to the state of the tools that were used by that language model. Use this to build on the work that has already been done and avoid duplicating work. Here is the summary produced by the other language model, use the information in this summary to assist with your own analysis:
````
