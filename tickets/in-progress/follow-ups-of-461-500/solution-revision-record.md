# Solution Revision Record: follow-ups-of-461-500

| SR | Date | Kind | Summary | Status after |
| --- | --- | --- | --- | --- |
| SR-017 | 2026-11-18 | Design Impact (the Delivery Engineer: `v1.5.14-beta.1` released 491's migration first) | D-15: new IDs `20261119_…`, appended after `20261118_remove_retired_built_in_agents`; 491 classified `none` against FU-020 (agent-definition folders vs memory traces); `released-migration-order.json` = beta.1's 46; MO-1 redone in the users' order | Approved; design `Ready` |
| SR-016 | 2026-11-17 | Design Impact (ARCH-REV-008 AR-003) | R1: any failed unit of the provider (or a failed state) means unreadable, because the status counts hosts while identifiers are host-scoped; listOptions's on-demand step inside the same race; a two-host test | Approved; design `Ready` |
| SR-015 | 2026-11-17 | Design Impact (CRR-003: CR-500-003, CR-500-004; with the Local Fix CR-500-005) | G-5 revision: on-demand AutoByteus models loaded by `ModelAvailabilityService.loadOnDemandModel` before the check and the options read, under the deadline; G-5 skipped when the agent's definition is missing; the inherited-layer refusal's next step | Approved; design `Ready` |
| SR-014 | 2026-11-17 | Decisions on IR-001 | D-14: FU-035 step 0 waits for Grok's usage window, as a later round; the rest goes to code review. D-13b: a timeout is labeled ENVIRONMENT or INCONCLUSIVE, never product; AC-005's watcher proof runs on Linux (inotify) and a quiet macOS | Approved |
| SR-013 | 2026-11-17 | Design Impact (the implementation engineer's IR-001, FU-021) | Cause completed: the OS loses file events under load (Reproduced with raw chokidar and Node `fs.watch`); the test classifies a timeout with an environment probe; AC-005's watcher part reworded (D-13); FU-500-06 | Approved; design `Ready` |
| SR-012 | 2026-11-17 | Design Impact (ARCH-REV-004 AR-002) | G-5's catalog read is bounded by the existing 8 s model-list budget; a deadline or read error answers `list_unreadable` (start proceeds); per-start CLI discovery cost stated; slow-catalog test | Approved; design `Ready` |
| SR-011 | 2026-11-17 | Requirements and design (Task comment from the PM) | REQ-016 / AC-012 / D-12: a stored model its runtime no longer offers is marked per member and refused at start with one message; G-5. Base moved: 508 merged `d8dbeaa9ba` (same-ID fix of `20261111_delegated_runs_own_runs_v1`, `run-file-conversion.ts` only, no trace moves: M-7 unchanged) | Approved; G-5 to architecture review |
| SR-010 | 2026-11-17 | Design Impact (ARCH-REV-002 AR-001) | G-2 revised: legacy-shaped rows are rebuilt in the v2 shape from the row and the current tree, never written back raw; G-1's writer refuses a reordering; REQ-013 / AC-010 reworded (same intent: the team stays listed) | Approved; design `Ready` |
| SR-009 | 2026-11-17 | Requirements | D-10 decided: FU-028 dropped as not a defect (the user left it to the Solution Designer) | Approved; combined package to architecture review |
| SR-008 | 2026-11-17 | Requirements and design, delivery 2 (the user: stop implementation, design delivery 2 now) | REQ-012 … REQ-015; G-1 release-recorded order; G-2 same-ID repair of team index v2; G-3 probe data; D-10 (FU-028 not a defect, needs the user); delivery 1 naming additions from the implementation engineer's sizing | Delivery 2 `Ready for Approval` (D-10) |
| SR-007 | 2026-11-17 | Requirements (scope reduced by the user) | FU-032 (audit of past migration order) dropped; delivery 2 = order guard, FU-028, FU-029, FU-033 | Approved |
| SR-006 | 2026-11-17 | Requirements and design (scope reduced by the user) | The user dropped the code-only "task execution" → "delegated run" rename: REQ-003 dropped, all of FU-007 is FU-500-01; the design's N4 rows removed | Approved; design `Ready` |
| SR-005 | 2026-11-17 | Design | Delivery 1's design: FU-020 migration with backup and one late-predecessor follow-up; one stream attach; explicit composition for silent lookups and optional collaborators; team-only total; naming rules N1 … N6; refusal style; FU-021 cause reproduced; FU-035 reproduction step | Design `Ready`, Large / High |
| SR-004 | 2026-11-17 | Requirements | D-5 decided by the user: the Task record's stored names stay (no migration); the code-only rename "task execution" → "delegated run" is done this round; the stored-name part becomes a follow-up | Approved |
| SR-003 | 2026-11-17 | Requirements (from design investigation) | FU-020's evidence (231 structured links, all in the child's own folder; beta.7 writes none; 111 likely broken today); D-5 reopened: the stored `agentRun` holds team runs, so the approved code-takes-stored-names rename moves a wrong meaning into the code | D-5 `Ready for Approval` (needs the user); the rest stays `Approved` |
| SR-002 | 2026-11-17 | Requirements | D-8 decided by the user, (b): clean code and data for attachment links, with a migration and a backup; requirements approved | Approved |
| SR-001 | 2026-11-17 | Requirements | Delivery 1's baseline (groups 1, 3, 4, 5, 6); the staging (D-2); the decisions D-3 … D-7, D-9; the user's FU-027 decision (D-1: guards only); D-8 (FU-020) put to the user | Ready for Approval |

### SR-001

- **Trigger:** Task `autobyteus-500`, from `/project_task_manager`, at the founder's word.
- **Investigation:** `investigation-notes.md`. The founder's data was counted read-only (D-8's 425 links).
- **Decisions:** D-1 by the user (option 1); D-2 … D-7 and D-9 by the Solution Designer within the direction; D-8 `Needs user`.
- **Next:** the user's answer on D-8, then approval and design.

### SR-002

- **Trigger:** the user's answer on D-8: "the code and the data both should be clean … the data migration guideline mentioned this."
- **Change:** REQ-011 and AC-008 now require a conversion of the 425 stored links, with a backup first.
- **Approval:** D-1 and D-8 by the user; the rest by the Solution Designer within the direction, user informed. Requirements `Approved`.
- **Next:** architecture investigation and design for delivery 1.


### SR-003

- **Trigger:** the architecture investigation of delivery 1 (`investigation-notes.md`, "Architecture investigation").
- **Evidence-only clarifications (no renewed approval):** D-8's note corrected: beta.7 no longer writes host-scoped links. The 425 counted earlier include text mentions; the migration's items are the 231 structured links in `media.images[]`, every one in the child's own folder with its file present.
- **Requirement change (needs the user):** D-5. Stored `agentRun` names a team run too, so renaming the code to the stored names (SR-002) gives a team run the code name `agentRun`. Recommended: clean names in code and data (`delegated_runs.json`, `delegatedRuns`, `run`), by a migration with a backup first, in the same release as FU-020's.
- **Design impact:** REQ-003's design waits for the user's answer; every other part of delivery 1 proceeds.

### SR-004

- **Trigger:** the user, on whether FU-007's renaming is needed this round. The Solution Designer recommended no stored-name rename (no bug, mapping confined to one module, a second migration for a name) and the code-only rename now; the user: "Yeah", adding that the attachment work (FU-020) is needed because it is a leftover that needs refactoring.
- **Change:** D-5 and REQ-003 rewritten; AC-001 keeps the schema module's one documented mapping. FU-007's stored-name part recorded in `follow-ups.md`.
- **Approval:** D-5 by the user. Requirements `Approved` at SR-004.
- **Next:** the design of delivery 1.

### SR-005

- **Trigger:** requirements approved at SR-004.
- **Design:** `design-spec.md`. Decisions the Solution Designer made within the direction:
  - "root" stays where it means a run at the top of its own membership tree (N1);
  - the team total serves team runs only, since no client asks for an org's;
  - process getters that throw stay (FU-500-02);
  - text mentions, closed journals, the search index, logs and the `imports/` mirror are inert residue.
- **Evidence:** FU-021 reproduced under CPU contention (investigation notes). FU-035 needs a live run, which is the implementation's step 0.
- **Classification:** `Large`, `High`.
- **Next:** architecture review.

### SR-006

- **Trigger:** the user, on the scope summary: "i guess we could drop this as well" (the code-only rename of the Task record's names).
- **Change:** REQ-003 dropped; D-5 now "no change this round"; AC-001 no longer covers `TaskExecution…`; the design's N4 rename rows and change-sequence step removed; FU-500-01 covers stored and code names.
- **Approval:** the user. **Classification:** unchanged (`Large`, `High`: the migration, the route removal, the composition changes).
- **Next:** the architecture reviewer is told of the reduced scope.

### Review of SR-005 / SR-006

- ARCH-REV-001: **Pass** (`design-review-report.md`, `architecture-review-revision-record.md`). The classification stays `Large` / `High`. The reviewer sent the package to the implementation engineer.
- The reviewer settled three "to verify" items:
  - both hosts initialize `ProjectTaskService` through `composeCollaboration`;
  - `delegated_copy_own_file_complete_v1` is classed `none`;
  - `getAgentRunCommandCoordinator()` is called from `agent-stream-handler.ts:86, 502`.
- Note to the implementation: M-1 matches exact folder depths and never descends into `agents/{run}/collaboration/…`.

### SR-007

- **Trigger:** the user, on FU-032: "A lot of our users are very new users … they don't have any data", then "currently no one has reported any problem yet even they jump from old versions". The Solution Designer recommended dropping it: the guard prevents new order mistakes, FU-029 fixes the only known harm, and the audit only concerns users who jump many old releases.
- **Change:** the Scope Guardrail's delivery 2 no longer includes FU-032. Dropped with the founder's word, as the Task's "Done when" allows.
- **Approval:** the user. Delivery 1 is unaffected.

### SR-008

- **Trigger:** the user: stop the implementation and design delivery 2 now, so both go as one package. The implementation engineer stopped, with no commits.
- **Delivery 1 detail (design only, no behavior change):** from the implementation engineer's sizing, N3 now lists every "copy" name. The public code `TASK_COPY_NOT_ASSIGNABLE` is renamed. The stored `copyAddress` / `copyKind` stay (FU-500-04, as D-5). The GraphQL argument `hostRunId` becomes `runId`. `TaskExecutionHostIdentity` is kept.
- **Delivery 2:** requirements REQ-012 … REQ-015 and design G-1 … G-4. FU-028 is found not to be a defect (D-10, needs the user).
- **Next:** the user's word on D-10, then architecture review of the combined package.

### SR-009

- **Trigger:** the user, on D-10: "you decide, I think now you have very good understanding of the project".
- **Decision:** FU-028 is dropped. No current code reads or writes the field, and no migration removes it, so the late writer leaves the same ignored residue as every older file (guideline §3).
- **Approval:** delivery 2's requirements are approved by the Solution Designer at the user's word. The combined package (delivery 1 at SR-006 plus its SR-008 naming additions, and delivery 2) is `Large` / `High`.
- **Next:** architecture review of the delivery 2 parts and the SR-008 additions.

### SR-010

- **Trigger:** ARCH-REV-002, Fail, AR-001 (`design-review-report.md`, Round 2).
- **Premise checked against the code:** `team-run-history-index-store.ts:77-104` rejects the whole index, not one row, when any row is off-shape. That makes the defect worse than reported.
- **Change:** G-2 now keeps only rows that pass the reader. It rebuilds legacy rows in the v2 shape from the row and the folder's current tree, with a field-source table, and omits a row only when the folder has no tree. Every row is written through `writeIndex`. G-1's writer refuses a reordered registry.
- **Approval impact:** REQ-013's intent is unchanged (a team run that exists stays in history); its wording and AC-010 now state the observable outcome through the current reader. No renewed user approval is needed.
- **Next:** architecture review, round 3.
- **Design case:** the mistake was carrying over a premise ("kept exactly, like 461's `addRows`") without reading the reader that consumes the output. This is lesson 2 of the Solution Designer's reflections, recorded there.

### Review of SR-010

- ARCH-REV-002 failed with AR-001; SR-010 resolved it. ARCH-REV-003: **Pass** (`design-review-report.md`). The reviewer sent the combined package to the implementation engineer.
- Note to the implementation: G-2's validator and writer are the frozen copies (`frozen/server/run-history/store/team-run-history-index-store.ts`).

### SR-011

- **Trigger:** the PM added autobyteus-508 FU-001 to group 4 (Task comment, 2026-11-17).
- **Decision:** D-12, by the Solution Designer within the direction.
- **Design:** G-5.
- **Base check:** 508's change to `20261111_delegated_runs_own_runs_v1` touches `run-file-conversion.ts` only. FU-020's late-predecessor classification ("none") holds. The branch is rebased onto `origin/personal` before implementation continues.
- **Next:** architecture review of G-5. The rest stays passed (ARCH-REV-003).

### SR-012

- **Trigger:** ARCH-REV-004, Fail, AR-002.
- **Premise checked:** `runtimeModelSelectionCatalog` takes `{ deadline }` (`model-catalog-service.ts:179-190`). The only existing budget for a model-list read is `AVAILABLE_AGENT_RUNTIMES_STEP_CAPS.modelsMs` = 8 s (`available-agent-runtimes-service.ts:41-43`).
- **Change:** G-5's `storedModelOffer` reads with that deadline, and a deadline or any read error means `list_unreadable`. The cost is stated, and a slow-catalog test is added. Intended behavior is unchanged: D-12 already said a slow or failed catalog never blocks a start.
- **Next:** architecture review of SR-012.

### Review of SR-011 / SR-012

- ARCH-REV-004 failed with AR-002; SR-012 resolved it. ARCH-REV-005: **Pass** (`design-review-report.md`). The reviewer sent G-5 to the implementation engineer.
- Note to the implementation: the autobyteus runtime's catalog branch ignores the deadline (`model-catalog-service.ts:206-207`), so `storedModelOffer` races the whole read (`raceDeadline`), as `available-agent-runtimes-service.ts` does.

### SR-013

- **Trigger:** the implementation engineer's Design Impact on FU-021 (IR-001). Events were missing for over 3 minutes even with outcome assertions.
- **Investigation (the Solution Designer):** raw chokidar 4.0.3 missed 1 of 5 events within 60 s, and Node's own `fs.watch` missed 2 of 8, with none of our code involved (load average 53 to 68 on 10 cores). SR-005's cause ("late, not lost") was incomplete. It rested on one case with a long wait (the 2026-11-17 note already said not every case was seen to arrive).
- **Change:** D-13. AC-005's watcher part is met where the OS delivers events. The design adds an environment probe on a hang-guard timeout. FU-500-06 is recorded for the File Explorer's recovery from dropped OS events.
- **Review:** a test-only design change, with no product, contract or persistence change. It is still a revision of a `High` package, so it goes to architecture review, as the handoff rules require.

### Review of SR-013

- ARCH-REV-006: **Pass** (`design-review-report.md`).
- The stale proof line ("3 of 3 under 10 busy loops") is restated: under load, a run passes or fails only with ENVIRONMENT cases. The reviewer's optional suggestion (a canary during the wait, not after it) is left to the implementation.

### SR-014

- **Trigger:** the implementation engineer's IR-001, with two open items (IMP-011, IMP-012).
- **D-14 (FU-035):** sequencing only. The rest goes to code review. Step 0 runs after Grok's 24-hour window resets, as IR-002. Nothing is waived: only the founder's own words could waive it.
- **D-13b (FU-021):** IMP-012 shows that the SR-013 probe can't prove a product fault under load (the OS drops events per stream). A timeout is labeled ENVIRONMENT or INCONCLUSIVE. The proof runs where the OS delivers events reliably: Linux inotify in Docker, and a quiet macOS.
- **Review:** test-labeling and proof-location changes only, inside SR-013's reviewed shape. They still go to architecture review, as the handoff rules require for a `High` package. The implementation makes the one message change in parallel.

### Review of SR-014

- ARCH-REV-007: **Pass** (`design-review-report.md`). The proof lines are aligned with D-13b and AC-005 (the gate is Linux inotify plus a quiet macOS; loaded runs are labeled ENVIRONMENT or INCONCLUSIVE).

### SR-015

- **Trigger:** API/E2E round 1 failed. The code reviewer's CRR-003 found two Design Impacts in G-5 and one Local Fix in FU-030.
- **My miss:** G-5 took "the runtime's list" as the authority for every runtime. For AutoByteus, the authority is `ModelAvailabilityService`'s on-demand load. G-5 also didn't place itself relative to the definition's resolution. Both are lesson 2 (the premise "offered models answer availability" was not read for every runtime kind; Principle 1, "several kinds").
- **Change:** design "G-5 revision (SR-015)" R1 … R3. Intended behavior is unchanged: D-12 already said "refuse only when the list was read and lacks the model".
- **Next:** architecture review. Then the implementation, the code reviewer, and the API/E2E rerun of F-1 … F-3, LE-F1 and the local-provider cases after a restart.

### SR-016

- **Trigger:** ARCH-REV-008, Fail, AR-003.
- **Premise checked:** the Ollama source status carries `successfulHostCount` / `failedHostCount` across hosts (`model-catalog-service.ts:248-256`), not per host.
- **Change:** R1's unreadable rule is now any failed unit or a failed state, plus the note's same race and the two-host test.
- **Next:** architecture review.

### Review of SR-015 / SR-016

- ARCH-REV-008 failed with AR-003; SR-016 resolved it. ARCH-REV-009: **Pass** (`design-review-report.md`). The reviewer sent the package to the implementation engineer.
- Accepted residual risk (D-12): while any host of a provider is down, its host-scoped models are not checked, and their start proceeds as at base. A per-host source status could refine this later; it isn't recorded as a follow-up, because no failure follows from it.

### SR-017

- **Trigger:** the Delivery Engineer's Design Impact (`release-deployment-report.md`, "Eighth state passed; ninth refresh blocked by a release").
- **Premises read on `origin/personal` `2eb195603a`:**
  - 491's migration (`remove-retired-built-in-agents-migration.ts`, 76 lines) and its registry entry (`app-data-migration-registry.ts:173-178`);
  - `getAgentsDir()` = `<data>/agents` (`app-config.ts:355-356`).
- **Change:** design "SR-017" (D-15).
- **Next:** architecture review, then implementation, code review, an API/E2E round (MO-1 in the new order), and back to delivery.
