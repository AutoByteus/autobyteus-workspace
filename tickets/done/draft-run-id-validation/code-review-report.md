# Code Review Report — draft-run-id-validation

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; SR-001 baseline as refined, approved 2026-10-10; REQ-001..009, AC-001..009)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: None behavior-defining (the handover file and the OBS-001 report are evidence only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2 Pass; AR-001 and AR-002 resolved)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: Initial implementation review requested by `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High` (a security trust-boundary change on a shared input contract)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The implementation touches 4 server source files: the 3 the design mapped, plus the resolver (see the deviation below). No escalation trigger fired. No legitimate ID or filename fails, and the migration suites pass: 47 files and 339 tests, re-run by the reviewer.

## Review Scope

- Changed implementation reviewed: `git diff d28c56d5d..36a444f0e`.
  - The separate baseline commit `a9c9a65f2` was also reviewed. It is a test-only path update after a skill-repository move; its assertion is unchanged.
- Files reviewed:
  - Source: `src/context-files/domain/context-file-owner-types.ts`, `src/context-files/store/context-file-layout.ts`, `src/api/rest/context-files.ts`, `src/context-files/services/context-file-local-path-resolver.ts`.
  - Tests: the changed unit and integration tests, the probe, and `TESTING.md`.
  - Read for context: `context-file-upload-policy.ts` (the stored-filename generator), `context-file-finalization-service.ts` (it validates every filename before any move), the upload and finalize route catches, and `autobyteus-web/utils/contextFiles/contextFileOwner.ts` (the only descriptor producer; it sends exact, trimmed fields).
- Reviewer verification:
  - `vitest run tests/unit/context-files` plus both REST integration files: 11 files, 155 tests, all pass.
  - `vitest run tests/unit/app-data-migrations`: 47 files, 339 tests, all pass.
  - `pnpm typecheck`: pass.
- Explicit exclusions: Project-task context routes (out of scope), the PB-001 cadence failure (accepted pre-existing exception), and per-user draft authorization (a non-goal).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Status | Implementation Path And Evidence |
| --- | --- | --- |
| BEH-001 / BEH-002 | Confirmed | `/drafts/*` → `parseDraftContextFileLocator` → `parseDraftContextFileOwnerDescriptor` → `safeIdentity(draftRunId / teamDraftId)` throws `ContextFileDescriptorError` → `sendDraftRouteError` → 400 `{detail}`. Universal integration test over a raw socket: every `INVALID_LOCATORS` entry gives 400 for both GET and DELETE, and a whole-tree snapshot is unchanged. |
| BEH-003 / BEH-004 / AC-009 | Confirmed | Upload and finalize both parse the owner before any I/O; the route catches answer 400 `{detail}`. Finalize parses the owners and validates every `storedFilename` (finalization service line 86) before the move loop (line 101). Tests for traversal and extra-field owners show the snapshot unchanged. |
| BEH-005 / AC-007 | Confirmed | `agent_final.runId` → `safeIdentity`. The agent-final route maps `ContextFileDescriptorError` to 400 (D4). The raw-socket test covers `%2E%2E`, `..%2F…`, a padded ID, `%00`, a space, and `%2E` → 400; an unknown run → 404. |
| BEH-006 / AC-005 | Confirmed | Draft locators: the codec throw is caught and returns `null` (unchanged). Final locators: all 4 branches now parse through the codec *inside* `resolveExistingFinalPath`'s try, so a malformed final locator returns `null` instead of throwing out of `resolve()`. Unit test and real-layout integration test. |
| BEH-007 | Confirmed | Org, collaboration and Team-final validation is unchanged. `assertExactFields` keeps identical messages, and the existing tests pass. |
| BEH-008 / AC-008 | Confirmed | `filename()` allowlist `^[A-Za-z0-9._-]+$`, rejects dot-only names and any `..` substring, no trimming. The generator (`buildStoredFilename`) emits only `ctx_<12hex>__<[A-Za-z0-9._-] stem><.alnum>`. |
| SCN-004 / AC-006 / REQ-005 | Confirmed | Legitimate formats (`<slug>_<32hex>`, `temp-…`, `temp-chat-…`, `team-draft-<uuid>`) pass upload → GET → DELETE → 404 for both draft kinds, and the agent-final upload → finalize → read with a server run ID passes. |
| REQ-003 / AC-004 | Confirmed | `resolveSafeChildPath` throws `ContextFilePathContainmentError extends ContextFileDescriptorError`, which maps to 400 on every route (layout unit test). |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..004, 008 | Contract | Any HTTP client, incl. paired remote clients | Server trust boundary on context-file routes | Upload, finalize, draft GET/DELETE | Explicit Edge | DS-001 | 400 `{detail}`; no file touched | User-approved requirement; OBS-001 live probe | Supported Explicit Edge Scenario | Use |
| SCN-002 | BEH-005 | Contract | Same | Read a final file | `GET /rest/runs/…` | Explicit Edge | DS-001 | 400 `{detail}` | Requirements (DEC-001) | Supported Explicit Edge Scenario | Use |
| SCN-003 | BEH-006 | System | Agent runtime | Resolve a message locator | `ContextFileLocalPathResolver.resolve` | Explicit Edge | DS-002 | `null` | Requirements REQ-004 | Supported Explicit Edge Scenario | Use |
| SCN-004 | REQ-005 | User | Desktop/web user | Attach, preview, remove, send | Composer | Normal | DS-001 | Unchanged | Prior CF tests; legitimate-ID tests | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Path / Consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CND-001 | Deviation from the file mapping: the resolver final branches now parse through the codec inside the try | SCN-003 / REQ-004 | A message locator from content | Before: a malformed Team/Org/collab final locator threw out of `resolve()` into the provider-input normalizer, and the agent-final branch skipped validation entirely. After: `null`. | Diff; resolver unit and integration tests | Accept (no finding) | Required by REQ-004 and AC-005, within the owning file's responsibility. Valid locators are unchanged. The input type is widened to `Record<string,string>`, but parsing happens immediately inside the boundary, so this is proportionate. |
| CND-002 | Pre-existing: a user file named like `a..b.txt` produces the stored name `ctx_<t>__a..b.txt`, which `filename()` rejects (the `..` substring). The upload therefore fails with 400 "storedFilename is invalid." | SCN-004 (attach a file) | User attaches a file with `..` inside its name | `buildStoredFilename` keeps inner `..` → `layout.getDraftFilePath` → `assertStoredFilename` throws → upload 400 | `context-file-upload-policy.ts:43-49`; the base `filename()` at `d28c56d5d` already rejected `..` | Reject (as a finding for this change) | Behavior is **unchanged** by this ticket: the `..` rule existed before, and D2 explicitly keeps it. It is outside the approved scope. Recorded as a separate-ticket candidate: collapse dot runs in `sanitizeFilenameStem`. |
| CND-003 | `safeIdentity` allows inner spaces and multi-dot names like `...` as owner IDs | REQ-001 rule | — | A single path segment `...` is not traversal, and containment stays as defence in depth | Requirements "ID Rule Rationale" | Reject | This is the approved rule: historical run IDs may have spaces. |
| CND-004 | The upload route maps *every* error, including an unexpected I/O fault, to 400 | — | — | Pre-existing catch-all, not changed | Route code | Reject | Out of scope and unchanged. The requirement only forbids 500s for malformed input. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | `Missing Invariant`, fixed inside the codec owner; no boundary change |
| Behavior-defining supplemental artifacts | Pass | None |
| Data-flow spine clarity | Pass | DS-001 and DS-002 as designed |
| Ownership boundary preservation | Pass | Validation lives only in the codec. The layout raises a codec-family error. Routes only map status. No per-route ID checks were added. |
| Off-spine concern clarity | Pass | No new concerns |
| Existing capability reuse | Pass | `safeIdentity` is reused. `assertExactFields` extracts the repeated exact-field pattern used by the Org, collaboration, Team-final and now the two draft kinds, with messages unchanged. |
| Reusable owned structures / tightness | Pass | One identity rule for every owner field; `ContextFilePathContainmentError` is a tight subclass |
| Repeated coordination ownership | Pass | 5 copies of the exact-field check collapsed into one helper |
| Empty indirection | Pass | — |
| SoC / file responsibility | Pass | — |
| Dependency direction | Pass | The layout already imported from the codec domain file |
| Authoritative Boundary Rule | Pass | The resolver depends on the codec only; it no longer hand-builds an unvalidated `agent_final` owner |
| File placement / layout | Pass | No new files |
| Interface clarity | Pass | Parse functions keep their signatures; the error family is explicit |
| Naming | Pass | `ContextFilePathContainmentError` and `assertExactFields` are clear |
| No unjustified duplication | Pass | — |
| Patch-on-patch control | Pass | — |
| Dead code removed in touched files | Pass | `required()`, `getStoredFilenameFromLocator`, `getDisplayNameFromStoredFilename` and the resolver's `ContextFileFinalOwnerDescriptor` import are removed. A grep finds no callers; the remaining `required(` hits are other modules' own local helpers. The probe's `observeOnly`/`'observe'` fallback is removed. |
| Tests requirement-aligned | Pass | Raw-socket tests keep `%2E` and `%2E%2E` intact. Whole-tree snapshots prove nothing is touched. Legitimate-format cases cover REQ-005. The detection check (7 of 16 fail with the source stashed) shows the tests discriminate. |
| Test structure coherent | Pass | `rawRequest`, `snapshotFiles` and `writeSentinels` are reused; the probe rows are graded |
| No stale tests | Pass | Tests for the removed exports are deleted |
| API/E2E readiness | Pass | The probe CF-001 rows are graded and documented in `TESTING.md` |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Lines | `>500` | `>220` Delta | SoC | Placement | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `context-file-owner-types.ts` | ~180 | Pass | Pass (net −7) | Pass | Pass | OK |
| `context-file-layout.ts` | <100 | Pass | Pass | Pass | Pass | OK |
| `api/rest/context-files.ts` | ~225 | Pass | Pass (+1) | Pass | Pass | OK |
| `context-file-local-path-resolver.ts` | ~160 | Pass | Pass | Pass | Pass | OK |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Trim-and-accept is removed outright |
| No legacy retention | Pass | — |
| Dead code removed | Pass | See above |
| Persisted-data decision followed | Pass | `Not Affected`; the migration suites pass with the stricter `assertStoredFilename` |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes` (already done). `TESTING.md` CF-001 now states the graded traversal and dot-only expectations. Delivery should also confirm that the release notes mention the malformed-input status-code changes.

## Additional Material Premise Validation

Upstream premises are Confirmed. New premise: CND-002 is recorded as pre-existing and out of scope; nothing else is new.

## Review Scorecard (Mandatory)

- Overall score: 9.5/10 (95/100)

| Priority | Category | Score | Why | Weakness | Improvement |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Validation happens once at the codec node on both spines | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | The codec is the sole validity owner; the resolver bypass of the codec is closed | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | One error family; consistent 400 mapping on every route | The resolver helper takes a loose `Record<string,string>` (parsed immediately) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Changes stay in their owners | — | — |
| 5 | Shared-Structure Tightness / Reusable Structures | 9.5 | `assertExactFields` consolidates 5 copies | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear names and a doc comment on the allowlist rationale | — | — |
| 7 | API/E2E Readiness | 9.5 | Graded probe rows, the raw-socket approach and documented expectations | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Every AC traced; the reviewer re-ran 155 targeted and 339 migration tests, all passing | The pre-existing `..`-in-name upload rejection remains (CND-002, out of scope) | Separate ticket |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.6 | All planned removals done; the probe fallback is removed | — | — |

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`. Informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- By design, malformed input now gets different status codes: untrimmed IDs → 400; traversal on upload, finalize or draft GET/DELETE → 400; agent-final traversal `runId` 404 → 400; invalid agent-final filename 500 → 400. A third-party client that sends untrimmed IDs or extra descriptor fields would now get 400; none exists in the repo.
- CND-002 (pre-existing, separate-ticket candidate): a user file whose name contains `..` inside the stem (e.g. `report..v2.pdf`) cannot be uploaded, because the generator keeps the inner `..` and `filename()` rejects it. This was true before this change.
- PB-001 cadence integration failure: an accepted pre-existing exception.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Classification preserved (Small / High). The resolver deviation was reviewed and accepted (CND-001).
