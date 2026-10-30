# Design Review Report — autobyteus-343 (one spelling for the agent runtime in stored raw-trace data)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-002, `Approved`; DEC-1 migrate, DEC-2 imports not rewritten, DEC-3 no per-file backup are the user's decisions)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-11, U-1…U-3)
- Upstream Solution Revision Record: `solution-revision-record.md`
- Reviewed Design Spec: `design-spec.md` (status `Ready`)
- Supplemental Task Artifacts Reviewed: `task-brief-from-316.md` (context only), `solution-designer-handoff.md`
- Relevant Solution Revision IDs: SR-002
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `task_size=Medium`, `architectural_risk=High`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names`, branch `codex/stored-runtime-names`, head `10f3929560`. Code opened: the whole `autobyteus-ts` `raw-trace-archive-manager.ts`, `run-memory-file-store.ts` (270–320), `agent-memory/services/provider-compaction-boundary-recorder.ts`, `memory-recording-models.ts`, the five compaction-payload writers, `runtime-kind-enum.ts`, `app-data-migration-types.ts`, `-registry.ts` (list and `validateDefinitions`), `-runner.ts` (whole), `server-runtime.ts` (startup order), the two predecessor migrations' discovery helpers, `memory-search/pipeline/journals-step.ts`, `agent-work-journal/services/work-journal-service.ts` (`reconcile`, `renderFile`), `memory-sync/source/local-memory-export-scanner.ts`, `memory-file-change-planner.ts`, `shared/memory-sync-path-policy.ts`, `hub/local-file-memory-import-store.ts`; `data_migration_guideline.md` §2, §4–§7; `DESIGN.md` rules 7, 9, 10. Read-only scan of the user's real memory folder (nothing written): manifests by depth, key sets, label counts, entry statuses.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: one new two-file migration, seven one-line writer edits, one type, tests; High because it rewrites persisted user data in place at startup, with side effects on memory search and Memory Sync.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. Size and risk are consistent with the classification rules (small mechanism; High from the persistence change, not from content volume).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: writers write the `RuntimeKind` value (REQ-001); a sealed startup migration converts the own-family manifests with a frozen old-label table, idempotently, one file at a time, keeping unusable content and reporting it (REQ-002…004, 007); no label table or old-spelling reader in current code (REQ-005); fixtures per shape, an isolated run and docs (REQ-006).
- Relevant existing behavior and evidence confirmed: the writer list is complete (grep of all `.ts/.vue/.md`: only the seven sites; the web has none); `RawTraceArchiveManager.readManifest` passes `segments` through without looking at `runtime_kind` and `archiveRecords` idempotence is by `boundary_key` and `status`, never by the label; nothing in `src` reads the stored label; migrations run to completion before `buildStudioServer` (`server-runtime.ts:171-183`), so no agent, rotation, memory-search pass or Memory Sync worker runs during the migration; the registry requires prerequisites to be registered earlier and the runner requires them to be `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` (`app-data-migration-registry.ts` `validateDefinitions`; runner `assertPrerequisites`).
- Scope guardrail confirmed: yes. The 7,532 in-record copies, imports, the field name and the `…ModelConfig` rename are out of scope by the user's decisions and are treated as non-blocking.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: not applicable; no blocking finding.
- Remaining material ambiguity, if any: none.
- Statements about existing code the design relies on, opened at their cited lines: all hold. The census was reproduced on the real data: 36 / 760 / 29 manifests at depths `agents/<run>`, `agent_teams/<team>/<member>`, `agent_orgs/<org>/<team>/<member>` (825); labels `CODEX` 3,648, `CLAUDE` 83, `AUTOBYTEUS` 61, `ANTIGRAVITY` 2 (3,794 entries, all `complete`); one key set `{schema_version, next_segment_index, segments}`; no other manifest path outside `imports/` (137 there). The side-effect claims also hold (see the persisted-data table).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (seven writer sites confirmed; the recorder is the single funnel to the manifest) | Pass (DS-001 reaches the manifest through the archive manager unchanged) | Confirmed | None |
| BEH-002 | Operational | Pass | Pass (startup order, prerequisites, census) | Pass (DS-002 owner is the migration; runner owns status and order) | Confirmed | Findings ARCH-F-001…003 are clarifications, not corrections |
| BEH-003 | System | Pass | Pass (no reader) | Pass | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `task-brief-from-316.md` | Pass | Pass (design spec "Relevant Supplemental Task Artifacts"; notes inventory) | Pass | Pass | Pass (context only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Cleanup posture, trigger "Vocabulary drift" | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Legacy Or Compatibility Pressure` with F-01, F-02 | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes — small"; deferrals stated (in-record copies, imports) | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Writers, migration, removal plan | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | New data written in one spelling | Pass | Pass | N/A | Pass | Pass: payload builder → recorder (`runtimeKindFromString`) → writer → archive manager | Pass | Pass |
| DS-002 | Startup conversion | Pass | Pass | N/A | Pass | Pass: runner → migration → discover → decide → convert + validate → rename → report | Pass (frozen table and discovery are off-spine of the migration) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Sealed migration area | Pass | Pass (imports only `domain/`, node APIs; boundary test) | Pass (current code imports nothing from the folder; runner is the only caller) | Pass | |
| `ProviderCompactionBoundaryRecorder` | Pass | Pass | Pass | Pass | Single validation point for the payload runtime |
| `RunMemoryFileStore` (native) | Pass | Pass | Pass | Pass | Library keeps its own literal; precedent: `llm-phase.ts` writes `runtime_kind: 'autobyteus'` the same way |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Migration → none of current code | Pass | Pass (no `RuntimeKind`, no library import; frozen table and frozen current set) | Pass | Pass | |
| `agent-memory` → `runtime-management/runtime-kind-enum` | Pass | N/A | Pass: `agent-run-memory-recorder.ts:11` already imports it | Pass | |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RawTraceManifestRuntimeNamesMigration` (`AppDataMigrationDefinition`) | Pass | Pass | Pass (`memoryDir`) | Low | Pass |
| `ProviderCompactionBoundaryPayload.runtime_kind: RuntimeKind` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Convert once at startup | Pass | Pass (framework, registry, runner record) | Pass (two files like the closest precedents) | Pass | |
| Atomic replacement | Pass | Pass (technique reused as a small private helper; the migration cannot import library or current code) | N/A | Pass | |
| Parse a runtime | Pass | Pass (`runtimeKindFromString`) | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `app-data-migrations`, `agent-memory`, backends, `autobyteus-ts` store | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Five-name table (enum in current code; frozen old-label table and frozen current set in the migration) | Pass | N/A | Pass | Pass | The drift test against `Object.values(RuntimeKind)` is acceptable: other migration tests already import `RuntimeKind` (e.g. `token-usage-run-records-v1`, `team-run-history-index-v2`) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `segments[].runtime_kind` (string, a `RuntimeKind` value or null) | Pass | Pass | Pass: after the migration one spelling; the in-record copies and imports are the stated, never-read exceptions | N/A | Pass | |
| `ProviderCompactionBoundaryPayload.runtime_kind` | Pass | Pass (removes `"CODEX" \| "CLAUDE" \| string`) | Pass | N/A | Pass | |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Verified: archive manager (writes; reads index/status/boundary_key), `MemoryFileStore.readRawTraceManifestGeneration`, `RawTraceFileSourceService`, memory-search journals step (fingerprint of name, size, mtime includes `raw_traces_manifest.json`, `journals-step.ts:7,36`), Memory Sync source scanner, work-journal service (does not read the field). Two further stored copies of the old spelling are not named in the design and are harmless: the seven `raw_traces_archive_manifest.json.backup-*` files left by the rotation-layout migration (not read by any code), and the in-record copies (named).

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass`. The change removes the only remaining second spelling of this concept in current stored data.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `…-migration.ts` (definition, `execute`, status policy) and `…-files.ts` (table, discovery, `decide`, validated rewrite) | Pass | Pass | N/A | Pass | Same two-file shape as `raw-trace-active-file-name` |
| Seven writer edits, type, recorder | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `app-data-migrations/migrations/raw-trace-manifest-runtime-names/` | Pass | Pass | Low | Pass | Registered last with `prerequisiteMigrationIds`; id `20261030_raw_trace_manifest_runtime_names` |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Five literals, payload type, recorder's `string` tolerance, tests' old spelling | Pass | Pass | Pass | Pass | The scope of the AC-005 source check and a few leftovers need tightening (ARCH-F-003) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Writers, recorder, readers | No | Pass | Pass | No reader accepts an old label; old labels live only in the migration's frozen table |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `raw_traces_manifest.json` `segments[].runtime_kind` | `Migration Required` (DESIGN rule 10; user DEC-1) | Pass: 825 manifests / 3,794 entries inspected read-only; four labels only; one key set; all `complete`; no reader of the value | Pass: direct use would force a permanent mapping (rule 10); rebuild is impossible (the manifest is the archive's index); cost is at most 825 small files once | Pass with ARCH-F-001, -002 (clarifications) | Pass | Details below |

Guideline §2 checklist, checked against the design and the code:

1. **Need:** met by DESIGN rule 10 and the user's decision; a tolerant reader would be the permanent mapping rule 10 forbids.
2. **Availability:** migrations run before the HTTP server and do not gate any capability (`holdsBackCapabilities` none); an unusable manifest affects only itself (REQ-004).
3. **Shape inventory and fixtures:** the table maps each shape to a fixture. Real shapes (4 labels, 3 families) are covered; code-only shapes (`GROK_BUILD`, null, missing, pending, unknown, malformed) have fixtures. Additions in ARCH-F-003.
4. **Disposition:** convert / already-current skip / unusable keep and report; imports excluded by DEC-2. The aggregate status rule needs one change (ARCH-F-001).
5. **Commit and retry:** temporary file → validate → rename in the same folder; already-current files recognized; the runner record is terminal. No backup is justified by DEC-3, and the guideline's own reasons hold: the change is one value per entry, deterministic and invertible, the old file stays valid until the rename, and an older build does not read the field. The rollback statement is correct for a rollback, and incomplete for a later re-upgrade (Residual Risks).
6. **Current-only boundary:** the migration imports neither `RuntimeKind` nor the library; the boundary test enforces it.
7. **Cost:** at most 825 reads and rewrites, no re-audit after the terminal record. Verified side effects: (a) memory search — the next journals pass re-ensures each migrated run once; closed journal files are reused and the open file is re-rendered to identical text, so nothing is written or re-indexed (`work-journal-service.ts` `reconcile`/`renderFile`: `written` is false when the hash is unchanged); (b) Memory Sync — the source scanner covers `agents/` and `agent_teams/` only (796 of the 825 manifests; `agent_orgs/` is not synced); a changed hash yields a full-file `replace` operation in batches (`memory-file-change-planner.ts`), and the hub accepts only full-file replace (`local-file-memory-import-store.ts:190-193`), so the one upload per manifest assumption holds and the hub has no reject path for a changed file; (c) imports are untouched by DEC-2.
8. **References:** none cross the changed field.
9. **Evidence:** fixtures, idempotence, interruption, boundary test, an isolated run on a read-only copy of the manifests; unverified: other users' shapes (covered by the unusable branch).
10. **Lessons:** the precedents named are the right ones.

**Fixed-depth discovery coverage:** complete for this node (census above; no manifest at any other depth outside `imports/`). Note that the two prerequisite migrations walk only `agents` and `agent_teams`, so org members were never covered by the layout migrations; this node has no legacy-layout folder (no `raw_traces_archive_manifest.json`), and a legacy-only org member elsewhere would not be a candidate (ARCH-F-003 asks for one sentence).

**No reader of the stored label:** confirmed (grep of `src` in the server, the library and the web, including the work-journal store, whose own run-level `runtime_kind` holds `RuntimeKind` values or null).

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Writers and tests → migration and fixtures → docs → isolated validation | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored before → after | Yes | Pass | Pass (a mapping helper or a both-spellings reader) | Pass | |

## Material Premise Validation (Only When Needed)

None. No finding or mechanism rests on a scenario outside the established behavior basis. The unusable-manifest cases are the explicit edge scenario SCN-006 (DESIGN rule 7).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

All three are `Design Impact`, severity Low, scope `Within Approved Scope`, changes to approved behavior: `No`, recommended recipient Solution Designer. None blocks implementation; they are clarifications to make in the design (and where noted the requirement wording) before or with the user's approval request, with no re-review needed.

### ARCH-F-001 — The aggregate status depends on how many other manifests converted

- Approved authority protected: REQ-004, AC-004, REQ-007; `data_migration_guideline.md` §6 ("never require a minimum number of valid old runs"; a preserved exclusion with an otherwise completed attempt is a warning success; `FAILED` means a required transformation or commit did not establish its target).
- Evidence: design status rule: "failed > 0 with any migrated/skipped → `SUCCEEDED_WITH_WARNINGS`; failed with nothing else → `FAILED`". A node whose only usable candidates are unusable (for example a single corrupt manifest) ends `FAILED` and is rescanned at every start (`runner.runPending`: only `SUCCEEDED*` is terminal), although nothing was lost and nothing failed to convert. REQ-004 says "converted at least one", the design says "migrated or skipped"; the two texts also differ.
- Required update: classify unusable content (unreadable, unparsable, no segment list, unknown value) as a preserved exclusion, so the walk ending normally is `SUCCEEDED_WITH_WARNINGS` whenever any exclusion exists and `SUCCEEDED` otherwise; keep `FAILED` for a thrown error of the walk or a failed write/rename after validation. Align REQ-004's last clause and the design's table to that one rule, and the fixture expectations (AC-004).
- Why proportionate: one rule sentence; it removes a count-based decision and an unbounded restart retry.

### ARCH-F-002 — Name and clean up the temporary file

- Approved authority protected: REQ-003, AC-003; Memory Sync scanner behavior (`memory-sync-path-policy.ts`: leaves ending `.tmp`, `.partial`, `.lock`, `.swp`, `.swx` are excluded).
- Evidence: the design says "a temporary file in its folder" without a name. An unexcluded leftover name after an interrupted attempt would later be uploaded by Memory Sync and sit beside the manifest indefinitely (memory-search fingerprints only `raw_traces*` names, so it would not disturb that).
- Required update: state that the temporary file ends in `.tmp` and has a fixed name per folder (so a retry overwrites a leftover), and that a failed validation removes it; add a fixture for a leftover temporary file from an interrupted attempt.

### ARCH-F-003 — Tighten the inventory the source check and the shape list rely on

- Approved authority protected: REQ-005, REQ-006, AC-005, AC-006.
- Evidence and required update:
  1. AC-005 says old labels may remain "only inside the migration folder (and frozen shapes)". Other sealed code already holds them: `migrations/team-run-execution-tree-v2/…:76-78`, `frozen/team-run-execution-tree-v1/*` (the team-tree spelling `AUTOBYTEUS/CLAUDE/CODEX`). State the check as "outside `src/app-data-migrations/`" and exclude tests of frozen shapes.
  2. Docs: also `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md:395` (`ANTIGRAVITY`), beside `grok_build_runtime.md:285`.
  3. Web fixtures: `agentStatusHandler.spec.ts` has four old values (lines 370, 421, 468, 514, not two); `runHistoryStore.spec.ts:68` holds `AUTOBYTEUS` in a team launch-configuration fixture, a different (team tree) field: decide to leave it and exempt it in AC-005, or update it.
  4. Add fixtures for a non-string `runtime_kind` value (unusable) and an entry with an extra unknown key (kept as is), since the rewrite must keep "every other value".
  5. Shape inventory: record that the layout migrations never walked `agent_orgs`, that this node has zero legacy-layout folders and seven `raw_traces_archive_manifest.json.backup-*` files that keep the old labels and are not read, and that a legacy-only org member on another node would not be a candidate.

## Classification

`Design Impact` (Low, non-blocking clarifications). Result classification: `Pass`.

## Recommended Recipient

Pass: `/software_engineering_team/implementation_engineer` (primary), then the informational notice to `/software_engineering_team/solution_designer`. The Task requires the user's approval of the design before any build, so the implementation handoff carries an explicit hold until the Solution Designer confirms that approval and the ARCH-F-001…003 edits.

## Residual Risks

- Rollback then re-upgrade: a rollback to the previous release works, but rotations written by the older build use the old labels; re-upgrading does not rerun a terminal migration, so those entries keep the old spelling, and autobyteus-316 reads them as "runtime unknown" (graceful). The release notes should say so, as they say imports keep the old spelling.
- Imports and in-record copies keep old labels by the user's decisions; consumers must treat any non-`RuntimeKind` value as unknown (`runtimeKindFromString` returns null).
- One-time effects after the update: one journals-step pass per migrated run (the largest open journal files re-render once) and 796 manifest uploads for a configured Memory Sync source. Bounded.
- A manifest shape in other users' data that the fixtures do not cover is kept and reported (warning success after ARCH-F-001); never blocks startup.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: A small, well-bounded migration that follows the sealed-area contract and the Data Migration Guideline. Every claim I checked against the code and the real data holds: complete writer list, no reader, fixed-depth discovery covers all 825 manifests, startup order excludes concurrent writers, the side effects are as described, and the Memory Sync hub accepts full-file replace. Three Low clarifications (status rule, temporary-file naming, inventory tightening) are listed for the Solution Designer; none changes structure.
