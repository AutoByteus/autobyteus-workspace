# Design Impact Resolution: Minimal Compactor Output Schema

## Status

Resolved by solution designer on 2026-04-30; pending architecture re-review.

## Trigger

The user first questioned free-form `tags` in the compactor schema, then asked what optional `reference` means and whether it should also be removed if it makes the schema harder for less capable LLMs.

Code review also blocked because the artifact chain introduced tagless schema requirements without completed architecture-review/implementation alignment. This note reconciles the scope: the minimal schema remains in scope for this ticket and must be routed through architecture review and implementation before API/E2E resumes.

## What `reference` Means

`reference` means a model-generated source pointer, for example:

- a turn id;
- a file path;
- an artifact id;
- a tool result or validation note;
- a short “where this fact came from” string.

It can help traceability, and current memory rendering can show it when present. However, it is optional, model-generated, and not essential to compacting durable facts.

## Decision

Use a facts-only semantic entry schema for the compactor-facing contract.

The compactor output should be:

```json
{
  "episodic_summary": "string",
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
```

Remove both of these from prompts/docs/tests for compactor output:

- free-form `tags`;
- optional model-generated `reference`.

The category arrays classify each fact. The fact text is the core durable memory value.

## Scope

In this ticket:

- Update `CompactionTaskPromptBuilder` to request facts-only semantic entries.
- Update the default compactor `agent.md` manual schema/example to facts-only entries.
- Update parser/normalizer tests so compactor output does not require or encourage `tags`/`reference`.
- Update docs to show the facts-only schema.
- Keep existing internal memory model fields (`tags`, `reference`) only where already useful for other memory sources or future indexing; the compactor agent should not generate them.

## Future Direction

If traceability or retrieval facets become important later, design them separately with:

- deterministic source mapping from known block/trace ids where possible;
- a controlled vocabulary if tags/facets are needed;
- explicit consumers in retrieval/rendering/UI;
- validation that weaker/local models can reliably produce the format.

Do not reintroduce arbitrary optional LLM-generated metadata in the compactor contract without that design.
