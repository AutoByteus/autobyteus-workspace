# Design Impact Resolution: Remove Compactor Output Tags

## Status

Resolved by solution designer on 2026-04-30; superseded/extended by `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-minimal-compactor-schema.md` after the user also questioned optional `reference`. Pending architecture re-review.

## Trigger

The user questioned the `tags` field in the compactor output schema and stated that the structure should be as simple as possible because weaker LLMs can struggle with highly structured output. The user prefers removing fields that do not bring clear value.

## Current Finding

`tags` were free-form string labels on each semantic entry, for example `['decision']` or `['constraint']`.

Current code inspection shows:

- `CompactionResponseParser` accepts and normalizes `tags`.
- `Compactor` stores those tags on `SemanticItem`.
- `SemanticItem` supports optional tags generally.
- The current compaction snapshot rendering path groups semantic memory by the surrounding category array and renders `fact` plus optional `reference`; it does not use tags.

Therefore tags currently add model-output burden and schema complexity without a required consumer in this compaction flow.

## Decision

Remove free-form `tags` from the compactor-facing output contract for this ticket. The later minimal-schema resolution extends this by also removing optional model-generated `reference`.

Semantic entries should be:

```json
{ "fact": "string" }
```

inside the already typed arrays:

- `critical_issues`
- `unresolved_work`
- `durable_facts`
- `user_preferences`
- `important_artifacts`

The category array already provides the primary classification. The later minimal-schema resolution removes `reference` as well, so traceability/source pointers should be reintroduced only through a future controlled design.

## Scope

- Remove `tags` from `CompactionTaskPromptBuilder` output contract.
- Remove `tags` from the default compactor `agent.md` human-readable schema/example.
- Update parser/normalizer/tests/docs so compactor output does not require or request tags.
- Internal memory models may keep optional `tags`/`reference` for other memory sources/future indexing, but the compactor agent should not be asked to generate them.

## Future Direction

If future retrieval needs labels/facets, design it separately with:

- a clear consumer path;
- a controlled vocabulary or deterministic derivation rule;
- explicit indexing/search behavior.

Do not reintroduce arbitrary model-generated tags without that design.
