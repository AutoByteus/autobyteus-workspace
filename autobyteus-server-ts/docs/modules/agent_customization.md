# Agent Customization

## Scope

Registers the server's input and LLM response processors. The server registers
no tool invocation preprocessor.

## TS Source

- `src/agent-customization`
- `src/startup/agent-customization-loader.ts`

## Notes

Processor registration is startup-driven and idempotent.


## User Input Context Processor And System Prompts

`UserInputContextBuildingProcessor` owns context-file resolution, context block
construction, sender-specific user input headers, and first-turn state mutation.
Native runtime message construction later uses those resolved context files to
append the current-user `Reference files:` block. The processor composes no
provider-specific prompt text and never prepends the system prompt into the
first user message. System prompt content remains a structured `system`
conversation message at the LLM boundary.
