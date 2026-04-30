# Design Impact Resolution: Compactor Prompt Ownership

## Status

Resolved by solution designer on 2026-04-30; pending architecture re-review.

## Trigger

Implementation raised a design impact after user feedback: the default compactor agent should not be a thin identity prompt while most durable compaction behavior lives in the hidden/generated per-task user message. The user wants to run the compactor as a normal visible agent, paste arbitrary conversation/history content, and inspect whether its compaction behavior is good.

## Decision

Use **Option A with a stricter ownership statement**: strengthen the default compactor `agent.md`, and keep the exact parser-required JSON contract in each automated task user message.

This is a two-layer prompt contract:

1. **Compactor agent `agent.md` owns stable behavior.**
   - compaction purpose;
   - category meanings;
   - preservation rules;
   - drop/noise rules;
   - JSON-only discipline;
   - manual-test guidance for pasted conversation/history content.

2. **Memory compaction owns the exact output contract.**
   - `CompactionResponseParser`, normalizer, and memory persistence consume a fixed shape;
   - every automated compaction task must include the current exact JSON schema/output contract;
   - semantic entries should stay minimal: `fact` plus optional `reference`; do not require model-generated free-form `tags`;
   - the per-task user message should be a short task envelope plus current schema plus `[SETTLED_BLOCKS]`, not a long duplicate behavior manual.

## Why Not Move The Schema Only Into `agent.md`

Do not use Option B in this ticket.

Reasons:

- The default compactor is a normal shared editable agent; users can edit or delete schema instructions.
- Users can select custom compactor agents whose `agent.md` may not contain the required shape.
- Seeded default agents are not overwritten after user edits, so future parser/schema changes could leave old `agent.md` content stale.
- Parser compatibility is owned by the memory subsystem, not by editable agent instructions.

Therefore automated compaction must always pass the current exact schema in the task envelope.

## Required Prompt Shape

### Default `agent.md`

The default `autobyteus-memory-compactor/agent.md` should be expanded enough that a user can manually test it as a normal agent. It should explain:

- that it compacts settled AutoByteus conversation/tool/validation/file/planning history;
- what belongs in episodic summary, critical issues, unresolved work, durable facts, user preferences, and important artifacts;
- what to preserve: decisions, constraints, open work, failures, validation evidence, tool outcomes, file paths, artifacts, durable preferences;
- what to drop: repeated chatter, transient progress messages, verbose raw payloads, low-value operational noise;
- that it must return JSON only and not invent facts;
- that when an automated task supplies an exact output contract, that contract wins.

### Automated per-task user message

The automated task should be mostly, with no free-form `tags` in the schema:

```text
Compact the settled blocks below into durable AutoByteus memory.
Use the current output contract exactly.

[OUTPUT_CONTRACT]
{ current exact JSON schema from memory compaction, using fact plus optional reference entries }

[SETTLED_BLOCKS]
...rendered settled blocks...
```

It may include brief context metadata, but should not repeat the long behavior manual now owned by `agent.md`.

## Consequences For Implementation

- Expand `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md`.
- Trim duplicated behavioral prose in `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` while preserving the exact JSON contract and block rendering.
- Remove `tags` from the compactor-facing schema in prompts/docs/tests; keep entries focused on `fact` and optional `reference`.
- Add/adjust tests so:
  - default `agent.md` contains manual-test/category/preservation/drop guidance;
  - task prompt includes the exact JSON contract and `[SETTLED_BLOCKS]`;
  - task prompt does not regress into a large hidden behavior manual.
- Do not make editable `agent.md` the sole parser-compatibility owner.
