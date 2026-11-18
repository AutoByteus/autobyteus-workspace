# Design Review Report: follow-ups-of-461-500 (combined package, deliveries 1 and 2)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/follow-ups-of-461-500/requirements-doc.md` (approved; current SR-014)
- Upstream Investigation Notes: `investigation-notes.md`, including "Architecture investigation (delivery 1)" and "FU-021"
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001 … SR-014)
- Reviewed Design Spec: `design-spec.md` at SR-014 (commits `537b8dfc53`, `01f51fe06b`); rounds 1 to 6 reviewed SR-005 … SR-013
- Supplemental Task Artifacts Reviewed: `source-follow-ups-461.md` (leads); `follow-ups.md`; the handoff `handoff-architecture-review-sr005.md`
- Relevant Solution Revision IDs: SR-005 … SR-014
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-010`
- Current Review Round: 10
- Trigger (latest): SR-015, G-5 revised for the code reviewer's CRR-003 after API/E2E round 1 failed. Round 1's trigger was SR-005 and SR-006.
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Pass` for delivery 1 at SR-005/SR-006)
- Latest Authoritative Round: 10
- Current-State Evidence Basis: the branch at `3138978568` (base `origin/personal` `e4f4b3e176`). These were opened at their cited lines:
  - `agent-memory-layout.ts:76-114`;
  - `team-run-physical-scope.ts:52`;
  - `context-file-owner-resolver.ts:86-125`;
  - `api/websocket/agent.ts:79-103`;
  - `token-usage-stats.ts:338-347`;
  - `project-task-service.ts:452-460`;
  - `collaboration-composition.ts:150-165`;
  - `build-studio-server.ts:372`;
  - `start-standalone-application-host.ts:274`;
  - `agent-run-command-coordinator.ts:371`;
  - `agent-stream-handler.ts:86, 502`;
  - the frozen `context-file-record-locators.ts:34-45`;
  - `migrations/delegated-copy-own-file-complete-v1/` (searched for renames and traces);
  - `studio-application-api-services.ts:136`.

## Round 10: SR-017, a release shipped 491's migration first (D-15)

- **Change reviewed** (commit `d11924928f`; design "SR-017"; the Delivery Engineer's Design Impact; `release-deployment-report.md`).
  - `v1.5.14-beta.1` released `20261118_remove_retired_built_in_agents` (autobyteus-491) while this ticket's two unreleased migrations were dated and registered ahead of it. They are renamed `20261119_delegated_run_own_attachment_links` and `…_after_task_agent_own_run`, appended after 491's entry, and the backup folder follows the ID.
  - 491 is classified `none` against M-7.
  - `released-migration-order.json` becomes beta.1's 46 IDs.
  - API/E2E redoes MO-1 in the users' order.
- **Verified on `origin/personal` (`7984543255`).** `remove-retired-built-in-agents-migration.ts` deletes only the two agent-definition folders under `<agentsDir>`, with `fs.rm` (`:38-39`; description `:57`, "Their runs stay"), and the registry places it last (`:175`).
- **Judgement: sound.**
  - The unreleased IDs are the ones that move. Guideline §4 (append-only, dated later) is met without touching released entries, as REQ-012 and D-1 require.
  - 491 and our migrations touch disjoint data (agent definitions against memory traces), so either order gives the same result and `none` is right. The classification test lists it.
  - Seeding the JSON from beta.1's actual released set (the base's `RELEASED` at `1f835e3e7f`) keeps G-1's record truthful. G-1's own refusal would have caught the reordering that this avoids.
  - G-2 is order-independent.
  - Redoing MO-1 in the users' order, 491 first, is the right evidence.
- **Decision (round 10):** `Pass`. The combined package (through SR-017) stands.

## Round 9: SR-016, AR-003 answered

- **Change reviewed** (commit `688fdcbbfa`; "G-5 revision (SR-015)" R1, `design-spec.md:634, 639, 645, 649`):
  - `loadOnDemandModel` answers `unreadable` on any failed unit of the provider (`failedUnitCount > 0`) or a failed state;
  - `listOptions` runs its on-demand step inside the same `MODEL_LIST_READ_MS` race;
  - a new test covers two Ollama hosts, with the model's host down and the other up.
- **AR-003: resolved.**
  - With counts only, any failed host means the identifier's own host may not have been read, so the answer is `unreadable` and the start proceeds as today. That is D-12's rule.
  - The cost is that a model on a healthy host also isn't checked while another host is down, which only defers to today's behavior. A per-host status could refine this later.
  - The Settings read now has the same budget as the start path.
- **Decision (round 9):** `Pass`. The combined package (through SR-016) is ready for implementation.

## Round 8: SR-015, G-5 revised for CRR-003 (R1 to R3)

- **Change reviewed** (commit `9a3206da93`; design "G-5 revision (SR-015)").
  - **R1:** `ModelAvailabilityService.loadOnDemandModel` answers `not_on_demand`, `loaded` or `unreadable`. `storedModelOffer` runs it inside the same deadline race before reading the list, and `listOptions` uses the same step. The web note now requires `modelListReadable`.
  - **R2:** both paths read the definition first and skip G-5 when it is missing.
  - **R3:** the next step in the inherited-layer refusal's text.
- **Verified:**
  - `ensureModelAvailable` (`model-availability-service.ts:52-63`) is the start path's on-demand load, and `resolveDynamicProvider` (`:66-82`) parses custom and host-scoped identifiers.
  - Ollama's source spec (`model-catalog-service.ts:243-259`) maps `successfulHostCount` and `failedHostCount` to unit counts, and throws only when every host failed.
- **Judgement on R1's owner and order: sound.** The on-demand load stays with its owner, runs before the list read and inside the budget, and is shared with the Settings options read. Removing the false note on an unreadable list is right.
- **R2: sound.** G-5 speaks only for an agent that exists. The existing not-found owner still answers, and G-5 is a precondition, not a second owner.
- **R3: sound.** The text follows FR-1 … FR-4.
- **Not sound as written (AR-003, Design Impact, D-12 / AC-012): a partial multi-host failure gives a false "not offered".**
  - R1 counts as `unreadable` only "`successfulUnitCount === 0` with `failedUnitCount > 0`, or a failed state".
  - Ollama and LM Studio can have several configured hosts, and an identifier is host-scoped (`parseHostScopedLlmModelIdentifier`). The source status reports only counts across hosts (`model-catalog-service.ts:248-256`).
  - With hosts A (up) and B (down), and a model on B: the status is 1 successful and 1 failed, so the rule gives `loaded`. B's model is not in the list, so the answer is `not_offered`, and the start is refused for a model whose host was simply unreachable.
  - D-12 refuses "only when the runtime's list was read and lacks the model". B's list was not read.
  - **Needed:** for a host-scoped or custom identifier, answer `unreadable` when the identifier's own host or endpoint was not read successfully. With only counts available, that means any `failedUnitCount > 0` for its provider, so the start proceeds as today. Per-host detail could refine it later. Add a test: two hosts, the model's host down, the other up, gives `list_unreadable` and a start that proceeds, and the Settings options show no note.
- **Note (bound `listOptions` the same way).** R1's step 1 in `listOptions` should run inside the same `MODEL_LIST_READ_MS` race, so a hung local host can't hold the Settings read past the budget the start path uses.
- **Decision (round 8):** `Fail` (AR-003, Design Impact). R2, R3 and the rest of R1 need no change.

## Round 7: SR-014, FU-021's labels and proof; FU-035's sequencing (test and sequencing only)

- **Change reviewed** (commits `537b8dfc53`, `01f51fe06b`; D-13b, D-14, AC-005; design FU-021 "SR-014"; evidence `IMP-012-watcher-three-runs-ambient-load.log`, read).
- **D-13b: sound.**
  - IMP-012 shows ENVIRONMENT and plain timeouts mixed across runs at a load of 62 to 172. The `__pycache__` case alone passed 1 of 3. That confirms round 6's note 2: under load, a probe on another stream that gets its event doesn't show that the watcher's stream got its own.
  - Labelling such a timeout INCONCLUSIVE, never "product failure", says only what is known. The case still fails: no skip, no retry.
  - Moving AC-005's proof to Linux inotify (Docker from the worktree, 5 of 5), plus a quiet macOS when available, puts the proof where the OS delivers events reliably. The test logic and our watcher above chokidar are platform-independent.
  - Loaded-macOS runs become evidence only.
- **D-14: sound.** Splitting FU-035's live step 0 into IR-002 after Grok's 24-hour window resets is sequencing only. FU-035 stays open until a live run shows the cause, and only the founder's words can waive it (the Grok waiver rule). The rest proceeds to code review.
- **Note (proof text).** The restated proof (`design-spec.md:469-471`) still says a loaded run "fails only with ENVIRONMENT cases". After D-13b it is "ENVIRONMENT or INCONCLUSIVE, never a product failure", and the 5-of-5 proof is the Linux run (and a quiet macOS when available), as in `:466` and AC-005. Align the two.
- **Decision (round 7):** `Pass`. The combined package (through SR-014) stands.

## Round 6: SR-013, FU-021's cause completed (test-only)

- **Change reviewed** (commit `083adaa2d4`; design FU-021 "SR-013"; D-13; AC-005 reworded; follow-up FU-500-06). The Implementation Engineer's IR-001 showed events missing for over 3 minutes, even with outcome assertions.
  - **Reproduced without our code:** raw chokidar 4.0.3 with the watcher's options missed 1 of 5 rounds within 60 s, and Node's `fs.watch` missed 2 of 8, at a load average of 53 to 68 on 10 cores (`/tmp/fu021-probe/`, read).
  - **The design:** when a wait reaches the 60 s guard, a raw `fs.watch` probe on a fresh temp dir tells an OS that delivered nothing ("ENVIRONMENT: …") from a product failure. There are no retries, no skip and no longer waits.
- **Judgement: sound.**
  - The cause is now established below our code, and the probes are minimal and reproducible.
  - A test can't make the OS deliver events, so a truthful label (still a failure, not a skip) is the right response under TESTING.md. AC-005 was reworded within the direction, with the user informed.
  - Treating recovery from dropped OS events as a product feature (FU-500-06) is the correct scope call.
  - There is no product, contract or persistence change.
- **Note 1 (proof line).** The FU-021 proof still says "3 of 3 runs under 10 busy loops" (`design-spec.md:466`). After D-13, that can fail through no fault of ours. Restate it: alone, 5 of 5 pass; under load, every run either passes or fails only with ENVIRONMENT, with no product-failure label.
- **Note 2 (suggestion: same-window evidence).** A probe run *after* the 60 s wait tests a later moment. Under fluctuating load, it can get its event and so label an OS stall a "product failure", sending someone to debug the watcher. A canary that runs *during* the wait gives evidence from the same window: a raw `fs.watch` on a sibling temp dir, written when the wait starts, and checked when the guard fires. That costs no extra time. This is optional.
- **Decision (round 6):** `Pass`. The combined package (through SR-013) is ready for implementation.

## Round 5: SR-012, AR-002 answered

- **Change reviewed** (commit `9d119380dc`; G-5 "Bounded" and spine walk (c)):
  - `storedModelOffer` reads with `createReadDeadline(AVAILABLE_AGENT_RUNTIMES_STEP_CAPS.modelsMs)`, the existing 8 s model-list budget (verified at `available-agent-runtimes-service.ts:41-43`), through `runtimeModelSelectionCatalog`'s `{ deadline }`;
  - a deadline or any read error answers `list_unreadable`, and the start proceeds;
  - the per-start CLI discovery cost is stated (at most 8 s);
  - a slow-catalog test is added.
- **AR-002: resolved.** The check reuses the project's budget for exactly this read, a slow catalog now ends as "unreadable", and the start proceeds as D-12 and AC-012 require.
- **Note (bound every branch).** Not every catalog branch takes the deadline. The autobyteus runtime's branch calls `LLMFactory.listAvailableModels()` with no options (`model-catalog-service.ts:206-207`). That is why `available-agent-runtimes-service.ts` also ends a step that ignores its deadline. Race the whole read in `storedModelOffer` (`raceDeadline` from `read-deadline.ts`), so every branch is bounded, and include the autobyteus runtime in the slow-catalog test or state why its list is local and fast.
- **Decision (round 5):** `Pass`. The combined package (through SR-012) is ready for implementation.

## Round 4: SR-011, G-5, a stored model its runtime no longer offers (REQ-016 / AC-012 / D-12)

- **Change reviewed** (commit `5141c3b9df`; autobyteus-508 FU-001 added to group 4 by the PM; base moved to `d8dbeaa9ba`, where 508's same-ID fix of `delegated_runs_own_runs_v1` touches `run-file-conversion.ts` only, so M-7's "none" holds).
  - `RunModelSelectionService.storedModelOffer` answers `offered`, `not_offered` or `list_unreadable` from `offeredModels`.
  - One refusal builder, `storedModelNotOfferedRefusal`, with code `RUN_MODEL_NOT_OFFERED`.
  - The check runs on both start paths: the standalone `restoreStarted` before `buildConfig`, and the member `prepareActivation` before `planner.begin`.
  - The collaborators are passed in, with no optional parameters.
  - The web shows the Settings note on each member row.
- **Judgement on the structure: sound.**
  - One owner for the check and one for the wording.
  - The same rule on both paths (Principle 1, "two paths, one capability").
  - Rightly not reusing `validate()`, which accepts an unchanged current model even when it is no longer offered (`run-model-selection-service.ts:79-83`).
  - Reads only the selected runtime's list.
  - The member-row note reuses the root's component.
  - The spine walk covers (a) to (f).
- **Not sound as written (AR-002, Design Impact, D-12 / AC-012): a slow catalog can block or delay every start.**
  - D-12 says the check must never let "a slow or failed catalog block a run whose model may be fine", and AC-012 says "with the list unreadable, the start proceeds as today".
  - `storedModelOffer` reads `runtimeModelSelectionCatalog` (`model-catalog-service.ts:179-190`) on every restore and member activation, with no deadline.
  - For the CLI runtimes that read is a fresh discovery each time:
    - `GrokBuildModelCatalog`: "fresh ACP handshake; no process-global cache" (`grok-build-model-catalog.ts:5-9`);
    - antigravity: `agy --help` and `agy models` (`antigravity-model-catalog.ts:7-8`);
    - Codex: an app-server lease (`codex-model-catalog.ts:23-34`).

    A slow or hung CLI then delays the start by its full discovery time, or blocks it. A failure counts as `list_unreadable`, but slowness doesn't.
  - The catalog API already takes `{ deadline?: ReadDeadline }` (`model-catalog-service.ts:182`; `runtime-management/read-deadline.ts`).
  - **Needed:**
    - `storedModelOffer` reads with a bounded `ReadDeadline` and answers `list_unreadable` when the deadline passes (`DeadlineExceededError`), so the start proceeds as today. Name the budget; the Settings options read's budget is a natural choice.
    - Add a test: a catalog slower than the budget gives `list_unreadable`, and the start proceeds, for one CLI runtime.
    - Optionally, note the extra discovery cost per start for CLI runtimes, which the deadline bounds.
- **Decision (round 4):** `Fail` (AR-002, Design Impact). The rest of SR-011 needs no change, and the package as passed in ARCH-REV-003 stands.

## Round 3: SR-010, AR-001 answered

- **Change reviewed** (commit `db3766ca65`; G-2, G-1, REQ-013 / AC-010 wording):
  - **G-2's rule for an existing row whose team folder exists but which wasn't rebuilt from metadata:**
    - it is kept, values unchanged, only when it passes the reader's row rules (a small frozen validator);
    - otherwise it is rebuilt as a v2 row from the row and the folder's `team_run_execution_tree.json`, by a stated field-source table;
    - it is omitted, `SKIPPED` with a warning, only when the folder has no readable tree.

    A row whose folder is gone is removed, as today.
  - **Every row is written through `TeamRunHistoryIndexStore.writeIndex` (`normalizeRow`).** The "raw like `addRows`" approach is withdrawn.
  - **The designer's premise check:** the reader rejects the whole index, not just the row, which makes AR-001 worse than I reported.
  - **The AC-010 fixture** holds a pre-v2 index with a legacy row, a v2-valid row, a row whose folder is gone and a folder without a tree. It asserts listing through the current reader and the catalog, and that a second start changes nothing.
  - **G-1:** the record script refuses to write when the registry doesn't start with the recorded list.
- **AR-001: resolved.**
  - Only valid v2 rows are kept, and every other row is rebuilt in the target shape through the store's own normalizer. So the written index always passes the reader, which is REQ-013's outcome.
  - The field sources are sound. They are the migration's own candidates (`deriveCreatedAt`'s order, the name lookup, the workspace canonicalization), with the tree file in place of the missing metadata file. The founder's data sample shows the tree fields present (400 of 400).
  - Omitting a row whose folder has no current tree is consistent: current code can't open that run either.
- **Note (migration boundary).** The writer and the validator must be the frozen copies, `frozen/server/run-history/store/team-run-history-index-store.ts`, which the design already cites for the rules, not the current `run-history/store/` module. The boundary test allows only `domain/`, `frozen/` and node APIs, and the migration's target shape stays the one it was released against.
- **Decision (round 3):** `Pass`. The combined package (delivery 1 at SR-005 … SR-008, delivery 2 at SR-008 … SR-010) is ready for implementation.

## Round 2: the combined package (SR-007 … SR-009)

- **Trigger:** the user stopped implementation so that delivery 1 and delivery 2 go as one package (handoff `handoff-architecture-review-sr009.md`, branch at `319e487113`). The scope decisions since round 1:
  - SR-007, FU-032 dropped by the user;
  - SR-008, delivery 2 designed, plus naming additions to delivery 1;
  - SR-009, FU-028 dropped (D-10, at the user's word).
- **Classification:** `Large` / `High`, combined. Delivery 2 alone is `Small` / `High`, because it corrects a released migration over user history rows. A review is required.
- **Delivery 1's SR-008 naming additions: `Pass`.**
  - N3 is now complete.
  - The public code `TASK_COPY_NOT_ASSIGNABLE` is renamed in one release (rule 9).
  - The stored `copyAddress` / `copyKind` stay as a known leftover (FU-500-04, like D-5).
  - The GraphQL argument `hostRunId` becomes `runId`.
  - Keeping `TaskExecutionHostIdentity` has a sound reason: it names containment within one run, and it is a `TaskExecution…` name under D-5. The completion check excludes it.
- **G-1, the released order recorded by the release (REQ-012, D-11): `Pass`.**
  - Recording the order in the release commit keeps the tag the source of truth without reading git in a test.
  - The test's three checks are right.
  - Rule 12 is covered by `release:test`.
  - **Note:** the record script should refuse to write when the current registry doesn't start with the existing recorded list. A release could otherwise launder a reordering into the record if the order test were skipped or run after the write. That costs one comparison.
- **G-3, the probe's data (REQ-014): `Pass`.** The probe's data now matches the migration's real rule, as the server fixture does, and the migration is unchanged.
- **G-4 / D-10, FU-028 dropped: `Pass`.**
  - The premise "an earlier migration removes the field" doesn't hold (`remove-global-skill-discovery-mode-migration.ts:74-80`).
  - The current tree reader tolerates the field: `parseLaunchConfiguration` (`run-execution-tree-shared-record-schemas.ts:72-90`) requires its keys and drops unknown ones.
  - So a late writer's `skillAccessMode` is inert residue (guideline §3).
- **G-2, the same-ID repair of `20260521_team_run_history_index_v2` (REQ-013 / AC-010): not sound as written (AR-001, Design Impact).**
  - **The design** keeps an existing row whose team folder exists "exactly (written back unchanged)", like 461's `addRows`.
  - **The late case is pre-v2 data.** The repair targets installations where this migration is pending or failed, so the index it reads is the pre-v2 one. Its rows are legacy-shaped: the migration itself reads a "legacy index lastActivityAt" (`team-run-history-index-v2-migration.ts:265`) and treats `createdAt` as possibly absent (`:259`).
  - **The current reader rejects such a row:**
    - `TeamRunHistoryIndexStore` (`team-run-history-index-store.ts:83-104`) returns `null` for a row with any key outside its allowed set, such as `lastActivityAt`;
    - it also returns `null` for a row missing `teamDefinitionName` or `createdAt`.

    A legacy row "kept exactly" is therefore still dropped on read. The user-started team still vanishes from history, and AC-010's intent (REQ-013: "keeps the rows of team runs whose folders exist") is not met. 461's `addRows` was safe because it wrote rows it had built in the target shape from own files.
  - **Needed:** for an existing row whose team folder exists but which wasn't rebuilt:
    - keep it as is only when it already validates as a v2 row;
    - otherwise build the v2 row with the migration's own rules (`deriveCreatedAt`, `resolveTeamDefinitionName`, `resolveWorkspaceRootPath`, the summary rule). Take the inputs from the existing row and the folder's current file (`team_run_execution_tree.json`) where the metadata file is gone.

    State which fields come from where. The AC-010 fixture should hold the legacy row shape, not a v2 row, and assert that the team is listed through the current reader, not only that bytes are equal.
- **Decision (round 2):** `Fail` (AR-001, Design Impact). Everything else in the combined package passes, and delivery 1 stays as passed in round 1.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: a persisted-data migration of user trace files, with backups and a late-predecessor follow-up; an owner kind and a REST route removed on the server and web; composition rewired in two hosts; public contracts changed (WebSocket answer, narrowed query); a rename across about 160 files.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. SR-006 removes the largest rename, but the migration and the composition changes keep `Large` / `High` correct.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements and intended behavior understood: REQ-001, REQ-002 and REQ-004 … REQ-011 (REQ-003 dropped at SR-006), plus AC-001 … AC-008. The user decided D-1, D-5 (narrowed at SR-006) and D-8. D-8 approves the FU-020 migration with a backup first.
- Relevant existing behavior and evidence confirmed. Main premises checked at their lines:
  - **FU-020, team member target link.** A member's folder is `agent_teams/{root}/{ancestorTeamRunIds…}/{member}` (`agent-memory-layout.ts:81-94`). `ancestorTeamRunIds` grows by the child team (`team-run-physical-scope.ts:52`), so a member folder's parent is its containing team run. `team_member_final` resolves by `{containingTeamRunId, agentRunId}` (`context-file-owner-resolver.ts:96-97`). So M-2's target `/rest/team-runs/{parent}/agent-runs/{child}` resolves.
  - **The old host-scoped kind** resolves under `rootSubjectKind: "agent"` with `rootRunId = hostRunId` (`:92-95`), one hop. That supports the 111 broken multi-hop links (code reading, as the design says).
  - **FU-036:** `attachRootStream` attaches its listeners only after `connect` resolves (`agent.ts:85-91`). The org and collaboration handlers are optional (`:101-102`).
  - **FU-013:** the team query looks up both `agent_team` and `agent_org` with one ID (`token-usage-stats.ts:343-347`).
- Scope guardrail confirmed: in scope, groups 1, 3, 4, 5 and 6, minus REQ-003. Delivery 2 (group 2) and FU-500-01 … 03 are outside this review. Preserved: every behavior except where a requirement says otherwise.
- Approved change, preserved behavior and outside scope understood: `Yes`.
- Every prospective blocking `Design Impact` finding traceable: `Yes` (none raised).
- Remaining material ambiguity: the "to verify" items in the design. Three are settled below; two are left to the implementation, with the design stating what returns to design.
- Statements about existing code the design relies on, opened at their cited lines (Principle 1):
  - **ProjectTaskService** (DR-1 row, "to verify"): both hosts call `initializeProjectTaskServiceProcessInstance` through `composeCollaboration` (`collaboration-composition.ts:160`; called at `build-studio-server.ts:372` and `start-standalone-application-host.ts:274`). So making `getProjectTaskService()` throw before composition is safe in both hosts.
  - **`delegated_copy_own_file_complete_v1`** (M-7, "to verify"): its folder contains no rename, copy or `raw_traces` access. It is `none`.
  - **`getAgentRunCommandCoordinator()` callers** (DR-1, "to verify"): the only production callers are `agent-stream-handler.ts:86` (a default parameter) and `:502`. Both can take the composed coordinator.
  - **The token resolver's `getStudioDelegatedRunAgents()`** throws when unconfigured (`studio-application-api-services.ts:136`, `requireConfiguredServices`): a loud framework-edge getter, consistent with FU-500-02.

| Behavior ID | Kind | Alignment | Trigger / Evidence | Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| B-1 | User | Pass | Pass | Pass | Confirmed | — |
| B-2 | User | Pass | Pass (resolver and layout read) | Pass | Confirmed | — |
| B-3 | Operational | Pass | Pass | Pass (see note 1 on M-1) | Confirmed | Note 1 |
| B-4 | Operational | Pass | Pass (`coordinating-run-migration.ts` moves folders; 461's pattern) | Pass | Confirmed | — |
| B-5 | Contract | Pass | Pass (`agent.ts:79-95`) | Pass | Confirmed | — |
| B-6 | System | Pass | Pass | Pass | Confirmed | — |
| B-7 | User | Pass | Pass | Pass | Confirmed | — |
| B-8 | User | Pass | Pass (`token-usage-stats.ts:338-347`) | Pass | Confirmed | — |
| B-9 | Contract | Pass | Pass | Pass (the list comes in the implementation handoff) | Confirmed | — |
| B-10 | User | Pass | Unclear by design (D-9: reproduce first) | Pass (step 0, then branch A or B) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `source-follow-ups-461.md` | Pass (leads, not decisions) | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` (FU-500-01 … 03) | Pass | Pass | Pass | Pass (FU-007 is fully FU-500-01 after SR-006) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | "Task Design Health Assessment" | — |
| Root cause explicit and evidence-backed | Pass | FU-020 legacy pressure; FU-036 duplicated policy (two attach functions, read); FU-011 and FU-018 behavior by absence (cited lines); FU-013 one ID, two subjects (read) | — |
| Refactor decision explicit | Pass | "Refactor needed now: yes", per item | — |
| Supported by the concrete sections | Pass | Removal plan, DR-1/DR-2 tables, Migration Plan, S-4 narrative | — |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs owner | Naming | One owner per node | Off-spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | Attach | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| S-2 | Open an old attachment | Pass | Pass (walked per case) | Pass | Pass | Pass | Pass | Pass |
| S-3 / S-3b | Migration and follow-up | Pass | Pass | Pass (runner → definition) | Pass | Pass | Pass | Pass |
| S-4 | Early stream command | Pass | Pass (states connecting, ready, refused, closed) | Pass | Pass | Pass | Pass | Pass |
| S-5 | Task closure stop | Pass | Pass (both hosts) | Pass | Pass | Pass | Pass | Pass |
| S-6 | Peer discovery tool | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S-7 | Team total | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| S-8 | Refusal | Pass | Pass (style FR-1 … FR-4) | N/A | Pass | Pass | Pass | Pass |
| S-9 | Grok refused tool | Pass | Pass (reproduce first) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry point clear | Internals internal | Bypass controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ContextFileOwnerResolver` | Pass | Pass | Pass | Pass | One fewer owner kind. `DelegatedChildLocations` is deleted, not bypassed |
| The WebSocket attach function | Pass | Pass | Pass | Pass | One function for four streams |
| `AgentRunService` / `TaskExecutionResourceRelease` | Pass | Pass | Pass | Pass | Required ports, with each host's value explicit |
| The new migration definition | Pass | Pass | Pass | Pass | Imports only `domain/`, `frozen/` and node APIs (the boundary test) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed | Shortcuts explicit | Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Composition of both hosts | Pass | Pass | Pass | Pass | DR-1 and DR-2 tables name what each host passes |
| Migration ↔ current code | Pass | Pass | Pass | Pass | Frozen helpers only |

Owners receive their collaborators from the composition root (Principle 16): `Pass`.
- The silent finds are replaced by passed values.
- The remaining process getters fail loudly at framework edges and are recorded as FU-500-02 (`Pass — deviation recorded, reason holds`, design "Deliberately left alone").
- `getProjectTaskService()` becomes a loud getter, and both hosts initialize it at composition (verified above).

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `getTeamRunTokenUsageSummary(teamRunId)` | Pass (team runs only) | Pass | Pass | Low | Pass |
| Attachment final routes (`/rest/runs/…`, `/rest/team-runs/…/agent-runs/…`) | Pass | Pass | Pass | Low | Pass |
| The stream answer `SESSION_NOT_READY` on all four streams | Pass | Pass | Pass | Low | Pass |

Principle 13's empty-indirection check: `Pass`.
- `REMOTE_COLLABORATION_OFF_DISCOVERY` and `APPLICATION_HOST_STANDALONE_RUNS` are not forwarders. Each is the explicit answer of a host that has no remote collaboration or no standalone runs, which replaces behavior decided by a missing collaborator.
- The design states the rule (DR-2) and says why it is not an empty layer.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision sound | New piece justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rewriting links in traces | Pass | Pass (the frozen `transformContextFileRecordLocators`, used by two precedents) | N/A | Pass | — |
| Backups | Pass | Pass (`app-data-migration-backups/{id}/`, existing location) | N/A | Pass | — |
| Late predecessors | Pass | Pass (461's follow-up pattern and classification test) | Pass | Pass | — |
| Early stream commands | Pass | Pass (extend `attachRunStream`, delete `attachRootStream`) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

`Pass`. Each change stays in its owner's area: context files, websocket, compositions, token usage, app-data migrations, the web's attachment model and run rows. There are no compound owners.

## Reusable Owned Structures Verdict

`Pass`. One parameterized migration class serves the migration and its follow-up (M-7).

## Shared Structure / Data Model Tightness Verdict

| Structure | One meaning | Redundant removed | Overlap controlled | Variant decision | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Context-file owner kinds | Pass | Pass (host-scoped kind removed) | Pass | N/A | Pass | — |
| Stored attachment link | Pass (names its owner after M-2) | Pass | Pass | N/A | Pass | — |

Derived consumers listed with a decision for each (Principle 11): `Pass`. M-8 covers work journals, the search index, the manifest, the history indexes and the `imports/` mirror.

One name per concept (Principle 15): `Pass — deviation recorded, reason holds`.
- N1 keeps "root" with a glossary definition that no longer implies hosting ("a run at the top of its own membership tree … A root never holds another run"). Renaming about 50 types to `…Runtime` would add a diff and no clarity.
- The `TaskExecution…` / stored-name pair is a known leftover by the user's decision (D-5, SR-006), recorded in the glossary.

## File Responsibility Mapping Verdict

`Pass`. The removal plan lists every file and line range. The migration has its own folder.

## Subsystem / Folder / File Placement Verdict

`Pass`. The migration goes in `src/app-data-migrations/migrations/delegated-run-own-attachment-links/`, with its tests under `tests/app-data-migrations/…`. The constants sit beside their contracts.

## Persisted Data / Migration Verdict

`Pass`.
- **Decision:** `Migration Required` for structured links, justified by D-8 and guideline §2.1 and §3. Text mentions, closed journals, the search index, the draft folder and the mirror are inert residue (guideline §6).
- **Admission (M-3):** the link's own folder and file prove ownership, both ends of the reference. The host is deliberately not checked (111 of 231 name an ancestor). That is correct: the old host is not the owner, and the folder is.
- **Backup (M-5):** a byte copy before the first rewrite, never overwritten on retry, `fsync`ed, under `app-data-migration-backups/`. This is the founder's rule and is justified under guideline §7. It is not a rollback engine.
- **Commit:** a per-file temp write, `fsync`, rename and re-read check. An interrupted run retries by structure (S-3 walk).
- **Late predecessors (M-7):** one writer (`20261017_task_agent_own_run_v1`, which moves folders) gets one follow-up. The rest are classified `none` with reasons, and a registry test enforces it. I verified `delegated_copy_own_file_complete_v1` as `none`.
- **Status and availability (M-9):** `requiredOnStartup` with no capability held back. A failure leaves only unconverted attachments unopenable (guideline §1).
- **Rollback (M-10):** beta.7 reads the target link forms.
- **Cost (M-6):** one 8.6 GB byte pass at the first start, 9.3 s warm. The cold time is measured in validation.

## Review Decision

`Pass` (round 10). AR-001, AR-002 and AR-003 are resolved. The combined package is ready for implementation; FU-035's live step follows as IR-002 (D-14).

## Findings

None open.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`). The Solution Designer is informed.

## Residual Risks And Notes (non-blocking)

1. **M-1, exact folder shapes** (round 1). Scan `memory/agents/{runId}/` directly, and member folders directly under a team folder in `memory/agent_teams/…`. Never descend into `agents/{run}/collaboration/…`, and add a fixture for a preserved nested child.
2. **N6** (round 1). Check the callers of `getRootExecutionDirPath`'s `"agent"` case before deleting it.
3. **To verify** (round 1): the web's browser storage for `'transient_execution'`.
4. **Cold-start cost** (round 1). Measure it.
5. **G-2** (round 3). Use the frozen store and validator in the migration.
6. **G-5** (round 5). Race the whole catalog read.
7. **FU-021** (rounds 6 and 7). Align the proof text with D-13b.
8. **G-5 R1** (round 9). While any host of a provider is down, its host-scoped models aren't checked. That is acceptable under D-12; a per-host source status could refine it later.
