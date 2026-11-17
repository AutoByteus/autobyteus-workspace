# Implementation Handoff: follow-ups-of-461-500 (delivery 1 + 2)

Status: **IR-001 ready for source review**, with the two items decided at SR-014 (ARCH-REV-007 Pass):
- **FU-035 step 0 (REQ-010, AC-007), D-14:** not in this round. It runs as IR-002 once Grok's 24-hour usage window
  resets, with branch A or B and its own code review. Nothing is waived; FU-035 stays open.
- **FU-021 (REQ-008, AC-005), D-13b:** done. A hang guard whose probe got nothing is ENVIRONMENT; one whose probe got
  its event is INCONCLUSIVE, never a product failure. AC-005's proof is the API/E2E engineer's: 5 of 5 on Linux
  inotify (Docker from the worktree), and a quiet macOS when available.

## Upstream Artifact Package

- Upstream review:
  - ARCH-REV-003 Pass, the combined package.
  - ARCH-REV-005 Pass, G-5 (SR-011 / SR-012).
  - ARCH-REV-006 Pass, the FU-021 probe (SR-013 / D-13).
  - ARCH-REV-007 Pass, SR-014 (D-13b labels, D-14 FU-035 sequencing).
  - Large / High. The handoff rule for Large / High is the code reviewer.
- Requirements doc: `tickets/in-progress/follow-ups-of-461-500/requirements-doc.md`. It covers REQ-001 … REQ-016:
  - REQ-003 and REQ-015 were dropped by the user;
  - status Approved (SR-014).
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001 … SR-014)
- Design spec: `design-spec.md`:
  - delivery 1 at SR-006 / SR-008;
  - delivery 2 at G-1 … G-4;
  - G-5 at SR-011 / SR-012;
  - FU-021's environment probe at SR-013, its labels at SR-014.
- Supplemental: `source-follow-ups-461.md`, `follow-ups.md` (FU-500-01 … FU-500-07)
- Design review report and architecture review revision record: `design-review-report.md` and
  `architecture-review-revision-record.md`. Both are the reviewer's, uncommitted in the worktree; I left them as they are.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-006 … SR-014
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006, ARCH-REV-007
- Related code-review / API/E2E / delivery revision IDs: `N/A`
- Branch: `codex/follow-ups-of-461-500` on `d8dbeaa9ba` (autobyteus-508 merged). `origin/personal` has since moved
  8 commits (the beta.8 release records); the Delivery Engineer refreshes the base.

Commits, oldest first, by the design's Change Sequence:

| Step | Commit | What |
| --- | --- | --- |
| 1 | `75ee688dad` | Names (N2, N3, N5, SR-008 additions): a standalone run's agent, delegated run, `RunAgent*`, `TASK_DELEGATED_RUN_NOT_ASSIGNABLE`, GraphQL `runId`, `execution_tree.agent`, web delegated-run rows |
| 2 | `377e4bd319` | FU-036: one attach function for the four run streams; early messages get `SESSION_NOT_READY`; early close ends the late session |
| 3 | `6107590026` | FU-011 / FU-018: hosts pass their owners (channel, discovery, remote services, command coordinator, Task service); required collaborators; explicit "off" / "not eligible" values |
| 4 | `36b190e490` | FU-013: the team total asks for team runs only |
| 3-4 fix | `d4e36d4831` | owner checks ordered after the complete-input check; tests follow FU-011, FU-013, FU-020 |
| 5a | `51ec3b3469` | FU-020 removal: the host-scoped owner kind, its route, `DelegatedChildLocations`; N6 dead code removed |
| 5b | `a954ae5300`, `461ae7e472` | `20261117_delegated_run_own_attachment_links` and its follow-up after `20261017_task_agent_own_run_v1`; M-7 classification test |
| 6 | `e2b6928c9e`, `95bdf2af0f` | FU-030: the five collected refusals (DLP-003/004/005, SIR-001, DCP-004); a delegation refusal's next step kept apart from its reason |
| 7 | `18f9b0c038` | FU-022 (runtime-names test), FU-023 (Nuxt ignore). FU-016 had already shipped in 461 |
| 7 / FU-021 | `fb52bd332c`, `4277f1945e`, `a4e7f18e6d` | the watcher test asserts outcomes; the SR-013 environment probe; a per-test 60 s guard; named waits; the sentinel's delete is awaited; SR-014's ENVIRONMENT / INCONCLUSIVE labels |
| G-1 | `d4b632e61b` | the release records the migration order; the order test reads the file |
| G-3 | `310ba45351` | SIR-002's session names the server helper run |
| G-2 | `63fa6cf978` | same-ID repair of `20260521_team_run_history_index_v2` |
| G-5 | `8e2d3b76c0` | stored model not offered: `storedModelOffer`, `RUN_MODEL_NOT_OFFERED`, both start paths, web per-member note |
| 9 | `6b4ee1f128` | docs: glossary (Code Names, Known leftovers), collaboration model, module docs, guideline §10 lesson line |
| size | `1eed3c4aff` | `build-studio-server.ts` 511 → 498 and `configured-agent-execution-handle.ts` 507 → 500 (see Legacy / size check) |
| G-5 fix | `d8ffc77c8b` | the 8 s model-list budget is `MODEL_LIST_READ_MS` in `read-deadline.ts`; `llm-management` no longer imports `available-agent-runtimes` (found by the full unit run) |
| 8 | evidence only | FU-035 step 0: blocked by the Grok usage limit (IMP-011); IR-002 per D-14 |

## Routing Classification (Mandatory)

- Task size: `Large`. Architecture risk: `High` (design-spec "Task Size And Architectural Risk", "Delivery 2 classification").
- Classification: `Confirmed`. Reasons: a persisted-data migration, public contract changes (GraphQL `runId`,
  `execution_tree.agent`, `RUN_MODEL_NOT_OFFERED`), and composition rewiring in two hosts.
- Selected route: `Code Review`.
- New design impact: `None` open. FU-021's classification was raised and decided at SR-014 (D-13b); FU-035's
  sequencing at D-14.

## Reviewed Behavior Implementation Trace

| Behavior ID | Change / Preserved Outcome | Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| B-1 | New attachments name the run's own owner (preserved); host kind removed | web `useComposerTarget` unchanged; server `context-file-owner-types.ts` | Done (5a) |
| B-2 | Old attachments open through the run's own link after the migration | migration targets = `buildFinalContextFileLocator` output; `context-file-owner-resolver.ts` | Done; live resolve left to API/E2E |
| B-3 / B-4 | Migration with backup; follow-up after `20261017_task_agent_own_run_v1` | `app-data-migrations/migrations/delegated-run-own-attachment-links/` | Done (5b) |
| B-5 | `SESSION_NOT_READY` on org and collaboration streams | `api/websocket/agent.ts` `attachRunStream` | Done (2); AC-006 test `run-stream-not-ready.integration.test.ts` |
| B-6 | Task closure stop explicit per host | `AgentRunService.standaloneRuns` required; `APPLICATION_HOST_STANDALONE_RUNS` | Done (3) |
| B-7 | Discovery tools: off refusal from an explicit value | `REMOTE_COLLABORATION_OFF_DISCOVERY`; `PeerDiscoveryAccess` to MCP providers and native tools | Done (3) |
| B-8 | Team total asks the team kind | `api/graphql/types/token-usage-stats.ts` | Done (4) |
| B-9 | Refusal texts FR-1 … FR-4 | see "FU-030 texts" | Done for the five collected cases (6) |
| B-10 | Grok refused tool call | — | **Not in IR-001** (D-14): step 0 blocked by the Grok usage limit (IMP-011); IR-002 |
| G-1 | The release records the migration order | `scripts/desktop-release.sh` → `pnpm migrations:record-released`; `released-migration-order.json` | Done |
| G-2 | A late team index v2 keeps every team run with a current tree | `team-run-history-index-v2/existing-team-row-repair.ts` | Done |
| G-3 | SIR-002's session names the server helper run | `skill-improvement-removal-cases.mjs` | Done |
| G-5 | A stored model that is no longer offered is refused at start; Settings marks the member | `run-model-selection-service.ts` `storedModelOffer`; `run-model-selection-refusal.ts` `storedModelStartRefusal`; `standalone-agent-run-lifecycle-service.ts` `restoreStarted`; `configured-agent-execution-handle.ts` `prepareActivation`; web `ExistingRunConfigEditor.vue` → `RunMemberRow` | Done; rendered check limited (see Frontend) |
| FU-021 | The watcher test asserts outcomes; ENVIRONMENT or INCONCLUSIVE at a hang guard, never a product failure | `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Done (IMP-012, IMP-013); AC-005's proof is API/E2E's (Linux 5 of 5) |

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
| G-5 (new) | an opaque runtime error | "{agent} can't start: its saved model '{m}' is not offered by {R} now. Stop it, then choose a runtime and model for {agent} in Settings." (`RUN_MODEL_NOT_OFFERED`) |

A peer's refusal keeps only the peer's reason ("its default model cannot be used: …, and Model Routing is off on node …").
Its next step names the peer's settings, so `CollaboratorAddError.nextStep` is added only by this node's own refusals.

Not reworded this round: the other `send_message_to` / `delegate_task` results, in:
- `cross-run-message-delivery.ts`;
- `remote-refusal-codes.ts`;
- `collaborator-errors.ts`.

I reviewed them: their texts already say what happened and what to do, which `refusal-texts-vocabulary.test.ts` and
`result-catalogue.test.ts` check. The Save refusal (`run-model-selection-refusal.ts`, "Refresh the model list and choose
again. Saved settings were not changed.") is kept, because in the Settings it already names the next step.

## The two items decided at SR-014

### FU-035 step 0: blocked by the Grok usage limit (REQ-010, AC-007), IR-002 per D-14

- **Probe:** a throwaway live probe, kept as evidence (IMP-011): a real Studio server and the host's `grok` 1.0.88 with
  `grok-4.7`. It records three things:
  - the executor's MCP result;
  - each raw ACP tool-call snapshot, with its projection;
  - the model's verbatim account of the tool's text.

  The case is a standalone Grok agent calling `send_message_to` with an unreachable `target_agent_run_id`.
- **Attempts:**
  - **11:49 and 11:56:** model discovery timed out 5 of 5 times. The CLI's ACP `initialize` gave no answer in 40 s at
    load about 146.
  - **12:16:** the turn reached Grok and was refused before any tool call: `ACP_PROMPT_FAILED` "Rate limited: API error
    (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for
    model grok-4.7 for now. Usage resets over a rolling 24-hour window — tokens (actual/limit): 609708/600000".
- **What this means:** no executor result, snapshot or model reply exists yet, so neither branch A nor branch B can be
  chosen. Per the founder's Grok rule, only his own words waive a Grok case that fails on a usage limit. I waived
  nothing and changed no product code for FU-035.
- **D-14:** step 0 runs after the window resets, as IR-002, with branch A or B and its own code review. The probe is
  ready, and the run takes about 2 minutes.

### FU-021: the labels (REQ-008, AC-005), D-13b

- **Built as reviewed** (`4277f1945e`). At a hang guard, a raw `fs.watch` probe runs: a fresh temp dir, one write,
  10 s. No event gives "ENVIRONMENT: …"; an event keeps the product message. There are no retries, no skips and no
  longer waits, and the watcher code is unchanged.
- **Corrections in the test, to keep the classification truthful.** The first loaded run showed 2 test defects and 1
  unlabelled timeout:
  - **One 60 s guard per test, shared by its waits:** two waits in sequence had reached the 90 s test timeout before
    the probe could label the failure.
  - **Named waits:** each wait names the change it expects (`isAddOf(name)`). One wait had taken the sentinel's ADD as
    `main.ts`'s.
  - **The sentinel's delete is awaited:** a late DELETE of the previous sentinel reached the next subscriber and was
    reported as an ignored path's change.
  - **Fixed deadlines removed:** the 4 s and 12 s deadlines are gone.
- **Result** (IMP-012). Three runs at ambient load 67–118: 18 of 42 cases fail, all at the guard:

  | Run | Failed | ENVIRONMENT | Product label | Assertions or timeouts |
  | --- | --- | --- | --- | --- |
  | 1 | 5 of 14 | 1 | 4 | 0 |
  | 2 | 6 of 14 | 3 | 3 | 0 |
  | 3 | 7 of 14 | 2 | 5 | 0 |

  All 12 product-labelled failures saw no change at all from the watcher (`changes before the guard: []`). The
  `__pycache__` case alone, right after, passed 1 of 3, so it fails intermittently, not deterministically.
- **Why the label changed (D-13b):** the investigation ("FU-021, continued") shows raw `fs.watch` itself missing
  events on 2 of 8 fresh streams at this load. So the probe's fresh stream getting its event does not show that the
  watcher's stream got its own.
- **SR-014 implementation** (`a4e7f18e6d`): when the probe gets its event, the case fails with "INCONCLUSIVE: the
  watcher saw no change; a fresh fs.watch stream did. Under load the OS can drop one stream's events (FU-500-06); rerun
  where the OS delivers events." The ENVIRONMENT message is unchanged. The case's diagnostics ("Changes before the
  guard: …") follow on a new line. It still fails: no skip, no retry.
- **One run after the change** (IMP-013, load 120–190): 7 of 14 failed, 1 ENVIRONMENT and 6 INCONCLUSIVE, with no other
  failure. Loaded-macOS runs are evidence only.
- **The proof is API/E2E's** (D-13b): 5 of 5 on Linux inotify, in a Docker container from the worktree after
  `pnpm test:integration:prepare`, and on a quiet macOS when one is available. This machine was never quiet (load average
  67–200 from other worktrees' suites, `fseventsd` at about 150% CPU). Note: `design-spec.md` "To prove it" (lines
  469–471) still says a loaded run "fails only with ENVIRONMENT cases"; D-13b (ENVIRONMENT or INCONCLUSIVE) and AC-005
  govern, and the Solution Designer is aligning the text.

## Key decisions taken in implementation (deviations, with reasons)

- **Discovery reaches the native autobyteus tools too** (the design named the MCP providers). The same silent lookup
  served `list-peer-nodes-tool.ts` / `list-available-agents-tool.ts`; both now take the host's `PeerDiscoveryAccess`.
- **Late binding in the studio:** remote collaboration is composed after the run services and the MCP host.
  - The studio passes `remote.channel` / `remote.discovery` from `createLateRemoteCollaborationBinding()`
    (`remote-collaboration-composition.ts`, `1eed3c4aff`). It throws if used before `bind`; there is no process-wide
    lookup.
  - The application host passes `() => null` / the off discovery.
- **The MCP catalog and executor singletons are removed.** With the discovery required, a default catalog would be the
  same silent "off", so the host passes its providers.
- **`execution_tree.host` → `execution_tree.agent`** in the stream contracts (N2, for the run's agent). The 461
  base-shape test maps the renamed key explicitly.
- **N3 visible wording kept:** "Delegated copy", "Stop this copy …", "Select a copy …" and "Host run" are normative UI
  copy (the run-settings UI/UX spec). Only their i18n keys were renamed. Recorded as **FU-500-07**.
- **The migration's pre-check marker** is `/agent-collaborations/` (not `"/rest/agent-collaborations/`), so draft and
  absolute-URL forms are reported as warnings. Strings without `/context-files/` (the kept references route) are not
  links.
- **The G-1 recorder runs through vitest** (`tests/release/record-released-migration-order.test.ts`, skipped unless
  `RECORD_RELEASED_MIGRATION_ORDER=1`).
  - Why: the workspace has no TypeScript script runner, and adding `tsx` re-resolved vite/vitest/nuxt peers across the
    lockfile, a release risk (rule 12).
  - The step runs in `release` and `beta`.
  - The `RELEASE.md` "Cutting The Release" line for it is the Delivery Engineer's.
- **G-2 lives in `existing-team-row-repair.ts`.** The migration file stays under 500 lines (470 effective lines).
- **G-5's budget constant:** the 8 s model-list budget moved to `MODEL_LIST_READ_MS` (`runtime-management/read-deadline.ts`).
  It keeps the dependency direction of SR-007 decision 5, and the runtimes report uses the same constant.
- **G-5, one refusal helper:** both start paths ask `storedModelStartRefusal(storedModels, …)`:
  - the standalone restore throws `AgentRunActivationError(RUN_MODEL_NOT_OFFERED, …)`;
  - the member's `prepareActivation` throws `StoredModelNotOfferedError`.
- **FU-021 test corrections** beyond the reviewed probe (above): a per-test guard, named waits, the awaited sentinel
  delete. They are test-only, with the same 60 s ceiling, and kept at SR-014.

## Known Risks

- **FU-035** stays open until a live run shows the cause (IR-002).
- **FU-021:** the watcher test still fails on a loaded macOS, now as ENVIRONMENT or INCONCLUSIVE. Whether it passes
  where the OS delivers events is API/E2E's Linux proof.
- **M-6 cold:** not strictly cold, because there is no sudo for `purge`. IMP-005 has a first pass of 13.0 s and a warm
  one of 10.5 s over 7523 files / 8.67 GB.
- **E2E tests and probes touched for text changes, not run by me** (API/E2E):
  - `delegated-launch-config-defaults.e2e` and `collaboration-prompt-wording.e2e`;
  - `agent-initiated-collaborators.e2e`;
  - `delegated-launch-defaults-probe.mjs`, `composer-context-file-removal-probe.mjs` and
    `skill-improvement-removal-cases.mjs`;
  - the contract fixture `contract-states.json`, including whether the story binder maps the run id inside the refusal
    text.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: clean-cut renames and removal of hosting-era behavior; explicit composition; one migration.
- Reviewed root-cause classification: as in the design spec (naming drift; silent process lookups; FU-021 OS event loss per SR-013).
- Reviewed refactor decision: `Refactor Needed Now` for the composition owners (FU-011 / FU-018). Other owners are
  deferred as FU-500-02.
- Implementation matched the reviewed assessment: `Yes`. FU-021's classification premise was challenged and revised at SR-014.
- If challenged, routed as `Design Impact`: `Yes` (FU-021 → SR-014 / D-13b).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The old attachment link shape is converted by the isolated
  migration only, with no old-shape reader in current code.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes`. That covers the N6 collaboration-directory helpers, the
  host-scoped owner kind and route, `DelegatedChildLocations`, the MCP catalog / executor singletons, and the
  `findProcessRemoteRunChannel` users.
- Dead code found elsewhere, added to `follow-ups.md`: None new. FU-500-02 (remaining throwing process getters) was the
  designer's.
- Shared structures remain tight: `Yes`.
- Canonical shared design guidance reapplied: `Yes`.
- Deviations from a design principle: `None`.
- Source files and the 500-line limit: `Yes`. Against the merge base `9695d310c5`, no changed source file is over 500
  effective non-empty lines.
  - `build-studio-server.ts` had gone to 511 and `configured-agent-execution-handle.ts` to 507. They are now 498 and 500
    (`1eed3c4aff`).
  - No change grew a file that was already over 500.

## Persisted Data Transition Check

- Decision: `Migration Required` (FU-020, D-8), implemented in the isolated migration folder:
  - frozen helpers only, with no old-shape reader in current code;
  - a backup per file before any rewrite (the founder's rule).
- **Not run on the founder's data** (only the read-only M-6 scan).
- G-2: same-ID repair of a released migration (guideline §7), using the frozen store only.
- Browser storage check (Naming): `'transient_execution'` is not persisted, so there is no client migration.
  - localStorage holds only fixed keys.
  - The mobile route holds a server row key.
- N6: nothing writes or reads `agents/{run}/collaboration/` in current code. Removed, so FU-500-03 closes as not needed.
- G-5: reads only, nothing stored.

## Environment Or Dependency Notes

- macOS Darwin 25.5.0, 10 cores, Node v22, pnpm workspace. The load average was 60–200 throughout from other worktrees'
  suites (`shell-command-time-limits-483`, a background worktree), with `fseventsd` at about 150% CPU. This affected
  FU-021 and Grok discovery.
- Provider keys: only `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` was set. Grok Build uses the host CLI's own login;
  no keys were read from `.env` or the environment.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `d8ffc77c8b` | macOS, Node 22 | server src + tests | all | Pass | console | "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)" |
| IMP-02 | `node autobyteus-web/scripts/typecheck.mjs` from a fresh `.nuxt` | `18f9b0c038`; G-5 web re-checked at `8e2d3b76c0` | macOS | web | FU-023, G-5 | Pass | `IMP-006-web-typecheck-fresh-nuxt.log` | "production errors: 0; test-file errors: 87 in 37 files" |
| IMP-03 | `cd autobyteus-server-ts && npx vitest run tests/unit tests/agent-work-journal` | `4277f1945e`; the one product failure re-run at `d8ffc77c8b` | macOS, load 70–90 | all server units | all | Pass, except the folder-watcher timing case (untouched by this ticket) | console | "Tests 6 failed \| 7548 passed \| 9 skipped (7563)": 5 in `agent-package-folder-watcher.test.ts` (FSEvents timing, file unchanged since the merge base), 1 in `available-agent-runtimes-dependencies.test.ts` (fixed in `d8ffc77c8b`; then `tests/unit/available-agent-runtimes tests/unit/llm-management`: "Tests 144 passed (144)") |
| IMP-04 | `cd autobyteus-web && npx vitest run` | `4277f1945e` | macOS | all web units | names, G-5 | Pass | console | "Test Files 755 passed (755)"; "Tests 5675 passed \| 2 skipped (5677)" |
| IMP-05 | M-6 read-only first-start scan | branch head 10:01 | the founder's data, read-only | migration folder listing + pre-check | B-3 | Done | `IMP-005-m6-first-start-scan.md` / `.mts` | 7523 files, 8.67 GB, 13.0 s / 10.5 s, 155 candidates |
| IMP-06 | focused server runs after the size fix: `tests/unit/{agent-collaboration,agent-execution,compositions,llm-management,standalone-agent-run-root}`, `tests/architecture`, two integration files | `1eed3c4aff` | macOS | G-5 both paths, compositions | G-5, B-6, B-7 | Pass | console | "Test Files 259 passed \| 4 skipped (263)"; "Tests 2498 passed \| 6 skipped" |
| IMP-07 | `pnpm migrations:record-released` with a reordered record | `d4b632e61b` | macOS | G-1 recorder | G-1 | Pass (refuses) | `IMP-007-record-released-order-refusal.log` | exit 1, nothing written |
| IMP-08 | watcher test before SR-013 (60 s and 180 s guards) | `fb52bd332c` | macOS, load 55–70 | FU-021 | FU-021 | Fail (led to SR-013) | `IMP-008-*.log` | no event for over 3 minutes |
| IMP-09 | `python3 -m unittest discover -s scripts/tests` | `d4b632e61b` | macOS | release scripts | G-1 | Pass | console | "Ran 228 tests … OK (skipped=3)" |
| IMP-10 | focused runs per step (stream not-ready, migration, team index repair, compositions, collaboration texts, G-5 offer) | each step | macOS | as named | B-5, B-3, G-2, B-9, G-5 | Pass | console | `run-stream-not-ready` 9/9; attachment-links 8/8; team-index 4/4; `stored-model-offer` 5/5 |
| IMP-11 | FU-035 live probe (`RUN_GROK_E2E=1`, vault set) | `6b4ee1f128` | grok 1.0.88, grok-4.7 | Grok projection + executor | B-10 / AC-007 | **Blocked** (usage limit) | `IMP-011-fu035-grok-live-attempt.log`, `IMP-011-fu035-grok-refused-tool-probe.e2e.test.ts.txt` | "subscription:free-usage-exhausted … 609708/600000" |
| IMP-12 | watcher test, 3 runs, plus the `__pycache__` case alone ×3 | `4277f1945e` | macOS, load 67–118 | FU-021 test + probe | FU-021 / AC-005 | Fail (led to SR-014) | `IMP-012-watcher-three-runs-ambient-load.log`, `IMP-012-watcher-run-{1,2,3}.full.log` | "env=1 product=4", "env=3 product=3", "env=2 product=5"; "other=0" |
| IMP-13 | watcher test after the D-13b labels, 1 run | `a4e7f18e6d` | macOS, load 120–190 | FU-021 labels | FU-021 / D-13b | Fails as designed under load: labels only | `IMP-013-watcher-sr014-labels.log`, `IMP-013-watcher-sr014.full.log` | "env=1 inconclusive=6 other=0"; no "Timed out waiting for event (hang guard)" line |

- Not run, and why:
  - E2E suites and browser probes are left to API/E2E (see Known Risks).
  - `pnpm release:test --ref <branch>` (FU-023, rule 12) is the Delivery Engineer's before the merge.
  - The migration has not been run on the founder's data (it needs his approval).

## Frontend Rendered-Result Check

- **Affected surfaces:** the run Settings panel (existing run). G-5's per-member note reuses the root card's existing
  note, `RunSettingsCard` `data-test="run-setting-model-unavailable"`, which is unchanged markup. It is now passed per
  member (`RunMemberRow` → `RunSubjectCard` → `RunSettingsCard`).
  - The other web changes are names (no visual change), the removed attachment routes, and refusal texts.
- **References:** the run-settings UI/UX spec; design-spec G-5.
- **Inspected:** a unit mount (`RunMemberRow.runtime.spec.ts`). The member card gets `modelUnavailable=true` only for
  its own key.
- **Rendered in a browser: not done.**
  - `existing-run-model-config-probe.mjs` (the Nuxt fixture page) has no not-offered state.
  - Starting a Nuxt dev server at load 100+ would also have added FSEvents load during the watcher runs.
  - Remaining uncertainty: low. It is the same paragraph and styling as the root card's note, which is already shown
    today.
  - Suggested downstream: a not-offered member case in that probe.

## Downstream Coverage Hints / Suggested Scenarios

- **G-5:**
  - A team whose member's saved model is gone: the Settings member row shows the note; sending a message gives the
    `RUN_MODEL_NOT_OFFERED` text and starts no runtime.
  - A standalone restore behaves the same way.
  - An unreadable list (CLI signed out) proceeds as today.
- **FU-020:** the migration on a copy of real data (backups written, links converted, attachments open), and a second
  start that changes nothing.
- **FU-036:** a command sent to an org or collaboration stream before it is ready gets `SESSION_NOT_READY`.
- **FU-030:** the e2e and probe text assertions listed in Known Risks.
- **FU-021 (AC-005, D-13b), required:** after `pnpm test:integration:prepare`, run
  `tests/integration/file-explorer/file-system-watcher.integration.test.ts` 5 of 5 on Linux (inotify) in a Docker
  container from the worktree, and on a quiet macOS when one is available. A failure there is labelled ENVIRONMENT or
  INCONCLUSIVE only when the OS dropped events; loaded-macOS runs (IMP-012, IMP-013) are evidence only.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The live and real-stack journeys above, and the e2e suites and probes whose texts changed.
- **AC-005's watcher proof** (D-13b): 5 of 5 on Linux inotify (Docker from the worktree) and a quiet macOS when available.
- FU-035 is not part of this package: IR-002 (D-14) brings it with its own code review.
