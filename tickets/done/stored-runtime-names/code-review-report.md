# Code Review Report — autobyteus-343 (stored-runtime-names)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `task-brief-from-316.md` (context only)
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; ARCH-F-001, -002, -003)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation handoff IR-001 (Medium / High → independent source review)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin and delivery fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Two new files (254 lines), one registry line, seven small writer edits; High from rewriting persisted user data in place at startup. No escalation trigger fired (grep of `runtime_kind` over server, library and web finds no reader of the stored value; the work-journal store's `runtime_kind` is its own manifest field).

## Review Scope

- Changed implementation and behavior reviewed: the Claude, Codex (two sites), Grok and Antigravity compaction payload builders; `ProviderCompactionBoundaryPayload` type; `ProviderCompactionBoundaryRecorder.parseProviderCompactionBoundary`; native `run-memory-file-store.ts` constant; the sealed migration `raw-trace-manifest-runtime-names` (definition + files helper) and its registration; docs; the source-check test; the migration test suite (structure and coverage by case name); updated fixtures.
- Files / areas reviewed: all source files in `git diff <base>..d7c1dbcdca` under `src/`; both migration files in full; the recorder parse path and `runtimeKindFromString`; the runner's status handling; the migration test case list; `tests/architecture/runtime-labels-source-check.test.ts`; evidence IMP-01..05 summaries.
- Explicit exclusions: checks already recorded in the handoff were not rerun (code unchanged since `f5f9ee3221`; later commits are evidence/docs only). Gated live suites, integration suites and a real server start were not run by the implementer (TESTING.md) and are left to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: one spelling (`RuntimeKind` value) for the runtime in `segments[].runtime_kind` of the raw-trace manifests; writers changed; one-time startup conversion of this node's own manifests; unusable content kept and reported; no old label or mapping in current code; imports, in-record copies and other stored names untouched.
- Design-spec behavior map verified against the implementation: yes (below).
- Design review report and round confirmed: ARCH-REV-001 Pass; ARCH-F-001 (status policy), ARCH-F-002 (leftover tmp), ARCH-F-003 (fixtures, non-string, extra keys, exemptions) each visible in code or tests.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Payload builders write `RuntimeKind.<X>` (claude `:41`, codex `:98,:157`, grok `:52`, agy `:14`); recorder `parseProviderCompactionBoundary` uses `runtimeKindFromString` (`:119`) and returns `null` for any non-`RuntimeKind` value; value flows to `rotateActiveRawTracesBeforeBoundary({runtimeKind})` (`:107`) and the boundary record (`:50`). Native: `NATIVE_RUNTIME_KIND = 'autobyteus'` at both archive sites. | None |
| BEH-002 | Confirmed | Registry (last) → runner (prerequisites by id, STARTUP_ONLY) → `execute` → `discoverRunFolders` (fixed depths 1/2/3) → `migrateManifest` → `decideManifest` → tmp write + fsync + re-read validation + rename → status policy. | None |
| BEH-003 | Confirmed | `tests/architecture/runtime-labels-source-check.test.ts` scans server and library `src/` outside `src/app-data-migrations/`; no reader of the stored value exists. | None |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor / Initiator | Goal / Event | Entry | Shape | Forward Path | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-1 | BEH-001 | System | A run's backend | Context compaction | Backend event converters | Normal | Converter → payload → recorder → manifest | Manifest and payload hold the `RuntimeKind` value | Requirements REQ-001 / AC-001 | Supported Normal | Use |
| SC-2 | BEH-002 | Operational | App start after update | Convert existing manifests once | Registered startup migration | Normal | as above | 825 manifests here converted, others unchanged | Requirements REQ-002..004; census F-04; IMP-04 | Supported Normal | Use |
| SC-3 | BEH-002 | Operational | App start on another node | Manifest of unexpected shape (unknown value, non-text, invalid JSON, unreadable) | Same | Explicit Edge | Kept and reported, `SUCCEEDED_WITH_WARNINGS` | AC-004; guideline §6; design shape inventory | Supported Explicit Edge | Use |
| SC-4 | BEH-002 | Operational | Interrupted startup (crash mid-run) | Restart | Same | Explicit Edge | Leftover `.tmp` removed or replaced; converted ones skipped | AC-003; design Migration Plan | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | `status as AppDataMigrationExecutionResult["status"]` cast in `execute` (`-migration.ts`) after typing the local as `AppDataMigrationStatus` | Engineering contract (type accuracy) | n/a | Cosmetic; value is always one of three allowed literals; no behavior consequence | Source | Reject as a finding (not worth a fix round); noted as an optional tidy | n/a | Optional: type the local as `AppDataMigrationExecutionResult["status"]` and drop the cast. |
| C-2 | Leftover `.tmp` removed in every run folder (including current and unusable ones) | SC-4 | Interrupted earlier attempt | Only this migration writes that name; nothing runs concurrently at startup; AC-003 says "never left behind" | Code `migrateManifest`; test "leftover temporary file…replaced…removed in every other case" | Reject (no defect); implementer's judgement call accepted | n/a | Within AC-003 and the design's STARTUP_ONLY premise. |
| C-3 | Three fixtures of another field keep `'AUTOBYTEUS'` | Contract: AC-005 wording ("web fixtures") vs design exemption of the same field class | n/a | Test-only; nothing delivered depends on them | grep; design-spec Guidance for Implementation | Promote as Follow-up | Follow-up | FU-001 (optional). |
| C-4 | Concurrent `readdir` over all folders per level (`Promise.all`) | SC-2 | Large node (3.4k+ team members here) | libuv threadpool queues; IMP-04 ran 962 manifests in 6.4 s | IMP-04 | Reject | n/a | No consequence evidenced. |
| C-5 | Recorder now refuses a boundary whose runtime is not a `RuntimeKind` (previous: any string accepted) | SC-1; design Legacy Removal Policy | A backend emitting another string | All four server backends and the native path emit enum values; design explicitly chose this | grep of `provider_compaction_boundary` producers; recorder test | Reject (as designed) | n/a | Matches the reviewed design. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present, evidence-backed, preserved | Pass | Cleanup posture; one concept, one spelling; no dual path retained | None |
| Behavior-defining supplements | Pass | None defined | None |
| Data-flow spine clarity and preservation | Pass | DS-001 / DS-002 realized as designed; no new spine or hop | None |
| Ownership boundary | Pass | Table and decision logic only in the migration; builders state their own constant; recorder owns validation; library owns the native literal | None |
| Off-spine concerns | Pass | Frozen table and discovery sit in the helper, not on the runner path | None |
| Existing capability reuse | Pass | `runtimeKindFromString`, `RAW_TRACES_MANIFEST_FILE_NAME` (frozen import), tmp+rename technique as in `memory-sync-source-id-names` | None |
| Reusable owned structures | Pass | Frozen set and enum equality asserted by test; no copy elsewhere | None |
| Shared-structure tightness | Pass | `ManifestDecision` / `ManifestOutcome` discriminated unions; payload type tightened from `string` to `RuntimeKind` | None |
| Repeated coordination ownership | Pass | Status policy in one place (`execute`) | None |
| Empty indirection | Pass | None added | None |
| SoC / file responsibility | Pass | Definition (identity, prerequisites, status) vs files (shapes, decision, I/O) | None |
| Ownership-driven dependency | Pass | Migration imports only `domain/`, `frozen/`, node APIs; prerequisites by id; boundary test passes | None |
| Authoritative Boundary Rule | Pass | Registry is the only wiring point; current code never imports the migration | None |
| File placement | Pass | Sealed-area layout; one folder, two files | None |
| Flat vs over-split | Pass | | None |
| Interface clarity | Pass | `decideManifest` pure; `migrateManifest(memoryDir, runDir)` explicit identity | None |
| Naming | Pass | "run folder", "manifest", "old label" consistent; `RuntimeKind` value is the only spelling | None |
| Duplication | Pass | | None |
| Patch-on-patch | Pass | Single round | None |
| Dead code in touched files | Pass | No helper existed solely for the labels; source check confirms no leftover literals | None |
| Tests clear and requirement-aligned | Pass | Case names map to AC-002/003/004/007; fixtures per design shape inventory; runner-level test; enum-equality test | None |
| Fixtures/helpers reusable | Pass | | None |
| No stale/compat-only tests | Pass | Registry-tail tests updated, frozen shapes retained | None |
| API/E2E readiness | Pass | Startup journey on synthetic root and scripted compaction identified in the handoff | None |

Correctness notes behind Pass (traced, not just read):
- `decideManifest`: non-object root, missing `segments`, non-object entry, non-string `runtime_kind`, unknown string → `unusable` with the file untouched; `null`/missing/current → entry kept; `Object.hasOwn` guards prototype keys; spread-then-override preserves key order; zero converted entries → `current` (so a second run changes nothing).
- `migrateManifest`: a leftover tmp is removed before reading; failure after the write removes the tmp and returns `failed` with the manifest unchanged; the rename is the only mutation of the manifest; the tmp is fsynced, re-read, and compared with the intended JSON plus a per-entry "only `runtime_kind` changed" check.
- `execute`: `failed > 0` or thrown walk → `FAILED` (restart retries; runner re-runs on `FAILED`, runner `:190`); else excluded > 0 → `SUCCEEDED_WITH_WARNINGS`, also when nothing converted; else `SUCCEEDED` (ARCH-F-001 satisfied).
- Isolated run (IMP-04) shows 825 converted, census preserved, imports byte-identical, second run no change.

## Source File Size And Structure Audit

| Source File | Lines Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `raw-trace-manifest-runtime-names-files.ts` | new | 180 | Pass | Pass | Pass | n/a | None |
| `raw-trace-manifest-runtime-names-migration.ts` | new | 74 | Pass | Pass | Pass | n/a | None |
| `app-data-migration-registry.ts` | — | +3 lines | Pass (change adds three lines; file size unchanged in kind) | Pass | Pass | n/a | None |
| `run-memory-file-store.ts` (library) | — | +4 −2 lines | Pass (change adds four lines; not over limit by this change) | Pass | Pass | n/a | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Recorder accepts only valid `RuntimeKind`; no reader accepts an old label |
| No legacy old-behavior retention | Pass | |
| Dead code removed | Pass | |
| Persisted-data decision followed | Pass | `Migration Required`, implemented as reviewed |
| No version-specific dual reads/writes | Pass | |
| Transition mechanics match the reviewed design | Pass | Fixed-name tmp, validate-then-rename, preserved exclusions, ARCH-F-001/-002/-003 applied |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` — done: `agent_memory.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md` are consistent with the code. Delivery should carry the release-note points from the handoff (rollback, re-upgrade, imports, in-record copies).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None new or reclassified.

## Review Scorecard

- Overall score: 9.4 / 10 (simple average, summary only)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Both spines are as designed and short | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Old spelling lives only in the sealed migration | — | — |
| 3 | API / Interface Clarity | 9.4 | Pure decision, explicit outcome unions | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Definition vs files helper | — | — |
| 5 | Shared-Structure Tightness | 9.4 | Payload type tightened; frozen set test-pinned | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear; one cast in `execute` is mildly noisy (C-1) | cast | Drop the cast (optional) |
| 7 | API/E2E Readiness | 9.3 | Handoff names the startup and compaction journeys; live suites unrun | gated suites | API/E2E run |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Branches traced; isolated real-data-copy run; atomic, idempotent | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; source check enforces it | — | — |
| 10 | Cleanup Completeness | 9.3 | Three field-adjacent fixtures keep the old label (FU-001) | FU-001 | Optional follow-up |

## Findings

None.

## Follow-ups

- Follow-ups this review added: FU-001 (in `follow-ups.md`).

## Classification

Not applicable (Pass).

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- Memory Sync one-time upload per migrated manifest and one memory-search journal pass per migrated run are accepted by the design and unverified live; API/E2E may check if a sync hub is available.
- Gated live suites with changed assertions were not run.
- Rollback / re-upgrade note and in-record old labels belong in the release notes (delivery).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; all categories ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E (per handoff rules)
- Notes: Judgement calls accepted: leftover `.tmp` removed in every folder; three team-member fixtures left (FU-001, optional).
