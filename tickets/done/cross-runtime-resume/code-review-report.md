# Code Review Report — autobyteus-316 (cross-runtime-resume)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 1, CRR-001), `API/E2E Failure-Origin Review` (round 2, CRR-002) and `Implementation Review` of the rework IR-002 (round 3, CRR-003; the latest authoritative result)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `run-runtime-switch-contract.md` (v2), `prerequisite-stored-runtime-names.md`; others context only
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Fail → ARCH-REV-002 Pass; ARCH-F-001…006)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003, ARCH-REV-004 (Pass, incl. ARCH-F-007, ARCH-F-008 and the switchId addendum)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003` (history: `CRR-001` round 1, `CRR-002` round 2)
- Current Review Round: 3
- Review Scope: round 1 `Full Review`; round 2 `N/A` (failure-origin round); round 3 `Full Re-Audit`
- Trigger: implementation handoff IR-001 (Large / High)
- Prior Review Round Reviewed: round 2 (CRR-002, Fail: F-1, F-2 Design Impact; F-3 Local Fix)
- Review Scope Evidence (round 3): the rework changes the activation order (the data-flow spine of DS-002), the memory port, the shape of `pendingRuntimeSwitch`, the library store and two readers (chat, hand-over), and spreads beyond the three findings' files
- Latest Authoritative Round: 3
- Coverage Investigation Reviewed (failure-origin): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: API-02 / RS-01 (switch to and from the native runtime on the built server)
- Exact Failing Commands / Execution Mode: `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch` (built server, test-owned LM Studio stand-in for the native model, scripted Antigravity CLI)
- Failure Evidence Paths: `evidence/api-e2e/API-02-03-04-built-server-switch.log`; `evidence/api-e2e/rs01/runtime-switch-native/{raw_traces_000002.jsonl.types.txt,raw_traces_active.jsonl.types.txt,raw_traces_manifest.json,chat-projection.json}`; `evidence/api-e2e/OBS-1-pending-native-model-edit.log`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. 86 files, 2,164 insertions: persisted-state field, activation sequence, raw-trace rotation, notice slot, journal runtime per file, GraphQL clean cut, web.

## API/E2E Failure-Origin Review (round 2, CRR-002; resolved in round 3, see below)

Scope: classify the origin of the API-02 / RS-01 failure and one API/E2E observation; no repeat of the round-1 audit. Method: `Read` the cited source; the failures themselves were `Measured` by API/E2E on the built server at `60c3ac4ec8` (production code unchanged since `3521ae05f1`). I did not rerun the E2E; the evidence files hold the observed records. Passing API/E2E results (RS-02 settings, RS-03 host with a copy, never-switched journal identity 15/15, codegen, API-08 live run) are taken as reported.

The failing scenario still represents approved behavior: REQ-010 / I-7 / AC-002 (a segment never holds records of two agent runtimes; archive, marker, notice) and the Task's observable success, requirements-doc line 18 (the chat shows the earlier conversation unchanged and a marker). Both are supported normal scenarios: a user switches a stopped run to the native runtime and sends a message; later reopens the chat.

| Candidate | Observation | Independent trigger / path | Evidence | Disposition | Origin |
| --- | --- | --- | --- | --- | --- |
| F-1 | In the Antigravity → native direction the native candidate's `system_instruction` record is written into the previous agent's archived file, before the marker; the new active file has none of its own | User's first message after a saved switch to native. Path: `activateSwitched` → `beginActivation({kind:"new"}).prepare()` (native bootstrap runs `SystemPromptProcessingStep`, `system-prompt-processing-step.ts:39` → `memoryManager.recordSystemInstructionSupply` → `RunMemoryFileStore.recordSystemInstructionSupply` appends to the run's active raw-trace file, `run-memory-file-store.ts:128-152`) → `memory.record` (marker, rotate) | `raw_traces_000002.jsonl.types.txt`: 6 records, the last a native `system_instruction` at ts …342.932; marker at …342.945; manifest entry 2 `record_count: 6`, `runtime_kind: antigravity_cli`; active file starts with the marker and holds no system instruction. Native → Antigravity is clean (segment 1 = the 3 native records) | Promote | Design (the lifecycle order prepare → marker/rotate is the designed sequence, contract §3.3 steps 2–3, with the unverified premise that preparing writes nothing to the raw-trace file) |
| F-2 | After a switch the reopened chat starts at the latest marker; the earlier conversation is missing from `getRunProjection` | User reopens the chat (web hydrates from `getRunProjection`). Path: `LocalMemoryRunViewProjectionProvider.buildProjection` reads memory with `includeArchive: false` (`local-memory-run-view-projection-provider.ts:43`); DEC-7 moves the previous agent's conversation into an archived segment | `chat-projection.json`: 4 items (marker, notice, user, assistant) of the last agent only | Promote | Design (F-15 / F-28 and Change Scope "Chat history projection … no change" assumed the projection shows all files; the data-model probe fed `buildHistoricalReplayEvents` every file by hand; DS-002 / BEH-005 say "live and on reload") |
| F-3 (from OBS-1) | A model-only edit while a switch to native is pending is validated as a replacement of the pending (never started) model: "Both models need verified context capacities before replacement" | Supported explicit edge: a second save before the first message (contract §3.1). Path: updater → `selectionContextFor(metadata, input)`: `selection.runtimeKind === metadata.runtimeKind` (the pending, new runtime) → `currentModelIdentifier = metadata.llmModelIdentifier` (the pending model) → native capacity rule (`run-model-selection-service.ts`: `!unchanged && currentModelIdentifier !== null`) | `OBS-1-pending-native-model-edit.log`: switch to native A saved; native A → B with the switch pending → `VALIDATION_FAILED` with that message; stored metadata unchanged | Promote | Implementation (REQ-001 and the context's own comment say a selection of a runtime the run is not on is fresh; the pending model has never run on its runtime, so it is no "current" model; a bounded fix in one function) |

The candidates rejected in round 1 (C-1…C-6) are unchanged.

### Was it detectable in source review?

- F-1: yes, in part. I raised the native pair as a residual risk and asked API/E2E to cover it, but I wrote that the design's premise ("a prepared native candidate writes no raw-trace record before the marker") held because the capture is pending. I had seen `run-memory-file-store.ts:138-146` appending the record in my own search output and did not read it. That premise was wrong and my round-1 residual-risk note concluded too early. The design and the architecture review carried the same unverified premise (contract §3.3 step 2 says "nothing is published", not "nothing is written").
- F-2: yes. BEH-005 says "on reload"; I marked it `Confirmed` from the marker record and the web label without reading the projection provider's `includeArchive: false`. The design's F-15 (`Read`) says the projection "does not branch on the runtime kind", which is true and does not say it reads archives.
- F-3: yes, readable from `selectionContextFor` and the validator in round 1; the design did not state the pending-state case. Missed by me.

Round-1 `Pass` (CRR-001) is superseded by this result.

## Implementation Re-Review of the rework IR-002 (round 3, CRR-003)

Basis: `design-spec.md` "Activation Sequence" and the contract §3.3, §3.6, §3.7 (ARCH-REV-004 Pass). Diff `24b836fd3b..1bc6f85506` read in full for source (lifecycle, port, recorder, writer, library store and JSONL readers, notice service and reader, chat reader and projection provider, selection context, switchId in the metadata, commit, catalog and updater, composition); docs diff; tests by case list; evidence IMP-01…IMP-06 read. I did not rerun the checks recorded in IMP-01…IMP-06 (code unchanged since `1bc6f85506`; later commits are evidence and documents).

### Prior findings

| Finding | Round-2 status | Round-3 status | How verified |
| --- | --- | --- | --- |
| F-1 (a native candidate's record lands in the previous agent's segment) | Open, Design Impact | **Resolved** | `activateSwitched` takes a ticket (`begin`: watermark = last record id, writes nothing) before `prepare`, then `record` archives *through the watermark* only, so a record the candidate wrote while preparing stays after the marker (library rule 3: marker, then the records after the watermark). Built-server RS-01 (native → Antigravity → native) is green with the "candidate writes nothing before the marker" assertion (IMP-04); the live Claude → Codex → scripted Antigravity run keeps exact segments (12 and 7 records, IMP-05). A failed attempt: `discardFailedSwitchAttempt` aborts the candidate and only then removes what it wrote after the watermark; `candidate.abort()` can only return `aborted` or `quarantined` (pending is mapped to quarantined and throws, so no discard); for a failed `prepare` the operation's own `inspect() === "released"` decides (the operation releases itself in its catch). Tests with real files: `runtime-switch-failed-attempts.test.ts` (native start that throws after its instruction was written, retry, abandon, a failed attempt on a run that already switched once) |
| F-2 (reopened chat lacks the earlier conversation) | Open, Design Impact | **Resolved** | `MemoryFileStore.readChatRawTraces` returns the `runtime_switch` segments in index order, then the active file; `buildProjection` and `buildActiveTracePage` both use `getChatRawTraceSnapshot`; compaction segments stay unread (BEH-A4 kept); a never-switched run reads the active file only. Built-server RS-01 reload chat assertion green; unit `runtime-switch-chat-history.test.ts` (native → other → native) and the projection provider test |
| F-3 (pending model validated as a replacement) | Open, Local Fix | **Resolved** | `selectionContextFor` gives no current model while `pendingRuntimeSwitch` is present; updater test; built-server RS-02 |

### Handoff questions

1. `readPendingRuntimeHandover(memoryDir)` in `agent-memory/services/runtime-handover-reader.ts` instead of `hasPendingRuntimeHandover(runId)` on `MemoryFileStore`/`AgentMemoryService`: **confirmed**. Same owner (agent-memory), same behavior (read-only, stops at the first `user` record or at the first record of a run that never switched, returns the marker). The notice service takes it as an injected function and imports only its type; the composition wires it; no dependency in the wrong direction. The `memoryDir` addressing is the notice service's real input (`run.config.memoryDir`).
2. `discardFailedSwitchAttempt` and the abort/discard order: **confirmed** as described under F-1. `candidateIdentityError` replacing the aborting validation for this path only is right (the identity failure now goes through the same abort-then-discard route); `validateCandidateOrAbort` is kept for the restore path that still uses it. The fixture change (a failed preparation reads as `released`) matches the real operation (`agent-run-activation-operation.ts` catch → `releasePrivate`).
3. `rotateActiveRawTracesForRuntimeSwitch` rules: **confirmed**. Segment exists → the watermark is ignored, archived ids are removed from the active file, the marker is ensured first (interrupted rewrite and failed commit retries); marker present without a segment (previous era was empty) → ensure first; else archive through the watermark (none when the watermark is null) and write marker + the records after it; an unknown watermark throws (it cannot occur after a rule-1 case, because a segment is published before the active file is rewritten). `removeActiveRawTracesAfter` is guarded by this switch's own key and removes nothing when a non-null watermark is not in the file.

### Candidate Finding And Mechanism Gate (round 3)

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-8 | Discard failing or skipped (quarantined cleanup) leaves the failed candidate's record after the watermark; the next attempt's watermark then includes it, so it would be archived with the previous agent | Failed activation whose cleanup is quarantined, then restart | Design "Guards and bounds"; `discardFailedSwitchAttempt` | Reject | Requires a cleanup failure plus restart; the design states the quarantine rule and a process crash is not a supported scenario |
| C-9 | `removeActiveRawTracesAfter(null, …)` removes the whole active file; a null watermark also results if the last complete record had no id | Failed attempt on a run whose last record has no string id | `traceId(record)` is null only for a record without an id; every raw-trace record the writers produce has one | Reject | No supported data has such a record; optional hardening: let `begin` throw when the file is non-empty and the last record has no id |
| C-10 | Hand-over derivation depends on the order: the `user` record is written after the notice is taken | Every first input after a switch | Built-server RS-01/RS-02 and the live run assert the notice before the user's text and once; a restart carries the notice again only when a forwarded input had no `user` record yet (documented) | Reject | Evidenced by the E2E; the documented restart case is the design's choice |
| C-11 | The chat now reads every `runtime_switch` segment on each projection and page request | Reload of a switched run | Segments are the previous eras (bounded by the run's size), read only for switched runs | Reject | No consequence shown; design-chosen |
| C-12 | RS-01's title and comment (API/E2E's file) still carry the first design's premise | | Handoff | Reject (not source) | For API/E2E to correct |

### Structural re-audit (round 3)

All structural checks of round 1 re-run on the delta: Pass. Notes: the port moved to `runtime-switch-memory-port.ts` (one interface of three methods, owned by agent-execution; the notice port and `register` are gone, so the lifecycle no longer knows the notice); `RuntimeSwitch.markerTraceId` is derived in one function; library methods sit on the store that owns the file and share `archiveAndRewriteActive`'s write path; the JSONL readers are bounded and read-only and never cut a damaged end; the notice service holds only a per-publication cache. Dead code: the old `getRuntimeSwitchState`, `register`, the notice port and `requestedAt` are removed (grep finds no use). Effective non-empty lines (comments and blanks excluded), base → head: lifecycle service 333 → 396, `run-memory-file-store.ts` 356 → 420, `jsonl-log-file.ts` 116 → 179, `memory-file-store.ts` 169 → 177, `external-runtime-memory-writer.ts` 118 → 145; all under 500, deltas under 220. Legacy: `requestedAt` was never released (the first implementation was never merged), so the clean cut to `switchId` needs no migration.

## Review Scope

- Changed implementation and behavior reviewed: pending-switch metadata and its parse; `buildRuntimeSwitchMetadata` / `commitAgentRunRuntimeSwitch`; catalog `commitRunRuntimeSwitch` and `recordRunStarted({clearPendingRuntimeSwitch})`; `StandaloneStoppedRunSelectionUpdater`, selection context, eligibility; `StandaloneAgentRunLifecycleService.activateSwitched` and the generalized retry rule in `persistAndPublish`; ports and `RuntimeSwitch` in `agent-execution/domain`; `RuntimeSwitchRecorder` and writer additions; library `runtime_switch` boundary type; `RuntimeHandoverNoticeService`/builder and their composition; Work Journal per-file runtime (service, store, models) and `memory-run-discovery`; GraphQL rename and `runtimeKind`; delegated-save host selection; web store, drafts, client, settings component, editor, marker label, localization; docs; the test files by name and coverage; the live runtime-switch E2E's design and gates.
- Files / areas reviewed: `git diff a8d7c8756494..24b836fd3b` (non-test source in full; tests by case list and targeted reads).
- Explicit exclusions: checks recorded in the handoff (clean-clone typecheck, 7582 server and 4871 web tests, the real three-runtime run) were not rerun; code is unchanged since `3521ae05f1` (later commit is documents and evidence). The gated live suite and codegen against a live schema were not run by me.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a stopped standalone Agent run can be saved with another agent runtime and model (undoable); the first input makes the switch (fresh session, marker + archive of the previous agent's records, hand-over notice before the user's text, once); the journal renders each file with its own runtime; chat shows the marker; teams, Org members, delegated copies and agent-started switches are out of scope.
- Design-spec behavior map verified against the implementation: yes; DS-001, DS-002 and DS-003 are realized with the node names the design gives (the updater, `commitAgentRunRuntimeSwitch`, `activateSwitched`, `RuntimeSwitchRecorder`, `RuntimeHandoverNoticeService`, `fileRuntimeKind`).
- Design review report and round confirmed: ARCH-REV-002 Pass; ARCH-F-002 (root/host unchanged), ARCH-F-003 (`openRawTraceRuntimeKind` as the one owner, used by `memory-run-discovery`), ARCH-F-004 (343 merged; no mapping in this code), ARCH-F-005 (rename completed: the only remaining old name is a doc-comment line in the generated file, see C-3), ARCH-F-006 present.
- Behavior-basis status: `Confirmed` in round 3 (round 2 had contradicted BEH-002 for a native target and BEH-005 on reload; both now hold, see round 3)
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Web store `saveAgent` → `updateStoppedAgentRunSelection` (resolver parses `runtimeKind`) → `StudioRunModelConfigService` → lifecycle `updateStoppedSelection` in the transition lane → updater (active/archived/eligibility/fresh validation) → `commitRunRuntimeSwitch` → `buildRuntimeSwitchMetadata` (switch keeps first `from`/`requestedAt`; original runtime = undo; own runtime = model-only) → write + read-back | None |
| BEH-002 | Confirmed for Claude, Codex and Antigravity targets; contradicted for a native target in round 2 (F-1) | `activateOnce` → explicit `pendingRuntimeSwitch` → `activateSwitched`: fail closed without ports → `beginActivation({kind:"new"}).prepare` → validate → `memory.record` (throw → `abortForRetry`) → `persistAndPublish` with `clearPendingRuntimeSwitch` → `notices.register` | None |
| BEH-005 | Contradicted in round 2 (F-2: the reopened chat lacks the earlier conversation; the marker itself is recorded and shown) | Marker is a `system_task_notification` record with sender `system.runtime_handover` and the key as correlation id; live presentation from the notice service; web label by sender | None |
| BEH-007 | Confirmed | `fileRuntimeKind`: archived segment → manifest entry (`runtimeKindFromString`), open file → target; manifest `runtime_kind` per file; reuse requires equal runtime; entries without the field are dropped and re-rendered | None |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Behavior | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-1 | BEH-001 | User | Run owner | Continue a stopped run on another agent runtime | Settings of a stopped standalone Agent run | Normal | DS-001 | Pending switch saved | Requirements REQ-001, AC-001 | Supported Normal | Use |
| SC-2 | BEH-001 | User | Run owner | Change mind before sending | Same settings, original runtime chosen | Explicit Edge | DS-001 undo branch | Original session restored, field cleared | REQ-001, AC-001 | Supported Explicit Edge | Use |
| SC-3 | BEH-002 | User | Run owner | First message after the save | Chat input | Normal | DS-002 | Marker, archive, notice before user text | REQ-002, AC-002 | Supported Normal | Use |
| SC-4 | BEH-002 | System | Activation that fails and is sent again | Retry after a failed marker/archive or a commit that did not land | Existing `activateOnce` retry | Explicit Edge | DS-002 | One marker, completed switch | REQ-010, AC-009 (design: process crash not supported) | Supported Explicit Edge | Use |
| SC-5 | BEH-007 | System | Journal made current for a switched run | Each file rendered with its own runtime | `ensureCurrent` | Normal | DS-003 | Correct per-runtime rules; unchanged for unswitched runs | REQ-012, AC-006 | Supported Normal | Use |
| SC-6 | BEH-001 | User | Host with delegated copies | Combined Save carries host runtime | Delegated launch selection Save | Explicit Edge | design Change Scope | Host switch goes through the same updater | Design Change Scope | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | Handoff question 1: does the model-only branch of `buildRuntimeSwitchMetadata` keep the old behavior of the removed `commitAgentRunModelConfig`? | SC-1 / AC-007 | Model-only save | Old: unchanged iff model id equal and `llmConfig ?? null` equal; else `{...metadata, llmModelIdentifier, llmConfig: clone-or-null}`, read-back compares those two fields. New: `{...metadata, llmModelIdentifier, llmConfig}` (the pending field is kept because the branch spreads `metadata`, not `rest`), unchanged iff deep-equal to the stored metadata, read-back compares the whole object | Compared both functions line by line; `normalizeMetadata` always stores `llmConfig` as `null` or a value (never missing), so `llmConfig ?? null` and the whole-object compare agree; the read-back object is the store's own normalized form of what was written | Reject (no defect) | n/a | Equivalent for every metadata the store returns. Pending switch left alone is shown by the "model-only edit; a pending switch stays" test. Confirmed. |
| C-2 | Added per-switch machinery: marker idempotence by key, abort on throw of memory port, generalized `unchangedIsRetryable`, fail-closed when ports missing | SC-4 | Failed activation sent again (existing retry) | Marker once; switch completes; no double write | `runtime-switch-recorder.test.ts` (retry, stopped-after-marker, two switches), lifecycle suite (`marker/archive failure`, `commit did not land`, plain restore stays indeterminate, no ports) | Reject (supported by SC-4; proportionate; process crash is not designed for) | n/a | None |
| C-3 | `autobyteus-web/generated/graphql.ts` edited by hand; one doc-comment line (`__useUpdateStoppedAgentRunModelConfigMutation__`, line ~10443) still has the old name, which codegen would not produce | Engineering contract (generated file is codegen output) | Next codegen run | Cosmetic diff noise; operations and types match the server SDL by inspection (input `runtimeKind`, `…Selection` names, `canonicalSelection.runtimeKind`) and the GraphQL/store tests | Diff of the file | Reject as a finding (no behavior consequence); advice below | n/a | Regenerate against the built server during API/E2E and commit the diff if any. |
| C-4 | Web settings hint "the agent runtime changes with your next message" also shows when the user selects the original runtime to undo a pending switch (the web compares with the stored runtime, which is already the new one) | SC-2 | Reopen settings of a run with a pending switch and pick the original runtime | Hint text slightly inaccurate; the server message says "cancelled"; no data effect | `ExistingRunConfigEditor.vue` `runtimeChangePending` | Reject (cosmetic, low consequence) | n/a | Optional polish later. |
| C-5 | Literal `'autobyteus'` fallback for a missing `metadata.runtimeKind` repeated in three web places and now feeds a mutation | Contract: `RunMetadataConfigPayload.runtimeKind` is optional in the web type | The server's resume config always returns a `RuntimeKind` | Never reached in supported data; if absent, a model-only save would be read as a switch to native | `runHistoryTypes.ts:81`, `agent-run-resume-config-service.ts:13` | Reject (unreachable on supported data) | n/a | None. |
| C-6 | Journal text for runs that never switched now depends on each archived segment's manifest runtime (null → no-runtime rules) | SC-5 | Segment whose `runtime_kind` is unknown or still an old label | Rendering differs from before only for such segments; autobyteus-343 converted all this node's manifests and every writer stores a `RuntimeKind` | 343 isolated run (825 converted); fixtures in `work-journal-service.test.ts` | Reject (premise covered by prerequisite) | n/a | API/E2E may spot-check a real-shaped run, as the design asked. |
| C-7 | Pre-existing misplaced import in `claude-live-agent-harness.ts` | Out of ticket | `tsc -p tsconfig.json` over tests | None for this change | Same lines on base; commit `f733da620e` | Promote as Follow-up | Follow-up | FU-009 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Cleanup of the runtime lock into a single commit path; no dual path; the old model-only commit removed | None |
| Behavior-defining supplement matched | Pass | Contract §3.1–3.6 and I-1…I-9 match code and tests (marker record shape, key `runtime_switch:<runId>:<requestedAt>`, per-file journal runtime, notice text, no runtime/model names in the notice) | None |
| Spine clarity and preservation | Pass | DS-001/002/003 each map to named nodes; the lifecycle stays the single owner of the order | None |
| Ownership boundary | Pass | Commit shape in one function; order in the lifecycle; marker and rotation in `RuntimeSwitchRecorder`; notice in its service; the fact "runtime of the open file" in `openRawTraceRuntimeKind` | None |
| Off-spine concerns | Pass | Eligibility and selection context are small named modules | None |
| Existing capability reuse | Pass | `beginActivation(new)`, `rotateActiveRawTracesBeforeBoundary`, platform notice slot, `persistAndPublish`, `runtimeKindFromString` | None |
| Reusable owned structures | Pass | `RuntimeSwitch` built once and shared by both ports; `RunProviderBinding` shares the metadata's own fields | None |
| Shared-structure tightness | Pass | `PendingRuntimeSwitch` readonly with exact keys; `RunModelValidationContext` is a narrow variant of the context | None |
| Repeated coordination ownership | Pass | One retry rule (`unchangedIsRetryable`); one switch builder | None |
| Empty indirection | Pass | Ports are real seams (agent-execution does not import agent-memory) | None |
| SoC / file responsibility | Pass | Definition vs helpers in each new file; no mixed layers | None |
| Ownership-driven dependency | Pass | `agent-execution/domain` owns the ports; memory and notice implement them; composition wires | None |
| Authoritative Boundary Rule | Pass | Callers use the lifecycle/updater, not the raw store | None |
| File placement | Pass | Folders match concern (`runtime-handover-notices`, `agent-memory/services`) | None |
| Flat vs over-split | Pass | | None |
| Interface clarity | Pass | `RuntimeSwitchMemory.record(memoryDir, switch)`; `RuntimeHandoverNotices.register(switch)`; mutation input names `runtimeKind` explicitly | None |
| Naming | Pass | Glossary names; `…Selection` rename applied to the single-agent chain; team chain keeps `…ModelConfig` by design | None |
| No unjustified duplication | Pass | Minor: `'autobyteus'` fallback repeated three times in web (C-5) | None |
| Patch-on-patch | Pass | Single round | None |
| Dead code removed | Pass | `commitRunModelConfig`, `agent-run-model-config-commit.ts` removed; grep finds no old name outside a generated comment | None |
| Tests clear and requirement-aligned | Pass | Case names tie to AC/I numbers; retry, undo, second-save, two-switch, plain-restore-still-indeterminate cases present; write/read-back recovery cases kept on the new commit | None |
| Fixtures/helpers reusable | Pass | | None |
| No stale or compatibility-only tests | Pass | Renamed/updated old tests; no compat tests | None |
| API/E2E readiness | Pass | Live three-runtime E2E exists with env gates and isolated roots | None |

## Source File Size And Structure Audit

Effective non-empty lines (blank and comment-only lines excluded), base `a8d7c8756494` → head:

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `standalone-agent-run-lifecycle-service.ts` | 333 | 371 | Pass | Pass (+38) | Pass: the design placed `activateSwitched` here because it needs the file's private helpers | n/a | None |
| `agent-run-history-catalog-service.ts` | 497 | 500 | Pass (exactly 500) | Pass | Pass | n/a | Note: no headroom left; the next change to this file should extract |
| `existingRunConfigStore.ts` (web) | 494 | 500 | Pass (exactly 500) | Pass | Pass | n/a | Same note |
| `general-process-run-supervisor.ts` | 491 | 494 | Pass | Pass | Pass: port forwarded in the input type | n/a | None |
| New files (`-switch-commit` 81, `-pending-runtime-switch` 37, `runtime-switch-recorder` 40, notice service 76, builder 47, updater ~150) | new | all <200 | Pass | Pass | Pass | n/a | None |

By raw non-empty lines (comments included) the catalog and web store would be 504 and 503; I used the effective count the template names. If the team counts comments, these two are a Local Fix (extract the added lines); I judge the effective count right and record the headroom note instead.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | GraphQL clean cut (old mutation and input removed, no alias); no old-label handling |
| No legacy old-behavior retention | Pass | |
| Dead code removed | Pass | |
| Persisted-data decision followed without unnecessary migration | Pass | Optional metadata field, one boundary-type value, derived journal manifest re-rendered; no migration added |
| No version-specific dual reads/writes | Pass | A journal manifest entry without the new field is dropped, not read in an old form |
| Transition mechanics match the reviewed design | Pass | |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done): `GLOSSARY.md`, `agent_memory.md`, `agent_work_journal.md`, `run_history.md`, `autobyteus-web/docs/settings.md`. Delivery should re-verify them against the final code.

## Additional Material Premise Validation

None new or reclassified. MP-1 from the design (registered root while a switch is saved) stays as recorded (FU-008).

## Review Scorecard

- Overall score: 9.4 / 10 (summary only; round 3 full re-audit)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | The activation sequence is the designed one (ticket, prepare, identity check, record, commit, publish) with one failure route | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One memory port; the lifecycle no longer knows the notice; the library owns the archive and discard rules | — | — |
| 3 | API / Interface Clarity | 9.4 | `begin`/`record`/`discard` on a plain ticket; `switchId` explicit | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Library methods on the owning store; readers separate; sizes under 500 | — | — |
| 5 | Shared-Structure Tightness | 9.4 | Ticket and `RuntimeSwitch` are small values; marker id derived once | — | — |
| 6 | Naming and Local Readability | 9.4 | Names follow the design and glossary; the stale generated comment was fixed by codegen | — | — |
| 7 | API/E2E Readiness | 9.3 | The red RS-01 is green on the built server; live three-runtime run green | Grok target, restart and browser cases not exercised | API/E2E to cover what it can |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | F-1, F-2, F-3 resolved with built-server and real-file evidence; failure routes traced against the activation operation | optional C-9 hardening | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut to `switchId`; old port and `register` removed | — | — |
| 10 | Cleanup Completeness | 9.4 | No dead code found; docs updated | — | — |

## Findings

No open finding. Round-2 findings F-1 (Design Impact), F-2 (Design Impact) and F-3 (Local Fix) are **Resolved** in round 3 (table above).

## Follow-ups

- Follow-ups this review added: FU-009 (round 1, in `follow-ups.md`). Rounds 2 and 3: None.

## Classification

Not applicable (Pass). Task size and architectural risk (`Large` / `High`) unchanged.

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- Grok as a switch target (its captured instructions are written at backend creation; the sequence covers it by design and by the real-file test, but no real Grok start was run), a stored pending switch across a server restart, and the rendered Settings page and chat marker in a browser are not exercised.
- The built-server evidence IMP-04/05 was produced from the worktree build, not a clean clone; API/E2E rebuilds anyway.
- Optional hardening C-9 (a non-empty active file whose last record has no id makes the watermark null).
- RS-01's title/comment still carry the first design's premise (API/E2E's file).

- The native agent runtime as source or target of a switch is not in the real run (Claude → Codex → scripted Antigravity); the design expects a prepared native candidate to write no raw-trace record before the marker (system-instruction capture is pending until the first request). API/E2E should cover a switch to and from the native runtime with a scripted model.
- `generated/graphql.ts` was edited by hand; regenerate against the built server and commit any difference.
- Live suite and the real run use the user's signed-in CLIs; not rerun here.
- A server restart between the activation commit and the first dispatch loses the in-memory hand-over notice only (design-accepted).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 3, `Full Re-Audit`, rework IR-002)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (the corrected premises are now in the design: a candidate may write records while it prepares; the chat reads the switch segments)
- Score Summary: 9.4 / 10, every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: F-1, F-2, F-3 resolved. The three handoff questions are confirmed. Remaining risks are listed above; none blocks API/E2E.
