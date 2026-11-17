# Implementation Handoff: follow-ups-of-461-500 (delivery 1 + 2)

Status: **IN PROGRESS (IR-001 draft).** Written early so the state is durable. G-5, FU-035 step 0 and the docs step are
still open (see "Not done yet").

## Upstream Artifact Package

- Upstream review: ARCH-REV-005 Pass (SR-012, `9d119380dc`; G-5 added to ARCH-REV-003's package), Large / High. Handoff
  rule for Large / High: the code reviewer.
- Requirements doc: `tickets/in-progress/follow-ups-of-461-500/requirements-doc.md` (REQ-001 … REQ-016; REQ-003 dropped)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001 … SR-012)
- Design spec: `design-spec.md` (delivery 1 at SR-006/SR-008, delivery 2 G-1 … G-4, G-5 at SR-011/SR-012)
- Supplemental: `source-follow-ups-461.md`, `follow-ups.md`
- Design review report: `design-review-report.md` (Rounds 1–5, the reviewer's, uncommitted in the worktree)
- Architecture review revision record: `architecture-review-revision-record.md` (the reviewer's)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-006 … SR-012
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-003, ARCH-REV-005
- Related code-review / API/E2E / delivery revision IDs: `N/A`
- Branch `codex/follow-ups-of-461-500`, rebased on `origin/personal` `d8dbeaa9ba` (autobyteus-508 merged).

Commits (oldest first), by the design's Change Sequence:

| Step | Commit | What |
| --- | --- | --- |
| 1 | `75ee688dad` | Names (N2, N3, N5, SR-008 additions): a standalone run's agent, delegated run, `RunAgent*`, `TASK_DELEGATED_RUN_NOT_ASSIGNABLE`, GraphQL `runId`, `execution_tree.agent`, web delegated-run rows |
| 2 | `377e4bd319` | FU-036: one attach function for the four run streams; early messages get `SESSION_NOT_READY`; early close ends the late session |
| 3 | `6107590026` | FU-011 / FU-018: hosts pass their owners (channel, discovery, remote services, command coordinator, Task service); required collaborators; explicit "off" / "not eligible" values |
| 4 | `36b190e490` | FU-013: the team total asks for team runs only |
| 3-4 fix | `cc…` (see `git log`) | owner checks ordered after the complete-input check; tests follow; baseline 1012 → 1010 |
| 5a | `51ec3b3469` | FU-020 removal: the host-scoped owner kind, its route, `DelegatedChildLocations`; N6 dead code removed |
| 5b | migration commit + classification test | `20261117_delegated_run_own_attachment_links` and its follow-up; M-7 classification test |
| 6 | `e2b6928c9e`, `95bdf2af0f` | FU-030: the five collected refusals (DLP-003/004/005, SIR-001, DCP-004); a delegation refusal's next step kept apart from its reason |
| 7 | `18f9b0c038`, `fb52bd332c` | FU-022, FU-023 (FU-016 already shipped in 461); FU-021 rewrite (not proven, see Known Risks) |
| G-1 | `d4b632e61b` | the release records the migration order; order test reads the file |
| G-3 | `310ba45351` | SIR-002's session names the server helper run |
| G-2 | `63fa6cf978` | same-ID repair of `20260521_team_run_history_index_v2` |

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design-spec "Task Size And Architectural Risk", "Delivery 2 classification").
- Classification confirmed: `Confirmed` (persisted-data migration, public contract changes, composition rewiring in two hosts).
- Selected route: `Code Review`.
- New design impact: **FU-021** (see Known Risks): the evidence suggests watcher events are lost under load, not only late;
  the design's cause covers late events. Raised to the Solution Designer as `Design Impact` for FU-021 only.

## Reviewed Behavior Implementation Trace

| Behavior ID | Change / Preserved Outcome | Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| B-1 | New attachments name the run's own owner (preserved); host kind removed | web `useComposerTarget` unchanged; server `context-file-owner-types.ts` | Done (5a) |
| B-2 | Old attachments open through the run's own link after the migration | migration M-2 targets = `buildFinalContextFileLocator` output; `context-file-owner-resolver.ts` | Done; live resolve left to API/E2E |
| B-3 / B-4 | Migration with backup; follow-up after `20261017_task_agent_own_run_v1` | `migrations/delegated-run-own-attachment-links/` | Done (5b) |
| B-5 | `SESSION_NOT_READY` on org and collaboration streams | `api/websocket/agent.ts` `attachRunStream` | Done (2); AC-006 test `run-stream-not-ready.integration.test.ts` |
| B-6 | Task closure stop explicit per host | `AgentRunService.standaloneRuns` required; `APPLICATION_HOST_STANDALONE_RUNS` | Done (3) |
| B-7 | Discovery tools: off refusal from an explicit value | `REMOTE_COLLABORATION_OFF_DISCOVERY`; `PeerDiscoveryAccess` to MCP providers and native tools | Done (3) |
| B-8 | Team total asks the team kind | `token-usage-stats.ts` | Done (4) |
| B-9 | Refusal texts FR-1 … FR-4 | see "FU-030 texts" | Done for the five collected cases (6) |
| B-10 | Grok refused tool call | — | **Not done yet** (FU-035 step 0) |

- Changes stayed within the Scope Guardrail: `Yes`.

## FU-030 texts (old → new; codes and outcomes unchanged)

| Case | Old | New |
| --- | --- | --- |
| DLP-005 | "{A} cannot be delegated to: '{m}' is not offered by {R} now. Refresh the model list and choose again." | "{A} can't be delegated to: its default model cannot be used: '{m}' is no longer offered by {R}. Choose another model for {A} in its settings, or delegate to another agent." |
| DLP-003 note | "{A}: its agent default {R} / {m} could not be used ('{m}' is not offered by {R} now. Refresh …); it runs on {T} ({origin})." | "{A}: '{m}' is no longer offered by {R}, so it runs on {T} ({origin}). Choose another model in {A}'s settings to change it." |
| DLP-004 Settings row | "… was not used: '{m}' is not offered by {R} now. Refresh the model list and choose again." | "… was not used: '{m}' is no longer offered by {R}." (the row shows what runs instead) |
| SIR-001 | "You can't message this agent: it works on a different Task." | "You can't message {run}: it isn't part of your Task. Only runs that work on the same Task can message each other by run id." |
| DCP-004 | "{name} is running. Stop it, then save again." | "{name} is running, so its settings can't be saved now. Stop it, then save again." |
| 4004 close (web) | "This run cannot host delegated copies." | "This run has no delegation view: it is application- or system-owned, so it cannot delegate." |
| `launchBase` | "This run cannot host delegated copies." | "This run cannot delegate: it is application- or system-owned." |

A peer's refusal keeps the peer's reason only ("its default model cannot be used: …, and Model Routing is off on node …"):
the next step names the peer's settings, so `CollaboratorAddError.nextStep` is added only by this node's own refusals.

Not reworded this round (reviewed, already FR-1 … FR-4 or out of the collected list): the other `send_message_to` /
`delegate_task` results in `cross-run-message-delivery.ts`, `remote-refusal-codes.ts`, `collaborator-errors.ts` (their
texts already say what happened and what to do, checked by `refusal-texts-vocabulary.test.ts` and `result-catalogue.test.ts`).
The Save refusal (`run-model-selection-refusal.ts`, "Refresh the model list and choose again. Saved settings were not
changed.") is kept: in the Settings it already names the next step.

## Not done yet (this round continues)

- **G-5** (REQ-016, AC-012): stored model not offered: `storedModelOffer`, `RUN_MODEL_NOT_OFFERED`, both start paths, web per-member note.
- **FU-035 step 0**: live `grok_build` reproduction (vault, Grok waiver rule), then branch A or B.
- **Docs step 9**: `GLOSSARY.md` (with the "Known leftovers" list: FU-500-01, FU-500-04, FU-500-05), `collaboration_model.md`,
  module docs (`context_files`, `token_usage`), `data_migration_guideline.md` §10 lesson line.
- `RELEASE.md` "Cutting The Release" line for G-1 is the Delivery Engineer's.

## Key decisions taken in implementation (deviations, with reasons)

- **Discovery reaches the native autobyteus tools too** (the design named the MCP providers): the same silent lookup
  served `list-peer-nodes-tool.ts` / `list-available-agents-tool.ts`; both now take the host's `PeerDiscoveryAccess`.
- **Late binding in the studio:** remote collaboration is composed after the run services and the MCP host, so the studio
  passes `() => remote().client` / `() => remote().discovery` over a composition-owned binding that throws if used
  before composition (no process-wide lookup). The application host passes `() => null` / the off discovery.
- **The MCP catalog and executor singletons are removed:** with the discovery required, a default catalog would be the
  same silent "off". The host passes its providers.
- **`execution_tree.host` → `execution_tree.agent`** in the stream contracts (N2 for the run's agent); the 461 base-shape
  test maps the renamed key explicitly.
- **N3 visible wording kept:** "Delegated copy", "Stop this copy …", "Select a copy …", "Host run" are normative UI copy
  (run-settings UI/UX spec); only their i18n keys of the delegated-run concept were renamed. Follow-up candidate.
- **The migration's pre-check marker** is `/agent-collaborations/` (not `"/rest/agent-collaborations/`), so draft and
  absolute-URL forms are reported as warnings; strings without `/context-files/` (the kept references route) are not links.
- **G-1 recorder runs through vitest** (`tests/release/record-released-migration-order.test.ts`, skipped unless
  `RECORD_RELEASED_MIGRATION_ORDER=1`): the workspace has no TypeScript script runner; adding `tsx` re-resolved
  vite/vitest/nuxt peers across the lockfile, a release risk (rule 12). The step runs in `release` and `beta`.
- **G-2** lives in `existing-team-row-repair.ts`: the migration file was over 500 lines; it now shrinks to 504.

## Known Risks

- **FU-021 not proven (Design Impact):** with the outcome-based test, 7 and 9 of 14 cases still time out at the 60 s
  guard on this machine (load 55–70 / 10 cores); in a diagnostic run with a 180 s guard, a sentinel write in a watched
  root produced no event for over 3 minutes (IMP-008). Events may be lost, not only late.
- **M-6 cold:** not strictly cold (no sudo for `purge`); IMP-005 has a first pass of 13.0 s and a warm one of 10.5 s.
- E2E tests and probes touched for text changes were not run by me (API/E2E): `delegated-launch-config-defaults.e2e`,
  `collaboration-prompt-wording.e2e`, `agent-initiated-collaborators.e2e`, `delegated-launch-defaults-probe.mjs`,
  `composer-context-file-removal-probe.mjs`, `skill-improvement-removal-cases.mjs`, and the contract fixture
  `contract-states.json` (whether the story binder maps the run id inside the refusal text).

## Persisted Data Transition Check

- Decision: `Migration Required` (FU-020, D-8) — implemented in the isolated migration folder; frozen helpers only; no
  old-shape reader in current code. Backup per file before rewrite (founder's rule). **Not run on the founder's data**
  (only the read-only M-6 scan).
- G-2: same-ID repair of a released migration (guideline §7), frozen store only.
- Browser storage check (Naming): `'transient_execution'` is not persisted (only fixed localStorage keys; the mobile route
  holds a server row key) — no client migration.
- N6: nothing writes or reads `agents/{run}/collaboration/` in current code; removed (FU-500-03 closes as not needed).

## Checks Run

| Check ID | Command | Commit | Code | Result | Evidence / Look For |
| --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm typecheck` (server) | `63fa6cf978` | server src + tests | Pass | "test-file errors: 1010 in 316 files (baseline 1010 in 316 files)" |
| IMP-02 | `pnpm typecheck` (web, fresh `.nuxt`) | `18f9b0c038` | web | Pass | IMP-006: "production errors: 0; test-file errors: 87 in 37 files" |
| IMP-03 | server unit suite (`vitest run tests/unit tests/agent-work-journal`) | step 3 state | all server units | Pass except folder-watcher timing flakes | 6833 passed; failures only in `*-folder-watcher.test.ts` (load ~70) |
| IMP-04 | web unit suite (`vitest run`) | step 1 | all web units | Pass | "755 passed (755)", "5676 passed" |
| IMP-05 | M-6 read-only scan | branch head 10:01 | migration folder listing + pre-check | Done | IMP-005 |
| IMP-07 | `pnpm migrations:record-released` with a reordered record | `d4b632e61b` | G-1 recorder | refuses, exit 1, nothing written | IMP-007 |
| IMP-08 | watcher integration test | `fb52bd332c` | FU-021 | Fail (see Known Risks) | IMP-008 logs |
| IMP-09 | `python3 -m unittest discover -s scripts/tests` | `d4b632e61b` | release scripts | Pass | "Ran 228 tests … OK (skipped=3)" |
| IMP-10 | focused vitest runs per step (stream not-ready, migration, team index repair, compositions, collaboration texts) | each step | as named | Pass | `run-stream-not-ready` 9/9; attachment-links 8/8; team-index 4/4 |

## Frontend Rendered-Result Check

Not run yet: the web changes are names (no visual change), the attachment model's removed routes, and two texts. G-5's
per-member note is the rendered change still to come.
