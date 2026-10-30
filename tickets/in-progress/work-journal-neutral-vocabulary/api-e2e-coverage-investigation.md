# API/E2E Coverage Investigation — autobyteus-331 (Work Journal: neutral vocabulary)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (this folder)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-002)
- Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `work-journal-neutral-vocabulary-contract.md` (behavior-defining; §11 synthetic traces), `journal-neutrality-analysis.md`, `probes/`, `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (Medium + Low, direct route)
- Implementation Handoff: `implementation-handoff.md`; Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `N/A — not applicable`
- Delivery Revision Record / IDs: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff of IR-001 (head `40fb8233d5`; code `683b953f3f`, tests `32cb0034e4`)
- Prior Investigation Reviewed: `N/A` (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Journals must say what was done, not which runtime's tool did it (REQ-001…006), identically on all five runtimes, with refused messages shown as `failed` (REQ-004). Journals regenerate with no migration: the first catch-up pass after the update (renderer revision 1→2, in the Journals-step fingerprint; REQ-008) and Rebuild (REQ-009, `ensureCurrent(target, {regenerate})`). Memory search and the Memory page read the regenerated journals unchanged (REQ-010). Persisted-data transition: `Discard or Rebuild`. Implementation checks IMP-01…IMP-04 are green; they render single records, spy on `ensureCurrent`, and the shadow render ran on a copy of real data. No existing test runs the real service **and** the real pipeline over raw-trace files on disk, and reads the result back through the user-facing surfaces (GraphQL `memorySearch`, the Memory page's journal reader). That is the gap this round closes.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (read neutral journals, all runtimes), SCN-002 (first pass after the update regenerates), SCN-003 (Rebuild regenerates), SCN-004 (history names; unit-level, reused). SCN-005 is out of scope.
- Real-use scenarios added from investigating the code:
  - SCN-A1: a node whose manifest already carries the current revision but whose closed file has old wording (a closed file is reused by the service) — only Rebuild may replace it; "Index now" must not. Trigger: the Memory page's Rebuild / Index now buttons (`rebuildMemoryIndex`, `startMemoryIndexing`).
  - SCN-A2: a second server start after the update renders nothing (no repeated regeneration). Trigger: server start (`MemorySearch.start`).
  - SCN-A3: Rebuild clears the stored fingerprints, so `regenerate` is what actually forces closed files; check that the flag, not the fingerprint, does it.
- `Technically Possible but Unsupported/Contrived`: none recorded. Not tested: user-installed tools, journals without a recorded runtime (FU-001, out of scope).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002/003 neutral lines (converters, skill rule) | Changed | requirements, contract §3–§5, §11 | Unit tests exist (IMP-02/03); add pipeline-level proof from raw files for all five runtimes |
| BEH-004 `delivered` / `failed: <msg>` | Changed | REQ-004 | Same; plus FU-003 older native results print `ok` (accepted, FU) |
| BEH-005 history names | Changed | REQ-005 | Unit-level tests exist; reused |
| BEH-006 `(via <server>)` | Changed | REQ-006 | Unit-level; the pipeline test asserts no non-qualified `Tool:` heads |
| BEH-007 revision in fingerprint | Changed | REQ-008, `journals-step.ts` | Existing test mocks the revision; add real earlier-node → catch-up → second start |
| BEH-008 Rebuild forces regeneration | Changed | REQ-009 | Existing test checks the flag only; add real closed-file regeneration |
| BEH-009 consumers unchanged | Preserved | REQ-010 | Search + Memory-page reader over regenerated journals |
| REQ-007 byte-identity of unchanged lines | Preserved | AC-007 | Existing golden (`unchanged-lines.test.ts`); reused |
| REQ-013 cost report | Added | AC-013 | Implementation evidence IMP-04 reviewed (see Not Tested / report) |
| REQ-014 module doc | Added | AC-014 | Delivery's docs sync; not API/E2E |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | renderer, converters, service `ensureCurrent`, Journals step | unit tests, 7,438 passing | none known | server unit (rerun) |
| API / transport / contract | Yes (consumers) | GraphQL `memorySearch`, `rebuildMemoryIndex`, journal view reader read regenerated text | `memory-search-graphql.e2e.test.ts` (generic runs only) | neutral text through the real schema | new server E2E (durable) |
| Frontend component / state | No | Memory page unchanged | — | — | — |
| Browser / desktop renderer / shell | No | no UI change; text rendered by an untouched component | — | none | not required |
| Authentication / session | No | — | — | — | — |
| Process / lifecycle | Yes | catch-up after restart; Rebuild | unit mock tests | real service + restart | new server E2E |
| Persisted-data transition | Yes | `work_journal/` files and manifests (`Discard or Rebuild`) | service test; IMP-04 shadow render | upgrade of old manifests via the real pipeline; second start idempotent | new server E2E + IMP-04 reuse |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes (indirect) | runtimes record platform tool calls; gated live suites record real traces | gated suites `work-journal-live-runtimes`, `-restore-transport` | real tool records of each runtime read in neutral words | gated runtime run (scripted AGY, see plan) |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary` (branch `codex/work-journal-neutral-vocabulary`)
- Project type: TypeScript pnpm monorepo; server `autobyteus-server-ts` (vitest)
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md` for `autobyteus-server-ts`. Also `AGENTS.md`, `DESIGN.md`.
- Conflicts: TESTING.md "Data" forbids a conversion/startup on real data or a copy; the implementation's shadow render (REQ-013) used an isolated copy per the design. Recorded; I run nothing on real data and do not repeat the shadow render. My fixtures are synthetic.
- Secrets available: not needed for planned cases (the gated suites would need CLI logins / vault; see Not Tested).

| Instruction Path | Authority | Learned |
| --- | --- | --- |
| `TESTING.md` | layers, isolation, rerun-by-impact | server unit/integration/E2E commands; "one heavy run at a time"; clean environment for E2E folders; every failure has a cause (Rule 9) |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | scripts | `exec vitest run <path> --no-watch`; unit tests are isolated by `tests/setup/test-environment-isolation.ts` |
| `tests/e2e/memory/memory-search-graphql.e2e.test.ts` | pattern | real GraphQL schema + `MemorySearch` over a test-owned folder + fake embedding index |
| `tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | gated live suite | RUN_CLAUDE_E2E / RUN_CODEX_E2E / RUN_AGY_E2E / RUN_DEEPSEEK_E2E gates |
| `tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts` | scripted AGY | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; `CALL_TOOL:{…}` drives a real tool without a model |

| Component | Working Dir | Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Server E2E vitest process, test-owned temp root, fake embedding index | worktree `autobyteus-server-ts` | `pnpm install` done by implementation (verify); no server process | own data root under `os.tmpdir()`, no ports | vitest result | the test removes its temp root |
| Scripted AGY runtime (candidate) | same | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs` with `env -i`, throwaway `HOME` | no model, no credits | suite result | suite-owned |

| Data / Identity Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Raw traces of 5 runtimes | the repo's synthetic traces (`tests/agent-work-journal/synthetic-run-traces.ts`, contract §11) written as `raw_traces_active.jsonl` | invented data, no user data | temp root removed |
| Runtime per run | `MemoryRunDiscovery` with stubbed agent metadata (as the existing memory E2E does) | — | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild` (design-spec § Persisted Data / State Transition Decision; handoff Persisted Data Transition Check: no migration implemented).
- Representative setup: a memory root whose journals carry manifest revision 1, old-wording text, and a raw fingerprint without the renderer part (what the previous build stored). Raw traces unchanged.
- Evidence planned: first catch-up pass replaces every journal in place, manifests at revision 2, raw traces byte-identical (hash), no extra files; a second start writes nothing (mtime unchanged); Rebuild regenerates a closed file with the current revision; IMP-04 shadow render reused for scale (6,171 of 7,527 files; 0 entry-count mismatches).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/agent-work-journal/rendering/{neutral-vocabulary,platform-tool-converters,platform-completeness,skill-load,tool-call-line,unchanged-lines}.test.ts` | converters, lookup chain, skill rule, completeness, byte-identity | AC-001…007, 011, 012 | Still Valid | read; assertions agree with requirements/contract | rerun (case API-01) |
| `tests/agent-work-journal/rendering/runtime-translations.test.ts`, `rendering-building-blocks.test.ts` | runtime tables, shared parts | AC-002, 005 | Still Valid | read | rerun (API-01) |
| `tests/agent-work-journal/services/work-journal-service.test.ts` | revision change replaces journal in place; regenerate | AC-008, 009 | Still Valid | service-level only | rerun (API-01) |
| `tests/unit/memory-search/memory-search.test.ts` (new block), `memory-search-index-units.test.ts` | revision changes fingerprints; Rebuild passes `regenerate`; heads → actions/card `Did:` | AC-008…010 | Still Valid, but mocks the revision and checks the flag only | read | rerun (API-01); supplement with real-file E2E |
| `tests/e2e/memory/memory-search-graphql.e2e.test.ts` | GraphQL index/search on generic runs | REQ-010 preserved | Still Valid | read | rerun (API-03) |
| `tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | live runs: no built-in as generic `Tool:` line; links resolve | preserved built-ins | Still Valid (gated) | read | candidate (API-05) |
| `tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts` | scripted AGY rotation, rebuild on restore | preserved | Still Valid (gated, scripted) | read | run (API-04) |
| `tests/fixtures/agent-work-journal/*` | builtin tool list incl. new `_runtime_only`; golden of unchanged groups | AC-007/011 | Still Valid | read | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…012 | server unit: journal + memory search | Existing Test | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-journal tests/unit/memory-search --no-watch` | IMP-03 ran on `32cb0034e4`; files changed since (`git diff --name-only 32cb0034e4 HEAD -- autobyteus-server-ts`) are expected to be none, so reuse is possible. Decision recorded in the report; I still rerun this narrow suite as the base for the new case (cheap, ~1 min) |
| API-02 | AC-001…006, 010, 012 | real service + pipeline + Memory page reader + GraphQL `memorySearch` | Durable | new `tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts` (build tests) | gap above |
| API-03 | AC-008, 009, REQ-007 consumer, SCN-A1…A3 | real pipeline restart / Rebuild | Durable | same file (update tests) | gap above |
| API-04 | preserved behavior, AC-008 on a real runtime path | scripted AGY end to end with rotation, rebuild on restore | Existing Test (gated, scripted) | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts --no-watch` | proves the journal service still renders a real runtime's records after the change |
| API-05 | AC-001/002/003 on real runtime records | scripted AGY with `CALL_TOOL:{"tool":"send_message_to"…}` and a skill read, read back through the journal | Temporary Probe (decide after API-04 whether the scripted CLI can call platform tools in this suite) | see report | real recorded argument shapes; `agy` records platform calls as MCP calls |
| API-06 | AC-007…010 | typecheck + full server unit | Reused / Existing | `IMP-01`, `IMP-02` reused if no source changed since `32cb0034e4`; typecheck rerun after my test is added | TESTING.md rerun-by-impact |
| API-07 | AC-013 | IMP-04 report | Reused (review of evidence) | read `evidence/IMP-04-*` | measured on a copy per design; not repeated (rule: never run conversion on real data) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-02, API-03 | `autobyteus-server-ts/tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts` | the only coverage of the real renderer + service + pipeline + user-facing readers over raw-trace files for all five runtimes, the upgrade and Rebuild |

## Durable Coverage To Update / Remove

None.

## Desktop Application Validation Plan

Not applicable: no desktop shell or renderer behavior changed (the Memory page component is untouched, the journal is displayed as text). An isolated desktop instance would add only a pixel-level view of text already read through the same GraphQL reader; recorded as not required in the report.

## Live Environment And Fixture Plan

- Order: build the worktree server only if a case needs `dist/` (none of the planned cases does: vitest runs from source).
- Scripted AGY suite: clean environment (`env -i PATH HOME=<resolved temp>`), no user data, no CLI config touched.
- Evidence: vitest output saved to `evidence/API-*.log` with a header; the journal text excerpt of one run per runtime.
- Owned temp state: removed by the tests; the throwaway HOME removed by me.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Live-model runs on Claude, Codex, AutoByteus, Grok | credits / logins; the change does not touch runtime backends or tool recording; the converters read recorded shapes that the synthetic traces mimic (contract §11, shapes measured on real data in the analysis) | recorded shapes differ in a way the synthetic trace missed (FU-003 and the two Antigravity `Bash` calls found by the shadow render are examples) — mitigated by IMP-04 on 7,527 real journals | No | decided after API-04/05 and confidence scoring |
| Contract §9.5 reading test (an agent on another runtime reads a rendered journal) | needs a model; a judgment about comprehension | wording clarity | Yes (user/designer judgment) | listed for delivery |
| Gate 2 slightly lower on shadow render | evaluation outcome belongs to Solution Designer | ranking | N/A | travels with package |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| FU-003 older native message results print `ok` | Open follow-up (design decision), not a failure | follow-ups.md | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Will Be Added: `Yes`
- Reroute Required Before Validation Execution: `No`
