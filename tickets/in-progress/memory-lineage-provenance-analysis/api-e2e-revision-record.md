# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain authoritative. This record is the concise chronological index of completed API/E2E validation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `code-review-report.md`; execution round 1 | SR-004, ARCH-REV-004, IR-002, CRR-002 | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Current-only memory lineage, reset, and recurrent live compaction baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`; API/E2E execution round 1.
- Triggering finding or scenario IDs: CRR-002 source-review `Pass`; validate SCN-001 through SCN-016 and close the stale memory-suite, lifecycle, API/process and provider-realism gaps recorded in the implementation handoff.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-002; delivery revision `N/A`.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result for implementation commit `394885c1090cfc8313f2864a2dbca541575bec2f`. No earlier API/E2E result or confidence existed.
- Coverage decisions or durable test paths changed:
  - Updated 24 existing durable test files to the approved current-only schema/owner contract.
  - Added 7 durable test files for lineage store/resolver/presentation, reset migration, startup gate, server scope and origin service.
  - Removed `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` because its only purpose was to protect the deleted v4 runtime gate/compatibility behavior.
  - Added no production source or compatibility path.
- Scenarios added, changed, removed, or rechecked: SCN-001 through SCN-016 were mapped and passed. The critical added/replaced evidence covers manager-owned C1/C2 publication, R(n)-only archives, 1,000-record bounded current tail, typed direct/root resolver integrity, strict v5 restore, required reset/startup failure gating, interrupt/reset/follow-up recovery, retry non-mutation, natural prompt and Work Evidence goldens, active-only Event Monitor, and explicit scope/provider wiring.
- Commands, environment, fixture, or broader-validation delta:
  - Reproduced the stale-suite baseline before maintenance, then passed the final 33-file/148-test core memory suite and 12-test AgentRuntime integration suite.
  - Passed focused resolver/1,000-tail, migration/startup, scope/origin, Work Evidence, affected server, GraphQL and current-contract E2E suites.
  - Passed current core/server builds and actual built-server startup/restart checks.
  - Ran full deterministic E2E; 47 files/164 tests passed and 14 files/49 tests skipped. One unrelated managed-gateway spawn failure immediately passed its exact 2-test isolated rerun.
  - Used the documented `pnpm secrets:import` against an isolated SQLite/vault target authorized by the user, then passed a real OpenAI `gpt-5.4-mini` built-server/GraphQL/WebSocket C1/C2 journey with a parent-run low compaction ratio.
  - The live journey published two linked lineage records, two distinct non-empty archives, bounded episode/semantic outputs with provider/model metadata, and schema-v5 current context; all owned live state was removed.

#### Prior Failure Resolution

None — no prior completed API/E2E result exists for this revision.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for proportional changed-test review.
- Remaining risks, blocked evidence, or untested scope:
  - Process termination between normal multi-file publication writes remains explicitly out of scope; no journal/recovery contract exists.
  - Subjective long-form provider summary quality is not evaluated; the live run proves real transport, valid schema and recurrent publication.
  - Browser/Electron execution is inapplicable because no UI, renderer, preload, IPC, window or packaging boundary changed.
  - An ultra-low process-global trigger ratio also applies to built-in compactor agents; the successful live test intentionally scoped the ratio to the parent run and does not claim the global form is safe.
  - Proportional review of changed durable test code remains the next required workflow gate.
