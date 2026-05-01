# Implementation Design Impact Note: Compactor Prompt Ownership

## Status

Raised by implementation engineer on 2026-04-30 after user feedback during implementation review.

## User Feedback

The user asked why most compactor behavior is encoded in the per-task user message instead of the compactor agent's system prompt/`agent.md`. The user specifically wants the compactor to be independently testable by sending arbitrary conversation/history content as a normal user message and seeing how the compactor behaves.

Representative user concern:

- The current default compactor system prompt is too brief to understand how the compactor works.
- Stable compaction behavior feels like system behavior and should live in the compactor agent instructions.
- The user message should ideally contain only, or mostly only, the content to compact.
- This would make the default compactor agent easier to inspect, manually test, and tune as a normal visible agent.

## Current Implementation Shape

Current implementation splits as follows:

- Default `agent.md` contains high-level compactor identity and concise rules.
- `CompactionTaskPromptBuilder` sends detailed behavior plus exact JSON output contract in each user message, followed by `[SETTLED_BLOCKS]` rendered history.
- The exact JSON schema is repeated per task because the memory subsystem parser treats it as an API contract.

## Potential Design Impact

A full move to “user message only contains content to compact” changes the approved prompt-contract ownership boundary:

- Current design says memory owns the fixed output contract and block payload, while the selected agent owns behavior instructions/default launch preferences.
- Moving the JSON schema/behavior exclusively into `agent.md` makes the selected agent definition responsible for parser compatibility.
- Because default/shared compactor definitions are user-editable and may become stale, this can make compaction fail or silently degrade if instructions are removed or out of sync with parser expectations.
- It affects non-default user-selected compactor agents too: they would need to carry compatible system instructions before they can work.

## Implementation Recommendation

Recommended compromise:

1. Strengthen the default `autobyteus-memory-compactor/agent.md` substantially:
   - explain compaction purpose and memory categories;
   - define what belongs in each output bucket;
   - include JSON-only discipline;
   - include concise preservation/drop rules;
   - make it useful for manual independent testing.
2. Keep the exact current JSON schema in the per-task user message as the authoritative parser contract, but trim duplicated behavioral prose where possible.
3. Structure user messages as mostly content plus a short task envelope:
   - task/context metadata;
   - authoritative current output schema/version;
   - `[SETTLED_BLOCKS]` content.
4. Do not move the parser-required schema exclusively to editable `agent.md` unless requirements explicitly accept stale/edited/custom compactor definitions as responsible for compatibility.

## Decision Needed

Please clarify the target prompt ownership:

- Option A: Strengthen default `agent.md` and keep exact JSON contract in each user message.
- Option B: Move most behavior and schema into `agent.md`; user message contains only content plus minimal delimiter/context. This is a design change with compatibility/staleness implications.
- Option C: Another split.

