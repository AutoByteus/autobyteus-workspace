# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready — SR-003 user clarification` — the approved external raw-trace-only direction remains unchanged. After CRR-001 / CR-001 exposed a cleanup-failure/inspector wording conflict, the user explicitly chose to retain the simple generic file-backed inspector behavior rather than add defensive runtime-qualified filtering.

## Goal / Problem Statement

Simplify server-owned memory recording for the Codex and Claude runtimes by removing the redundant external-runtime `WorkingContext` snapshot path. Codex and Claude already own their continuation state, while AutoByteus records their normalized activity as raw traces and uses those raw traces for frontend replay, event-monitor projection, work evidence, and provider-compaction archive rotation.

The target direction is therefore:

- Codex and Claude keep provider-owned session/continuation behavior;
- AutoByteus keeps canonical raw-trace recording and archive rotation for those runtimes;
- AutoByteus stops constructing, loading, and persisting `working_context_snapshot.json` as a duplicate external-runtime transcript;
- existing disposable Codex/Claude snapshot copies are removed through a metadata-classified startup cleanup that cannot delete native AutoByteus continuation snapshots or unclassified/imported data.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Codex and Claude provider sessions own runtime continuation and provider-side context compaction. | Unchanged. | AutoByteus must not inject local WorkingContext state into these provider runtimes. | REQ-001, AC-001 |
| BEH-002 | AutoByteus records normalized Codex/Claude user, assistant, reasoning, tool, and provider-compaction events as raw traces. | Raw traces remain the only application-owned conversational/activity record required for these external runtimes. | Trace ordering, tool lifecycle identity, and provider-boundary provenance remain intact. | REQ-002, AC-002, AC-003 |
| BEH-003 | Frontend replay and active event-monitor projection for Codex, Claude, and AutoByteus are built from local raw traces with working-context, episodic, and semantic reads disabled. | Unchanged. Removing external snapshots must not change projected conversation or activity. | Active-trace paging and projection semantics remain unchanged. | REQ-003, AC-004 |
| BEH-004 | The external recorder also accumulates a second `WorkingContext`, loads it when the writer is recreated, and rewrites `working_context_snapshot.json` after normal user/assistant/tool activity. The Memory Inspector generically reads and displays any present snapshot even though normal run projection and provider continuation do not. | Codex/Claude recording no longer constructs, reads, mutates, or writes the duplicate. Successful cleanup makes WorkingContext unavailable while Raw Traces remain. If cleanup reports a deletion failure and retains the old file, the unchanged generic inspector may continue showing that stale copy until retry; this is acceptable. | Provider continuation and all-runtime raw-backed normal run/event-monitor projection remain independent. Native, imported, and unclassified file-backed inspection remains unchanged. | REQ-004, REQ-005, REQ-011, REQ-012, AC-005, AC-006, AC-012, AC-013 |
| BEH-005 | Completed provider-compaction boundaries can rotate settled active raw traces into complete archive segments while leaving the boundary marker active. | Unchanged. | No episodic/semantic memory or native compaction is introduced for Codex/Claude. | REQ-006, AC-007 |
| BEH-006 | Existing metadata-classified Codex/Claude standalone and team-member locations contain approximately 3.18 GiB of external snapshot copies in the probed local corpus. Historical missing-metadata, unmatched, task-like, or imported locations cannot all be safely classified. | A registered, idempotent startup cleanup deletes only the snapshot file at exact standalone/team-member locations whose authoritative current metadata identifies Codex or Claude. It records skipped and failed cleanup outcomes and does not block startup on a partial cleanup failure. A failed unlink retains the file for retry and does not require special read/UI behavior. | Native AutoByteus snapshots, unclassified locations, imported corpora, raw traces/archives/manifests, run/team metadata, provider identifiers, artifacts, and the generic file-backed inspector remain untouched. | REQ-007, REQ-008, REQ-012, AC-008, AC-009, AC-013 |

## Investigation Findings

- `RuntimeKind` currently has exactly three values: `autobyteus`, `claude_agent_sdk`, and `codex_app_server`. `AgentRunMemoryRecorder` records the two external values and explicitly skips native AutoByteus.
- `RunMemoryWriter` currently owns both raw-trace persistence and the duplicate external `WorkingContext` accumulation/persistence.
- `LocalMemoryRunViewProjectionProvider` explicitly requests raw traces and disables working-context, episodic, and semantic reads for normal run projection.
- Codex/Claude provider-compaction boundary handling rotates raw traces and does not use the external snapshot.
- The generic Memory Inspector is a real consumer of the external duplicate snapshot. Removing the snapshot intentionally makes external WorkingContext unavailable there; it does not affect the raw-trace-backed normal run view.
- Current application-data migrations and authoritative run/team metadata provide a proportionate one-time cleanup boundary. Historical task-agent and missing-metadata locations cannot be safely classified and are explicitly excluded.
- The same filename currently represents two different concepts: native AutoByteus continuation state and a non-authoritative external-runtime transcript copy. The cleanup must not conflate them.
- CRR-001 / CR-001 proved a reachable edge case: a non-`ENOENT` unlink failure retains an eligible external snapshot while startup continues, so the generic Memory Inspector can still show it. The user considers that stale optional display acceptable because the failure is reported and application/provider/raw behavior remains healthy.

## Relevant Supplemental Task Artifacts

- [`persisted-snapshot-inventory.md`](./persisted-snapshot-inventory.md) — aggregate, content-safe local corpus evidence for the cleanup value, runtime classification boundary, and preservation exclusions. Status: Complete. Approval applicability: `N/A`.

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` / `Cleanup` / `Performance`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`
- Refactor posture: `Likely Needed`
- Evidence basis: The external recorder duplicates normalized event content into raw traces and an unbounded `WorkingContext` snapshot even though provider continuation and frontend replay do not consume the snapshot.
- Requirement or scope impact: Remove the duplicate path without changing raw evidence, provider continuation, provider-boundary rotation, or native AutoByteus memory ownership.

## Recommendations

1. Keep external-runtime event normalization and raw-trace persistence as the server-owned recording boundary.
2. Remove snapshot-specific update types, accumulator coordination, writer state, reads, writes, and tests where they exist only for Codex/Claude transcript duplication.
3. Preserve native AutoByteus WorkingContext snapshot ownership unchanged.
4. Delete already-persisted external snapshots only from exact current standalone/team-member locations classified by authoritative metadata; never infer runtime identity from filename or path shape.
5. Keep this contract explicit to the two current external runtime enum values. Any future runtime must deliberately choose its recording and continuation contract.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the source removal is bounded, but persisted-data cleanup and the shared recorder path require runtime-identity validation, structural test updates, documentation synchronization, and broad replay/regression coverage.

## In-Scope Use Cases

- UC-001: Record a Codex run into canonical active raw traces without writing an external WorkingContext snapshot.
- UC-002: Record a Claude run into canonical active raw traces without writing an external WorkingContext snapshot.
- UC-003: Project current Codex/Claude conversation and activities from active raw traces after restart.
- UC-004: Rotate settled Codex/Claude raw traces at a completed, rotation-eligible provider compaction boundary.
- UC-005: Reattach the external recorder to an existing run without reading a WorkingContext snapshot.
- UC-006: Remove already-persisted Codex/Claude external snapshots without touching native AutoByteus snapshots or raw evidence.
- UC-007: Inspect a new or successfully cleaned Codex/Claude run after the cutover and use its raw traces while WorkingContext is reported as unavailable.
- UC-008: Continue using the application after a reported eligible snapshot deletion failure; provider continuation and raw-backed views work normally, while the retained stale snapshot may remain visible in the generic Memory Inspector until retry.

## Out of Scope

- Native AutoByteus WorkingContext snapshots, native memory compaction, episodes, semantic memory, and lineage.
- Replacing provider-owned Codex or Claude continuation/session behavior.
- Changing frontend projection semantics or introducing archive history into the active-trace view.
- Adding semantic compaction to Codex or Claude.
- Generalizing the cleanup to a future or unrelated runtime without evidence that it has the same provider-owned continuation and raw-trace projection contract.
- A general raw-trace retention, archive compression, or total-storage quota policy.
- Deleting snapshots from imported corpora, missing/unmatched metadata locations, or historical task-agent locations that lack an authoritative persisted runtime identity.
- Rebuilding, synthesizing, or replacing the removed external WorkingContext view from raw traces.
- Adding runtime-qualified or UI-specific suppression solely to hide an old snapshot retained after a reported cleanup failure.

## Functional Requirements

- **REQ-001:** Preserve Codex and Claude provider-owned session continuation and compaction behavior.
- **REQ-002:** Preserve canonical raw traces for accepted user messages and normalized assistant, reasoning, tool, and provider-compaction activity.
- **REQ-003:** Preserve raw-trace-backed frontend conversation/activity projection and active-trace paging.
- **REQ-004:** Stop writing `working_context_snapshot.json` for Codex and Claude runs.
- **REQ-005:** Remove Codex/Claude recorder dependencies that exist solely to construct, restore, or persist the duplicate external `WorkingContext`.
- **REQ-006:** Preserve provider-compaction boundary deduplication and raw-trace archive rotation.
- **REQ-007:** Treat metadata-classified Codex/Claude external snapshots as disposable duplicate state; no content migration is required because raw traces and provider sessions are authoritative for the supported outcomes.
- **REQ-008:** Any persisted-file cleanup must identify Codex/Claude run ownership from authoritative run/team-member metadata and must not delete native AutoByteus snapshots.
- **REQ-009:** Update tests and durable documentation so they describe the raw-trace-only external recording contract rather than promising external WorkingContext snapshot persistence.
- **REQ-010:** Avoid compatibility wrappers, dual-write behavior, or runtime fallback reads of the removed external snapshot path.
- **REQ-011:** Stop producing or maintaining Codex/Claude WorkingContext snapshots. After successful physical cleanup, the generic Memory Inspector naturally reports no WorkingContext while preserving Raw Traces. Do not add runtime-qualified read/UI suppression: if a reported cleanup failure retains an old file, the existing generic inspector may display that stale snapshot until cleanup retry.
- **REQ-012:** Execute the persisted cleanup through the registered app-data startup migration lifecycle. The cleanup must be idempotent, must expose skipped/failed outcomes, and must not prevent server startup solely because an eligible snapshot could not be removed. A failed unlink retains the file for retry and is not a runtime availability failure.

## Acceptance Criteria

- **AC-001:** Existing Codex and Claude runs can continue through their normal provider session paths after the refactor.
- **AC-002:** New Codex and Claude user/assistant/reasoning/tool activity produces the same canonical raw-trace semantics as before.
- **AC-003:** Tool lifecycle reconstruction remains correct across recorder detach/reattach using the raw-trace corpus.
- **AC-004:** Frontend conversation, activity, and active event-monitor projection for representative Codex and Claude runs is unchanged and is proven to read raw traces rather than snapshots.
- **AC-005:** Creating and exercising a new Codex or Claude run does not create or update `working_context_snapshot.json` in that external runtime's memory directory.
- **AC-006:** Recreating the external memory writer or recorder for a Codex/Claude run does not read a WorkingContext snapshot and continues sequencing from active plus archived raw traces.
- **AC-007:** A completed rotation-eligible Codex/Claude provider compaction boundary still creates the expected complete raw-trace archive segment and leaves the boundary marker active.
- **AC-008:** The startup cleanup deletes the snapshot file from eligible exact metadata-classified Codex/Claude standalone and team-member locations without deleting raw traces, archive manifests/segments, run/team metadata, provider resume identity, or artifacts.
- **AC-009:** The cleanup demonstrably excludes native AutoByteus run and team-member snapshots.
- **AC-010:** Snapshot-only types, APIs, branches, tests, and documentation in the external recorder path are removed rather than left dormant.
- **AC-011:** No native AutoByteus memory-compaction or WorkingContext behavior regresses.
- **AC-012:** A new Codex/Claude run never creates a WorkingContext snapshot. An eligible run whose cleanup succeeded reports no WorkingContext, while Raw Traces remain available and usable. Native AutoByteus inspector behavior is unchanged. When cleanup reports failure and retains an old file, its stale generic inspector visibility is explicitly acceptable and does not invalidate this criterion.
- **AC-013:** Re-running the cleanup after full or partial completion is safe: already-absent files are skipped, eligible exact metadata-classified files are removed, excluded locations remain untouched, and deletion/classification failures are reported without blocking server startup. A failed file remains for manual retry and may remain generically inspectable; provider continuation, future raw recording, and normal raw-backed projection remain unaffected.

## Constraints / Dependencies

- Runtime identity must be resolved from standalone run metadata or the applicable team-member metadata; filename presence is insufficient.
- The current supported external runtime set is closed to `codex_app_server` and `claude_agent_sdk`; a future enum value must not silently inherit this cleanup contract.
- `RunMemoryFileStore` is shared with native memory. A cleanup must be scoped above the generic store or supplied an explicit verified runtime identity.
- Raw traces and complete archive segments must remain sufficient for external recorder sequencing, tool lifecycle reconstruction, frontend projection, and work evidence.
- Implementation should remain a bounded removal/refactor and avoid redesigning native memory.
- The current app-data runner may continue startup after a failed migration result; cleanup reporting must therefore retain actionable failure evidence rather than claiming all files were removed.
- The Memory Inspector remains intentionally file-backed and runtime-agnostic. Physical presence—not runtime kind or migration status—continues to determine whether it can display a snapshot.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: External Codex/Claude `working_context_snapshot.json` files under standalone and team-member memory directories.
- Required outcome: `Discard or Rebuild`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Discard only exact current-metadata-classified Codex/Claude standalone and team-member snapshot copies. Preserve all raw traces, raw-trace archives/manifests, run/team metadata, provider identifiers, artifacts, native AutoByteus snapshots, imported corpora, and unclassified locations.
- Unacceptable data loss or corruption: Deleting native AutoByteus continuation snapshots or any raw evidence/provider-resume metadata.
- Relevant availability, maintenance-window, or rollout constraints: No maintenance window. Cleanup runs through the idempotent startup migration lifecycle and is best-effort; a partial file-deletion failure is reported but does not block server startup. The external recording/provider/projection paths do not consume the file; optional generic inspection may continue until retry.
- Related requirement and acceptance-criteria IDs: REQ-007, REQ-008, REQ-012; AC-008, AC-009, AC-013.
- Evidence: [`persisted-snapshot-inventory.md`](./persisted-snapshot-inventory.md).

## Assumptions

- Codex and Claude provider sessions remain the continuation authority for those runtimes.
- Existing frontend projection continues to use the local raw-trace provider path.
- Existing classified external snapshots are derived transcript copies rather than unique continuation state. Raw traces and provider sessions retain the supported record/continuation outcomes.

## Risks / Open Questions

- Historical snapshots excluded for lack of authoritative runtime metadata remain inert duplicate storage. This is accepted safety residual, not a reason to guess ownership.
- An eligible external snapshot retained after an unlink failure can still appear in Memory Inspector and consume storage until retry. This is an explicitly accepted operational residual, not a trigger for defensive runtime/UI policy.
- A future runtime kind requires an explicit recording/continuation decision; it must not be admitted by a broad `runtimeKind !== AUTOBYTEUS` assumption.
- Downstream executable coverage must distinguish successful cleanup absence from accepted failed-cleanup stale inspection rather than applying one unconditional assertion.

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-005 |
| REQ-002 | UC-001, UC-002, UC-003, UC-004 |
| REQ-003 | UC-003 |
| REQ-004 | UC-001, UC-002 |
| REQ-005 | UC-001, UC-002, UC-005 |
| REQ-006 | UC-004 |
| REQ-007 | UC-006 |
| REQ-008 | UC-006 |
| REQ-009 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007, UC-008 |
| REQ-010 | UC-001, UC-002, UC-005 |
| REQ-011 | UC-007, UC-008 |
| REQ-012 | UC-006, UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Provider-owned continuation regression for both runtimes |
| AC-002 | Normalized external event-to-raw-trace coverage |
| AC-003 | Tool lifecycle reconstruction across restart/reattach |
| AC-004 | Raw-trace-backed frontend replay and active projection |
| AC-005 | Absence of new/updated external snapshot files |
| AC-006 | Recorder/writer reattachment without snapshot reads |
| AC-007 | Provider boundary rotation and deduplication |
| AC-008 | External persisted-data cleanup safety |
| AC-009 | Native AutoByteus exclusion safety |
| AC-010 | Structural removal of dead snapshot path |
| AC-011 | Native memory regression boundary |
| AC-012 | No future external snapshots; successful-cleanup absence; accepted retained-file inspector residual; raw-trace availability |
| AC-013 | Startup cleanup idempotence, exclusion, failure reporting, retry retention, and application availability |

## Approval Status

Approved by the user on 2026-07-31. The approval followed explicit confirmation that:

1. Codex and Claude are external runtimes whose provider sessions own continuation, so the AutoByteus WorkingContext snapshot is redundant.
2. The frontend event monitor and normal run projection come from raw traces rather than the snapshot.
3. The approved requirements retain Raw Traces, remove future external WorkingContext production, make successfully cleaned external WorkingContext unavailable, delete only exact metadata-classified local external snapshots on startup, and preserve native, imported, missing/unmatched-metadata, and otherwise unclassified snapshots.

On 2026-07-31, after CRR-001 / CR-001, the user clarified the failure edge case: when an eligible deletion fails, reporting the failure and keeping the application/provider/raw paths working is sufficient. The user explicitly accepts that the unchanged generic Memory Inspector may display the retained stale snapshot until cleanup succeeds and does not want extra runtime-qualified or UI-specific suppression logic.
