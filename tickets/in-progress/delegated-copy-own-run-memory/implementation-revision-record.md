# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / design-spec.md (SR-009), ARCH-REV-004 Pass / round 1 | N/A | `Initial Baseline` | SR-009, ARCH-REV-004 | Implemented D-1..D-10 and U-1..U-5; ready for Code Review |
| IR-002 | Code Reviewer / code-review-report.md / CRR-001 round 1 | CR-001, CR-002, CR-003 | `Local Fix` | SR-009, ARCH-REV-004, CRR-001 | Unused declarations removed; one task-agent metadata parse path; team own-file placement recorded; unreadable coordinating tree warned |
| IR-003 | Code Reviewer / code-review-report.md / CRR-005 (requirement refinement DEC-018) | CR-004 | `Local Fix` | SR-009, ARCH-REV-004, CRR-005 | Memory page group shows the definition's name when no history row names it; id only when the definition is gone |
| IR-004 | Delivery Engineer / delivery-integration-blocker.md / DR-001 | DR-001 items 1–3 | `Local Fix` | SR-009, ARCH-REV-004, CRR-007, DR-001 | Merged-state e2e: one test updated to the new layout and the waiting gate; two test-isolation defects fixed from their causes |

## Revision Entries

### IR-001 — Task agents become their own runs (initial implementation)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/design-spec.md` (SR-009, contract revision 5), after architecture review ARCH-REV-004 `Pass`; implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: a task agent's memory and facts live in its own run folder at L1; coordinating trees hold links; the stores compose and split; one placement rule; G1 / G2 in the readers; per-run message logs; Memory page attribution; readiness skips task agents; delete keeps them; startup migration `20261017_task_agent_own_run_v1`; released migrations on frozen copies; version-free names.
- Related solution revision IDs: SR-009 (cumulative SR-005..SR-009)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first complete implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009; REQ-001..REQ-019; AC-001..AC-024 (AC-022 withdrawn).
- Implementation delta: commit `8bbd081c8d` (D-10 renames); commit `5a5359e707` (D-9 frozen copies and repointing); the behavior commit (D-1..D-8, U-1..U-5, tests, docs, web text, ticket artifacts).
- Changed files or areas: listed in `implementation-handoff.md` (Key Files Or Areas; Test impact inventory).
- Local validation and result: build typecheck clean; server unit 714 files passed; integration and e2e green except pre-existing failures (verified at HEAD); web specs and localization suites pass.
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: AC-016 isolated desktop journey not run by implementation (handed to API/E2E with a recipe); the user's "Dilan principle" remark is an open question; the D-6 owner-list removal is a recorded deviation; the fresh-ledger retry of the released `20260521` index migration is recorded.

### IR-002 — CRR-001 local fixes (unused declarations, one parse path, warn on skipped task agents)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/code-review-report.md`, CRR-001 (round 1, Fail — Local Fix, 9.1/10).
- Triggering finding IDs: CR-001, CR-002, CR-003
- Classification: `Local Fix`
- Prior authoritative result: IR-001.
- Current authoritative result: IR-001 plus the three fixes; classification unchanged (Large / High).
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewer's Local Fix findings.
- Approved behavior or requirement IDs affected: none changed; D-3 / D-5 hardened (DESIGN.md rule 7, Principle 7).
- Implementation delta:
  - CR-001: removed the unused `required` (`agent-org-execution-tree-location-service.ts`), the `PreparedTaskExecution` import (`task-agent-execution-registry.ts`), the `createTeamFlatExecutionCallbacks` import (`application-execution-scope-kernel-builder.ts`) and `TeamCommunicationReferenceFileType` (`team-communication-projection-service.ts`); the `memoryDir` constructor arguments of `migrate-native-working-context-snapshots-v5-migration.ts` and `team-run-migration-state-classifier.ts` are no longer stored as unused properties (signatures and behavior unchanged).
  - CR-002a: `AgentRunMetadataStore.readTaskAgentMetadataStateSync` added; async and sync task-agent readers share one parse function; `TaskAgentOwnFiles.readAgentSync` delegates to it.
  - CR-002b: recorded as Deviation 2 in the handoff (team own-tree IO in `TaskAgentOwnFiles`).
  - CR-003: `TaskAgentLinkChecker` logs one warning naming the coordinating run and the reason when its tree cannot be read; the skip is kept.
- Changed files or areas: the six CR-001 files; `run-history/store/agent-run-metadata-store.ts`, `task-agent-own-files.ts`, `task-agent-link-check.ts`; tests `task-agent-own-run-stores.test.ts`, `agent-memory-explorer-task-agents.test.ts`; `implementation-handoff.md`.
- Local validation and result: build typecheck clean; unused-declaration check clean for touched files; unit 715 files passed; integration green apart from the 2 pre-existing agent-status failures.
- Next recipient or routing: Code Reviewer (Targeted Delta Review of CR-001..CR-003).
- Remaining limitations or risks: unchanged from IR-001 (AC-016 journey for API/E2E; the "Dilan principle" question).

### IR-003 — Memory page group name from the agent definition (DEC-018)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/code-review-report.md`, CRR-005 (Fail — Local Fix), after the Solution Designer's DEC-018 (requirements-doc.md).
- Triggering finding IDs: CR-004
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (CRR-002 Pass).
- Current authoritative result: IR-002 plus the group display name from the definition; classification unchanged (Large / High).
- Related solution revision IDs: SR-009 (DEC-017, DEC-018 recorded in requirements-doc.md)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: N/A (API/E2E reruns the Memory page check after review)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: DEC-018 refines D-5; a task-agent-only group showed the definition id because task agents have no history row (G1).
- Approved behavior or requirement IDs affected: D-5, REQ-010, AC-013, DEC-018.
- Implementation delta: `AgentMemoryExplorerService` takes an optional `agentDefinitions` lookup (default: the process `AgentDefinitionService`, loaded lazily as the history catalog does); after grouping, a definition group no history row names gets the definition's name, the id when the definition is not found, and the id with a warning if the lookup fails.
- Changed files or areas: `autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts`; `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-explorer-task-agents.test.ts`; `implementation-handoff.md`.
- Local validation and result: build typecheck clean; agent-memory, memory-sync and graphql unit folders 41 files / 213 tests passed.
- Next recipient or routing: Code Reviewer (Targeted Delta Review of CR-004).
- Remaining limitations or risks: AC-020's locator sub-case is verified by composition (DEC-017); the full unit suite was not rerun for this change.

### IR-004 — Merged-state e2e failures (DR-001)

- Triggering role, report path, and round: Delivery Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/delivery-integration-blocker.md` (DR-001, post-integration rerun after merging `origin/personal` `2d076088dd`).
- Triggering finding IDs: DR-001 items 1, 2, 3 (item 4, terminal PTY, is the known Task 0c7efc37).
- Classification: `Local Fix` (test-only; no `src` change).
- Prior authoritative result: IR-003 (CRR-007 Pass).
- Current authoritative result: IR-003 on the merged branch plus three test changes; classification unchanged (Large / High).
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-007
- Related API/E2E revision IDs: see api-e2e-revision-record.md
- Related delivery revision IDs: DR-001
- Why this implementation revision is recorded: the merged state's full e2e failed in three files.
- Approved behavior or requirement IDs affected: none changed (REQ-016 / AC-019 test update; REQ-017 / AC-020 waiting gate now asserted at startup level).
- Implementation delta:
  - `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`: the converted Org tree holds the task agent as a link (no `settledAt`) and its own file at L1 (`configured_place`); in the mixed-root case our migration waits (`WAITING_FOR_PREDECESSOR` for `agent_team:<root>`, FAILED, attempts 1 → 2) and the ledger comparison excludes both retried rows.
  - `tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`, `token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`: delete the file's migration records in `beforeAll` (shared-database isolation).
  - `tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts`: bind the process Prisma client to the file's own database before the vault initializes; close it in `afterAll`.
- Changed files or areas: the four test files above; `implementation-handoff.md`.
- Local validation and result: each file passes alone; items 2 and 3 reproduced alone by planting the leaked state, then pass with the fix and the leaked state present; full merged-state e2e as recorded in the handoff.
- Next recipient or routing: Code Reviewer (Large / High Local Fix), then re-validation as usual.
- Remaining limitations or risks: items 2 and 3 are pre-existing isolation defects in tests outside this ticket, fixed here because they block its delivery gate; other files with the same shared-database pattern may exist (follow-up candidate).
