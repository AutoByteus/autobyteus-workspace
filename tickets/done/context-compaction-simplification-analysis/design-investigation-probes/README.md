# AutoByteus feasibility probes — SR-003

Read-only investigation against AutoByteus `046279298f53fb98d7688ee9dc2b2ba0fa827685`. These are not implementation tests or live-model quality evaluations.

## Reproduction

```sh
node autobyteus-design-probes.cjs \
  /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis \
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
```

Run from this directory, or pass its absolute script path. The first argument supplies actual source; the second supplies existing TypeScript and external dependencies from `autobyteus-ts/node_modules`. The script transpiles whole current source modules without typechecking; no module stubs, application bootstrap, provider calls, credentials or user histories. It writes the adjacent results JSON. No production source is changed.

Node v22.23.1; TypeScript 5.9.3. Four probes passed; loaded-source SHA-256 hashes are in the JSON.

1. Existing v5 serializer/finalizer/message-unit builder round-trip a plain Markdown checkpoint.
2. The same path round-trips category-rendered text without needing categorized IDs in the snapshot.
3. The current 2,000-character renderer cap can remove a constraint from the middle of an older checkpoint.
4. The same clipping can remove a constraint from an ordinary long user message.

The last two passes confirm current shortcomings, not fixes. Synthetic sentinel text makes loss measurable; it does not establish production frequency. The scenario basis is ordinary long user instructions and repeated compaction, not manual summary submission. Snapshot probes do **not** exercise the existing bootstrapper's separate lineage gate or prove a complete no-migration transition. No production persisted-data volume was sampled.


## SR-013 persistence design probes

Run `node sr013-persistence-probes.cjs <task-worktree> <shared-workspace>`. Six probes passed using unchanged production source primitives and temporary synthetic data, as recorded in `sr013-persistence-probes.log` and `sr013-persistence-results.json`. They establish the feasibility of snapshot reuse and copy-before-prune sequencing, not that the target commit/restore pipeline is implemented. `sr013-source-inventory.json` records affected symbol references and the read-only RPA response contract source pin.
