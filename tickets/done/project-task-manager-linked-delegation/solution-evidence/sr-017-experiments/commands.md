# Executed commands and layers — SR-017

Assigned W `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`; S=W/autobyteus-server-ts; E=W/tickets/in-progress/project-task-manager-linked-delegation/solution-evidence/sr-017-experiments. TESTING.md/server AGENTS select the smallest server owner layer. No desktop, endpoint, provider/model, credential importer, shared test database reset, or API/E2E validation executed.

Exact successful command form:
```bash
SD_VARIANT=<variant> pnpm -C "$S" exec vitest run --config "$E/vitest.config.mts" "$E/<file>" --no-watch
```
- `discrimination.test.ts`: variants `tbc`, `-`, `t`, `tc`, `bc` in that order; logs tbc.log, incoming.log, t.log, tc.log, bc.log. Current/archives selected through the owned resolver, not source replacement. All exits0. `-` and `bc`4pass1skip each; t/tc/tbc5pass each. The skip is explicit: async-delivery isolation requires corrected thread retention. Incoming expected-defect assertions passing are NOT product Pass.
- `durable-current.test.ts`, variant tbc: exact current seven-case IR007 test logic copied with only import/fixture absolute-location rewrites. 7pass, exit0; actual native and async10s proof timeouts plus exact retry. Original durable test/fixture untouched. No shared Prisma global setup; unused owned DATABASE_URL points inside E, file absent after runs.
- `queued-pipeline.test.ts`: tc/tbc each1pass exit0; pass-through delay at actual default pipeline, existing queue remains in use.
- `immediate-terminal.test.ts`: -/tbc each5pass exit0; JSON-RPC child automatically emits idle followed by typed terminal, without gap latch/sleep/worker forcing. Incoming passes release5/5, but wrongly reports completed; current reports interrupted5/5. This is a scheduling contrast, NOT natural provider failure frequency.

Before successful tests, three harness/config startup failures ran0tests: outside-package bare vitest resolution; CJS-config bundling; external importer core-alias resolution. Exact logs tbc-initial-config-error.log, tbc-initial-cjs-bundle-error.log, tbc-initial-core-alias-error.log. Corrected only investigator config using createRequire at server package and explicit equivalent core alias. Investigator dependency symlink removed after completion; reproduce.sh restores/removes only that owned symlink as needed.

Read-only Python operations: hash all1262 current incoming files; independently compare three baseline owners against exact IR007 incoming tar; read only previously identified UUID-matching owned native rollout metadata/event facts/hash; fetch two exact primary rust-v0.160.0 URLs and compare hashes/line extracts; extract raw original debugger values; compare package before authoring. Every original file unchanged1262/1262 at post-experiment check. No git reset, shared source rollback or temporary substitution.

Reproducer is `bash "$E/reproduce.sh"`; subsequent outputs use *-rerun.log and append fresh-generation receipts. It is a reproducibility instruction, not an extra executed run. Main receipts: --receipts.jsonl, t-receipts.jsonl, tc-receipts.jsonl, bc-receipts.jsonl, tbc-receipts.jsonl. All original current/source/spec/historical files remain authoritative, not these copies.
