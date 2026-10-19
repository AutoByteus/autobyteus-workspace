# Design Review Report — work-journal

## Review Round Meta

- Upstream Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/requirements-doc.md (REQ-W1–W9, DEC-W1–W10, Approved)
- Upstream Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/investigation-notes.md (J01–J17, supplement inventory)
- Upstream Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/solution-revision-record.md
- Reviewed Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-spec.md (SR-014, status Ready)
- Round 3 (ARCH-REV-003, SR-014): a user-approved content-scope change (DEC-W11 and contract D5, U23–U28, 2026-10-19).
  - Omitted from the journal: system_instruction, provider_compaction_boundary, llm_request_recovery and output_limit_recovery.
  - Kept: `Notice:` lines and "Turn interrupted by the user.".
  - Verified as consistent across:
    - requirements REQ-W2 and AC-W2;
    - DEC-W11;
    - contract §8, §11 D5 (D4 superseded), §12 item 12, §14, and the Grok and generic examples;
    - the design-spec rows for BEH-W2 and `non-tool-record-lines.ts`.
  - Rendering scope only: no structural, interface, persistence or classification change. All other verdicts stand.
  - `renderer_revision` can stay 1, because no journal output has been released yet.
- Supplemental Task Artifacts Reviewed: work-journal-contract.md (Approved; §3.3 edited in SR-011), work-journal-builtin-tools.json; the probes are listed as evidence only
- Relevant Solution Revision IDs: SR-010 (architecture design); SR-011 (pass recorded, contract §3.3 edit); SR-012 (authorities-read correction and collaboration_model.md §3 docs row); basis SR-007–SR-009
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/architecture-review-revision-record.md
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Architecture Design Complete (revised), SR-012, a documentation-only delta, sent by /solution_designer
- Prior Review Round Reviewed: ARCH-REV-001 (Pass on SR-010)
- Latest Authoritative Round: 3
- Round 2 delta check:
  - The design-spec "Authorities read" entry now records collaboration_model.md as read in full.
  - The new File Mapping row for collaboration_model.md §3 is justified:
    - §3, lines 77-78, lists a run's memory contents as "raw traces, snapshots, file changes, context files";
    - DESIGN.md lines 327-332 require run-storage changes to follow the model or update it in the same change.
  - The journal sits in the run's own folder, consistent with CM-8 and CM-9.
  - The SR-011 contract §3.3 edit matches §12 item 14, which resolves the editorial part of N5.
  - No other section changed. All round-1 verdicts stand.
- Current-State Evidence Basis: worktree /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal, branch `codex/work-journal`, HEAD 55bff1f5e (no source changes). Files read for this review:
  - raw-trace-file-source-service.ts
  - agent-run-memory-recorder.ts
  - runtime-memory-event-accumulator.ts (lines 98–118, 170–230)
  - agent-run-resource-manager.ts
  - agent-run.ts (lines 159–166, 270–290)
  - backends/shared/runtime-event-dispatch.ts
  - both composition roots
  - agent-work-traces/services/*
  - skill-improvement-service.ts, the target context resolver and the improver session store
  - app-data-migration-registry.ts and app-data-migration-runner.ts
  - remove-external-runtime-working-context-snapshots-migration.ts
  - raw-trace-to-historical-replay-events.ts (lines 140–251)
  - autobyteus-ts agent-turn-runner.ts (lines 276–284) and run-memory-file-store.ts (line 163)
  - DESIGN.md and data_migration_guideline.md §3, §4 and §6

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the change adds:
  - a new subsystem of about 20 files;
  - a new owner attached to every live run's event path;
  - new persisted derived data in every run folder;
  - a deletion migration;
  - a changed persisted shape for skill improvement's session state (strict reader converted to tolerant);
  - a changed evidence contract for the improver.

  This is structural change on several surfaces, not content volume.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The journal is a deterministic Markdown rendering of raw traces, made per raw file, with the format set by the approved contract. It is kept current from run events and replaces the work-trace export (skill improvement is its only consumer).
- Relevant existing behavior and evidence confirmed:
  - The export re-renders every file on each call through the replay projection (agent-work-trace-projection-service.ts:27-63).
  - Skill improvement is its only consumer (the only source import of `agent-work-traces`).
  - RawTraceFileSourceService lists complete segments plus the active file. Segment counts come from the raw manifest (`record_count`); the active count is read from the file.
  - The resource manager attaches the recorder per run in both composition roots.
  - The improver session store's reader is strict (`schemaVersion === 1`).
- Scope guardrail confirmed: in-scope use cases SCN-W1–W7. Out of scope: work notes, runtime switching, changes to raw traces or compaction, and journal UI. Raw traces, rotation, restore and history display are preserved (REQ-W9). Review authority is technical only.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: N/A, because there are no blocking findings.
- Remaining material ambiguity, if any: None that blocks. See the non-blocking notes.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-W1 | System | Pass | Pass: TURN_COMPLETED and TURN_INTERRUPTED reach every live run's listeners (agent-run.ts, runtime-event-dispatch.ts) | Pass: DS-001 → DS-003 | Confirmed | — |
| BEH-W2 | System | Pass | Pass: the normalizer keeps senderId, media, notices and every trace type (J12). SR-014 omits runtime machinery per DEC-W11 and D5 (user-approved). | Pass: DS-003 | Confirmed | — |
| BEH-W3 | System | Pass | Pass: COMPACTION_STATUS exists, and segments become `complete` in the raw manifest | Pass: DS-001 and DS-004. Closed files are kept while the revision and source count match. | Confirmed | Non-blocking N1 and N4 |
| BEH-W4 | System | Pass | Pass: restore re-attaches through markPrepared → attach, and skill improvement requires a live target (skill-improvement-service.ts:202-206) | Pass: renders on first need, with no startup scan | Confirmed | — |
| BEH-W5 | Contract | Pass | Pass: skill-improvement-service.ts:116-139, the trigger builder and the session store | Pass: DS-002 | Confirmed | Non-blocking N5 and N6 |
| BEH-W6 | Operational | Pass | Pass: the runner runs `requiredOnStartup` definitions and skips terminal statuses (runner:56-75) | Pass: DS-005 | Confirmed | Non-blocking N7 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked To Core Artifacts | Internally Complete | Consistent With Core Artifacts | Status / Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| work-journal-contract.md | Pass | Pass | Pass | Pass. The §3.3 stale passage was fixed in SR-011 and now matches §12 item 14. | Pass | — |
| work-journal-builtin-tools.json | Pass | Pass | Pass | Pass: it matches the contract §4 tables | Pass | — |
| probes/* | Pass | Pass | Pass | Pass | Pass (evidence, not behavior-defining) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature that replaces an existing export | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`: the export borrows the UI-replay projection, which loses record types (J10; projection-service.ts:65-95) | — |
| Refactor decision is explicit | Pass | Refactor needed now: Yes | — |
| Refactor decision is supported by concrete design sections | Pass | New subsystem, removal plan, dead-option removal; the replay projection otherwise stays untouched | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Subject Naming | Ownership | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Run event → current journal | Pass | Pass | Pass | Pass | Pass: updater schedules, service owns content | Pass | Pass |
| DS-002 | Skill Improvement → improver | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded: one raw file → Markdown | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded: reconcile under per-run lock | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Startup → old folders removed | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Updater loop | Bounded: merge bursts | Pass | Pass | N/A | Pass | Pass | Pass | Pass (see N1) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| WorkJournalService | Pass | Pass | Pass | Pass | Imports of `rendering/**` and `store/**` from outside the subsystem are forbidden. Callers that need more use a new service method. |
| WorkJournalFileRenderer | Pass | Pass | Pass | Pass | Pure. Translations are selected through the registry. |
| AgentRunResourceManager | Pass | Pass | Pass | Pass | Uses an injected `Pick<…, "attachToRun">`, the same pattern as the recorder |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-work-journal | Pass | Pass | Pass | Pass | No imports from backends or run-history projection (DEC-W9). The journal reads raw traces only. |
| agent-execution → updater | Pass | Pass | Pass | Pass | Injected; execution never imports journal internals |
| skill-improvement → service | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ensureCurrent({runId, memoryDir, runtimeKind})` | Pass | Pass | Pass | Low | Pass. N5: name one source for `runtimeKind`. |
| `WorkJournalPackage` | Pass | Pass | Pass | Low | Pass |
| `attachToRun(run)` | Pass | Pass | Pass | Low | Pass |
| `render(input)` / `RuntimeTranslation` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Raw file listing and normalization | Pass | Pass (reuse) | N/A | Pass | Same construction as the current source reader: `MemoryFileStore(dirname(memoryDir), runRootSubdir "")` |
| Per-run event following | Pass | Pass (extend) | N/A | Pass | — |
| Recorder flush | Pass | Pass (reuse `waitForIdle`) | N/A | Pass | N1 |
| Replay projection / ts renderers | Pass | Pass (not reused, with reasons) | Pass | Pass | — |
| Migration runner | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Serves Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-work-journal (new) | Pass | Pass | Pass | Pass | Replaces agent-work-traces |
| agent-execution | Pass | Pass | Pass | Pass | Wiring only |
| skill-improvement | Pass | Pass | Pass | Pass | — |
| app-data-migrations | Pass | Pass | Pass | Pass | — |
| run-history | Pass | Pass | Pass | Pass | Removal only |

## Reusable Owned Structures Verdict

| Structure | Need Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| command-text, result-envelopes, tool-outcome, text-diff, output-shortener | Pass | Pass | Pass | Pass | All live under the renderer, with no runtime switch inside |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Journal manifest | Pass | Pass | Pass | N/A | Pass | `renderer_revision` is a cache key for derived output that DEC-W10 approves, not a schema version. No reader branches on old shapes. N4 covers which count to store. |
| WorkJournalPackage | Pass | Pass | Pass | N/A | Pass | — |
| ToolOutcome | Pass | Pass | Pass | N/A | Pass | — |
| Improver session state | Pass | Pass | Pass | N/A | Pass | Tolerant projection per guideline §3 |

## File Responsibility Mapping Verdict

| File group | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| services/work-journal-service.ts | Pass | Pass | Pass | Pass | — |
| services/work-journal-run-updater.ts | Pass | Pass | N/A | Pass | — |
| store/work-journal-store.ts | Pass | Pass | N/A | Pass | — |
| rendering/** and rendering/runtimes/* | Pass | Pass | Pass | Pass | Each contract section maps to one file; the entry writer was merged into the renderer |
| Migration file and registry entry | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches Owner | Mixed / Over-split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/agent-work-journal/{domain,services,store,rendering,rendering/runtimes} | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/agent-work-traces/** and tests | Pass | Pass | Pass | Pass | The only source imports are in skill-improvement (verified) |
| Replay options at :142-144, :154-160, :243-251 | Pass | Pass | Pass | Pass | No test passes them outside agent-work-traces (verified) |
| Skill-improvement types, fields and metadata keys | Pass | Pass | Pass | Pass | — |
| Docs (server and web) and improver templates | Pass | Pass | Pass | Pass | N6: one web test title is missing from the list. SR-012 adds collaboration_model.md §3 (verified). |
| Stored `work_traces/` folders | Pass | Pass | Pass | Pass | Migration |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Export, session fields, runtime aliases, lazy deletion | No | Pass | Pass | The rejection log is complete. The §6 text normalization is a contract rendering rule, not a second data path. |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<run>/work_journal/` (new) | Not Affected (new, disposable) | Pass | Pass | N/A | Pass | Exact writer, tolerant reader, rebuildable. Atomic `.tmp` files are excluded from memory sync. |
| `work_traces/` folders (7) | Discard or Rebuild, deleted by migration | Pass | Pass | Pass | Pass | Shapes (a), (b), (c) plus a decoy fixture. MIGRATED, SKIPPED or FAILED dispositions with a warning aggregate. A retry finds the remaining folders. No backup, because the folders are regenerable and deletion is approved (DEC-W10). |
| improver_session.json (3) | Directly Usable | Pass | Pass | N/A | Pass | The old fields are inert (J11). The reader becomes a projection, and old keys drop on the next save. |
| record.json `evidenceSummaryHash` | Not Affected | Pass | Pass | N/A | Pass | Same meaning |
| Raw traces and manifests | Not Affected | Pass | Pass | N/A | Pass | Read only |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8: renderer → service → updater → skill improvement → removal → migration → text → validation | Pass | Pass (none needed) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime translation, updater, closed-file reuse, pairing, manifest | Yes | Pass | Pass | Pass | The contract §10 gives per-runtime examples |

## Material Premise Validation

### P1 — AutoByteus-native final records land after TURN_COMPLETED is observed
- Related requirement: REQ-W6 / AC-W6. Behavior: BEH-W3.
- Initiating basis kind: `System`. Trigger: a native turn completes normally.
- Forward path: `AgentTurnRunner.completeWithFinalResponse` (agent-turn-runner.ts:276-284).
  - The LLM phase records the assistant response synchronously first (llm-phase.ts:280 `ingestAssistantResponse` → `RunMemoryFileStore.appendRawTrace` with appendFileSync).
  - `notifyAgentTurnCompleted` runs after that write.
  - The server converts the notification into TURN_COMPLETED afterwards.
- Reachability: `Not Reachable` on the code path read. The design's step-3/8 confirmation test is still appropriate and needs no extra machinery.
- Review consequence: None.

### P2 — External-runtime final assistant text is written in response to TURN_COMPLETED itself
- Related requirement: REQ-W6 / AC-W6. Behavior: BEH-W3.
- Initiating basis kind: `System`. Trigger: an external-runtime turn ends with an open assistant segment.
- Forward path:
  - The recorder's listener runs `completeTurn` → `flushSegment` → `writeAssistantTrace` (runtime-memory-event-accumulator.ts:98-100, 170-177, 219-229), enqueued on the per-run queue.
  - Listeners are a Set and are dispatched in subscription order (agent-run.ts:159-166; runtime-event-dispatch.ts:6-12).
  - `waitForIdle` captures the queue at the moment it is called (agent-run-memory-recorder.ts:57-60).
- Reachability: `Reachable`, as a normal scenario.
- Consequence if the updater subscribed before the recorder: the journal would miss the turn's last assistant message until the next turn.
- Review consequence: the design already attaches the updater after the recorder, so there is no defect. The ordering is a load-bearing invariant that the design states without its reason. See non-blocking note N1.

### P3 — An in-flight update writes after a run folder was deleted
- Initiating basis kind: `User`. The user terminates a run, then deletes it from history while a render is still running.
- Reachability: `Technically Possible but Unsupported/Contrived`. It depends on deleting within the sub-second render window. No product contract covers it.
- Review consequence: no finding and no machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and the design is ready for implementation. No in-scope machinery depends on an unsupported premise.

## Findings

None blocking.

Non-blocking notes for implementation. None of them changes approved behavior, so the design spec doesn't need a revision before implementation.

- **N1 — Updater after recorder (P2).**
  - *Note:* state the reason for the attach order where the updater is wired in AgentRunResourceManager: the recorder writes the final assistant text when it receives TURN_COMPLETED.
  - *Test:* in step 3, use an external-runtime fixture whose last assistant segment is flushed only on TURN_COMPLETED, and assert the open file contains that text.
  - *Updater:* it must call `waitForIdle` in or after its listener callback, never before.
- **N2 — Measure blocking of the event loop, not only render time.**
  - Rendering and raw reads are synchronous on the server's shared event loop. RawTraceFileSourceService uses `readFileSync`, and it reads the active file twice per update: `countJsonlRecords`, then `readRawTracesActive`.
  - "Off the run's critical path" holds for the run's own awaits. A 28 MB open file still blocks every run's streaming while it renders.
  - In step 8, record the main-thread time per update on the largest synthesized open file (DESIGN.md §7, "main-thread work"). State the threshold that triggers the existing escalation and Follow-up 4.
  - This is a validation obligation, not new design work.
- **N3 — Remove unnecessary work on the updater path (DESIGN.md rule 5).**
  - `ensureCurrent` hashes every journal file on each call, and the updater never uses the package.
  - Compute the evidence hash only from content already in memory, plus closed-file hashes (for example kept in the manifest), or only when a consumer needs the package.
  - Choose whichever is simplest. Reading all closed journal files every turn is the shape to avoid.
- **N4 — One source for the closed-file count check.**
  - Store `source_record_count` for segments from `RawTraceFileSource.recordCount`, which is the raw manifest's `record_count`.
  - Compare against that same field.
  - A normalized-record count would differ whenever the normalizer skips a line. The file would then be re-rendered silently on every turn.
- **N5 — Where `runtimeKind` comes from.**
  - Skill improvement's `context.runtimeKind` is `RuntimeKind | string | null` from metadata (target-context-resolver.ts:21,62,92). The updater uses `run.runtimeKind`.
  - Have skill improvement pass the active AgentRun's `runtimeKind`; `requireLiveTarget` already looks the run up. Then both callers give the same runtime, and a closed file is never frozen with a different translation.
  - `WorkJournalTarget.runtimeKind` can then be `RuntimeKind`. The registry's unknown-kind fallback to the generic rule stays, for a future kind that has no translation yet.
  - Editorial part resolved in SR-011: contract §3.3 now matches §12 item 14.
- **N6 — AC-W8 wording sweep.** autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts:407 has the test title "…ordered work trace replay". It is about run-history replay, not the export. Rename it, or note it explicitly in the AC-W8 evidence.
- **N7 — Name the migration root.** Walk `appConfig.getMemoryDir()`, as the precedent migration does, and do not descend into a recognized `work_traces/` folder before deleting it.

## Classification

N/A (Pass).

## Recommended Recipient

/implementation_engineer (primary). /solution_designer receives an informational notice.

## Residual Risks

- **Per-turn re-render cost on large open files** (p90 5.2 MB, max 28 MB). It is bounded, measured in step 8 and escalated by the design's trigger (N2).
- **Grok coverage** rests on documentation and one small live run.
- **Memory sync carries `work_journal/`**, which adds derived bytes. This is accepted by DEC-W10.

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate: Pass
- Notes: ARCH-REV-003 on SR-014, a user-approved content-scope change that affects only the contract §8 rendering rules and their tests. Pass. Before that, ARCH-REV-002 on SR-012 was a documentation-only delta. The ARCH-REV-001 Pass stands, and the collaboration_model.md §3 docs row is added to implementation scope. Non-blocking notes N1–N7 still apply; the editorial part of N5 is resolved. None changes approved behavior.
