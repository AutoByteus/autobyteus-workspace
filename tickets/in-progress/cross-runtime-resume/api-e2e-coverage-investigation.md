# API/E2E Coverage Investigation — autobyteus-316 (cross-runtime-resume)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-004); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `run-runtime-switch-contract.md` (v2, behavior-defining), `prerequisite-stored-runtime-names.md`, `work-journal-neutral-vocabulary-contract.md` and `journal-neutrality-analysis.md` (context), `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-001 Fail → ARCH-REV-002 Pass) / `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`; Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `code-review-report.md` / `code-review-revision-record.md` (CRR-001 Pass, 9.4/10, no findings)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current ID: `API-REV-001`
- Round: 1. Trigger: source review pass CRR-001 (it listed what to cover beyond the implementer). Prior investigation: `N/A`.

## Current Requirement And Design Basis

A stopped, unarchived **standalone** Agent run can have its agent runtime and model changed in its settings (REQ-001; same run ID, workspace and history; previous session binding dropped; a pending switch recorded; picking the original runtime again undoes it). The switch happens at the first input (DEC-9): the previous agent's raw-trace records are archived by rotate-before-boundary, a marker is the first record of the new active file (REQ-010, I-3, I-5, I-7, I-8), and the new agent receives a hand-over notice before the user's text, once (REQ-002/003/007); the chat shows the marker (REQ-011); each journal file is translated with the runtime of its own raw file, and journals of runs that never switched are unchanged (REQ-012, AC-006); members, Org members, delegated copies are rejected (REQ-013). Persisted data: no migration (optional `pendingRuntimeSwitch` field, a new boundary-type value, journal entries without a per-file runtime are dropped and re-rendered).

Evidence so far: unit/focused suites (server 890 files / 7582 tests, web 670 / 4871, clean clone), and one real run Claude → Codex → scripted Antigravity (`evidence/implementation/live-e2e-result.txt`, `evidence/real-run/`). Not done by anyone: a switch **to and from the native runtime**, the settings save/undo/model-only edit/first message on the **built server**, the **combined Save** of a host with delegated copies, **regeneration of `generated/graphql.ts`**, and a **byte-identity check** of a never-switched run's journal.

## Supported Scenarios And Real Usage

- Covered: SCN-001 (usage limit/sign-out, switch and chat), SCN-002 (run stopped by hand), SCN-003 (second and third switch), SCN-006 (member/delegated copy stays locked).
- Added from investigating the implementation (real trigger in brackets):
  - SCN-A1: native → AGY → native on one run (the reviewer's pair; the native candidate is prepared before the marker, I-7 must still hold) [stop, settings save, first message].
  - SCN-A2: the user saves a switch, changes his mind (undo), switches again, then edits only the model while the switch is pending [Settings Save ×4].
  - SCN-A3: a second message after the switch carries no notice [chat].
  - SCN-A4: a host with delegated copies saves a new runtime for itself together with a copy's model in one Save [Delegated launch selection Save].
  - SCN-A5: a run that never switched but has archived (compaction) segments keeps byte-identical journals under the per-file runtime rule [journal derivation after update].
  - SCN-A6: a run switched while running is refused [Settings Save on a running run].
- `Technically Possible but Unsupported/Contrived`: none to skip (SCN-005 agent/Router switches are unsupported, FU-004; not tested).

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 settings save/undo/model-only | Changed | REQ-001, AC-001 | unit; add built-server journey incl. native, undo, pending+model-only, running refused, delegated rejected |
| BEH-002 first input: marker/archive/notice/once | Added | REQ-002/003/010, AC-002/009 | unit + 1 live run on Claude/Codex/AGY(scripted); add native pair on the built server |
| BEH-005 chat marker | Added | REQ-011 | web spec + live WS check; add WS/projection check on built server |
| BEH-007 per-file journal runtime | Changed | REQ-012, AC-006 | unit; add byte-identity spot check for never-switched runs |
| GraphQL contract `…ModelConfig`→`…Selection`, `runtimeKind` input | Changed (clean cut) | design | generated client edited by hand: regenerate with codegen against the built server |
| Host + delegated copies combined Save | Changed | design Change Scope | unit; add built-server case |

## Changed Surface And Boundary Classification

| Surface | Affected? | Actual Changed Boundary | Repository Evidence | Risk Not Exercised | Candidate Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | commit function, activation, recorder, notice, journal runtime | unit | native pair; real server wiring | built-server journey |
| API / transport | Yes | `updateStoppedAgentRunSelection`, `updateDelegatedLaunchSelections`, agent WebSocket, run projection | unit resolver tests | the built schema vs the committed client | built server + codegen |
| Frontend component/state | Yes | settings component, stores, chat marker segment | web specs (4871) | none new for the web layer (no UI run requested) | web specs reused; no browser |
| Browser / desktop | Yes (UI) | settings choice + marker | web specs | pixel/DOM in a real browser | see Not Tested (reviewer did not request; hint wording cosmetic) |
| Process / lifecycle | Yes | restore-time activation of a switched run | unit | built-server stop/restore/activate | built-server journey |
| Persisted-data transition | Yes | `pendingRuntimeSwitch` in `run_metadata.json`; journal manifest `runtime_kind` per file | unit | read-back of real files; unswitched run unchanged | journey + byte-identity |
| Distributed / external | Indirect | real runtimes | the implementer's live run | repeat | rerun gated live suite if budget allows |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`; TypeScript pnpm monorepo, vitest; web `autobyteus-web` (Nuxt, graphql-codegen).
- Testing guideline: `TESTING.md` (root); no closer `TESTING*.md`. `AGENTS.md`, `DESIGN.md`.
- Rules applied: built output proof needs a current build of this worktree: `pnpm -C autobyteus-server-ts build` at `60c3ac4ec8` (exit 0, `/tmp/cross-runtime-resume-build.log`) before every case that starts `dist/app.js`; one heavy run at a time; clean env (`env -i`) for E2E; every failure has a cause (Rule 9); live runs gated and use the real HOME/USER/LOGNAME; migrations/upgrades on synthesized data only; build outputs untracked, stage explicit paths.
- Conflicts: none found.
- Secrets: none for the deterministic cases; the gated live suite uses the signed-in `claude` and `codex` CLIs.

| Instruction | Learned |
| --- | --- |
| `tests/e2e/runtime/runtime-switch-live.e2e.test.ts` (header) | pattern for the switch journey and the invariants asserted (I-3, I-5, I-7, I-8, per-file journal runtimes) |
| `tests/e2e/shutdown/native-standalone-host-fixture.mjs` | pattern for a native run with a **scripted model**: a local HTTP server answering LM Studio's model list and chat completions, `LMSTUDIO_HOSTS=<origin>` |
| `tests/e2e/app-data-migrations/*-startup.e2e.test.ts` (343) | pattern for spawning `dist/app.js` on a synthesized root |
| `tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` | scripted AGY `linked_skills`: `CALL_TOOL:{…}` delegates for real; stopping a copy; `updateDelegatedLaunchSelections` with `configuredPatches` |
| `autobyteus-web/codegen.ts` | schema from `BACKEND_GRAPHQL_BASE_URL`, `pnpm -C autobyteus-web codegen` |

| Component | Setup | Readiness | Cleanup |
| --- | --- | --- | --- |
| Built server `dist/app.js` as a child process | `--data-dir <temp> --port 0`, private HOME/DATABASE_URL, `LMSTUDIO_HOSTS`, `ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE=linked_skills` | `Server listening at …` | SIGTERM, temp removed |
| Fake LM Studio endpoint (test-owned HTTP server) | in the test process, ephemeral port | model list answers | closed by the test |
| Scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` | env | `--version` | processes end with the server |

## Persisted Data Transition Coverage Basis

- Approved decision: no migration (optional metadata field; a journal manifest entry without a per-file runtime is dropped and re-rendered).
- Representative existing data: a run folder as the previous release wrote it (`run_metadata.json` without `pendingRuntimeSwitch`; a journal manifest without per-file `runtime_kind`), plus never-switched runs with archived segments.
- Evidence planned: a run created with the new build is switched and undone without the field lingering; a never-switched run with archived segments renders byte-identically to the single-runtime rendering; an old-format journal manifest is re-rendered, not mis-read.
- Ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| unit: `standalone-stopped-run-selection-updater`, `agent-run-runtime-switch-commit`, `runtime-switch-recorder`, lifecycle `activateSwitched`, `runtime-handover-notices/*`, `standalone-runtime-switch-first-message`, `agent-work-journal/*`, `memory-run-discovery`, GraphQL `agent-run` | each part, mocks at the neighbours | Still Valid | reuse IMP evidence; rerun the changed ones as base |
| `tests/e2e/runtime/runtime-switch-live.e2e.test.ts` (gated, live) | Claude → Codex → scripted AGY | Still Valid | rerun once if budget allows |
| `tests/e2e/runtime/stopped-run-model-config-graphql.e2e.test.ts` (updated by the ticket) | stopped-run edit over GraphQL | Still Valid | run |
| `tests/e2e/.../anthropic-stored-config-edit-launch.e2e.test.ts` (updated) | stored config edit launch | Still Valid | run |
| `tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` (gated AGY) | delegated copies' model change; uses the renamed contract | Still Valid | run (guards the rename on delegated roots) |
| `tests/e2e/memory/*`, `tests/e2e/run-history/*` | memory view, projection, journals | Still Valid | run the memory folder |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…009 | unit suites of the changed parts | Reused | IMP evidence (clean clone: 890 files / 7582 tests; web 4871); `git diff --name-only 3521ae05f1 HEAD -- autobyteus-server-ts autobyteus-web autobyteus-ts` expected empty | rerun-by-impact |
| API-02 | AC-001, AC-002, AC-009; I-3, I-5, I-7, I-8; REQ-002/010/011; native pair | built server, scripted native model + scripted AGY: native → AGY → native, first message, once | Durable | new `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (case 1) | the reviewer's pair |
| API-03 | AC-001; REQ-001/013 | same server: save, undo (session ID returns, field cleared), switch again, model-only edit with a switch pending, running run refused, delegated copy rejected | Durable | same file (case 2) | settings through the built server |
| API-04 | design Change Scope; REQ-001 | same server: host with a delegated copy saves its own runtime and the copy's model in one Save; the copy keeps its runtime | Durable | same file (case 3) | combined Save |
| API-05 | AC-006, REQ-012 | never-switched runs (five runtimes) with archived segments: journal text byte-identical to the single-runtime rendering; contrast with a null-recorded segment | Durable | new `tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts` | the byte-identity spot check |
| API-06 | engineering contract | regenerate `autobyteus-web/generated/graphql.ts` against the built server; commit any diff; `typecheck`/specs of the web client | Journey | `BACKEND_GRAPHQL_BASE_URL=<built server> pnpm -C autobyteus-web codegen` | hand-edited file |
| API-07 | preserved | updated e2e suites and the delegated-copy suite with the rename | Existing Test | `pnpm exec vitest run tests/e2e/runtime/stopped-run-model-config-graphql.e2e.test.ts …` (env -i); AGY-gated with `RUN_AGY_FAILURE_E2E=1` | rename guard |
| API-08 | AC-008 | gated live suite Claude → Codex → scripted AGY | Journey (live) | `RUN_RUNTIME_SWITCH_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 … runtime-switch-live` | repeat on the final commit if budget allows; otherwise cite the implementer's run |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-02…04 | `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` | no other test switches to/from the native runtime, nor exercises the settings flow on the built server |
| API-05 | `autobyteus-server-ts/tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts` | pins "journals of runs that never switched are unchanged" (REQ-012) against the real service |

## Durable Coverage To Update / Remove

None planned.

## Desktop Application Validation Plan

The reviewer did not request a UI run; the web specs cover the component and store (4871). A rendered Settings page was not exercised here; recorded in Not Tested.

## Live Environment And Fixture Plan

- Order: build (done) → API-01 check → API-02…04 → API-05 → API-06 → API-07 → API-08.
- Fixtures: synthesized runs only; the fake LM Studio and scripted AGY are test-owned.
- Evidence: vitest logs (`evidence/api-e2e/API-*.log`), the run folders' key files (manifest, metadata, markers) for the native pair, the codegen diff.
- Owned state: child server process, fake model server, temp roots, a throwaway HOME.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The rendered Settings page, the chat marker in a real browser/desktop | not requested; web specs cover it | cosmetic/regression in layout | Yes (his own use) | listed for delivery |
| Native runtime on a real model | a scripted model proves the record layout and ordering, not provider behavior | the native runtime with a real provider writes records the script does not | No | the implementer's live suite does not include native; a later live native run if wanted |
| Teams, Org members, switches started by agents/Router | out of scope (FU-003, FU-004) | — | — | — |

## Ambiguities Or Reroute Triggers

None found yet. Cosmetic: the settings hint shows "changes with your next message" when the original runtime is picked to undo (C-4, not scored). FU-009 pre-existing.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; durable coverage added: `Yes`; reroute before execution: `No`.
