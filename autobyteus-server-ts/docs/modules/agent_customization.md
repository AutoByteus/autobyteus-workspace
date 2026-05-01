# Agent Customization

## Scope

Registers and executes lifecycle/input/response/tool processors.

## TS Source

- `src/agent-customization`
- `src/startup/agent-customization-loader.ts`

## Notes

Processor registration is startup-driven and idempotent.


## User Input Context Processor And RPA System Prompts

`UserInputContextBuildingProcessor` owns context-file resolution, context block
construction, sender-specific user input headers, and first-turn state mutation.
It must not compose provider-specific RPA/browser prompt text. In particular, it
does not prepend an AutoByteus/RPA system prompt into the first user message.
System prompt content remains a structured `system` conversation message at the
LLM boundary; RPA cache-miss browser-visible formatting is owned by the RPA LLM
server helper so the browser sees the neutral first-call or multi-turn shapes
documented by the RPA server.
