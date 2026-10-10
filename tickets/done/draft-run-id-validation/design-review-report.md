# Design Review Report — draft-run-id-validation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/requirements-doc.md` (Approved 2026-10-10)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: none are behavior-defining. The prior handover and the OBS-001 report are evidence only.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: revised `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-003), addressing ARCH-REV-001 findings AR-001 and AR-002.
- Prior Review Round Reviewed: Round 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Round 2 scope: I rechecked AR-001 and AR-002 against the revised design spec (D2, Interface table, Example, Removal plan, File mapping) and the AC-008 wording change in the requirements doc. The other verdicts from round 1 still hold, because SR-003 changes only D2, the tests and the removal plan.
- Current-State Evidence Basis: worktree `codex/draft-run-id-validation` @ `d28c56d5d` (clean apart from the ticket folder). I read these files:
  - `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` and `context-file-upload-policy.ts` (generator unchanged since `d39b26e37`, checked with `git show`)
  - `src/context-files/store/context-file-layout.ts`
  - `src/context-files/services/{context-file-read-service,context-file-owner-resolver,context-file-local-path-resolver}.ts`
  - `src/api/rest/context-files.ts`
  - the three migration users of `assertStoredFilename`

  I also ran a repo-wide grep for descriptor producers (web, android, ios, gateway, applications), a repo-wide grep for codec export usage, a Node `path.resolve` check of the `.` segment, and read the root `DESIGN.md`.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Classification rationale reviewed: the change tightens the server trust boundary on the shared owner/filename codec used by every context-file route and the runtime locator resolver. It also changes some malformed-input status codes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Every context-file entry point must reject any malformed owner ID or stored filename. The rejection is 400 with a `detail`, never a 500, and no file is touched. Legitimate IDs and existing drafts must keep working. DEC-001..003 were approved as Yes.
- Relevant existing behavior and evidence confirmed: Yes.
  - `required()` only trims, and it is used for `draftRunId`, `teamDraftId` and `agent_final.runId`.
  - `filename()` is a denylist.
  - `resolveSafeChildPath` throws a plain `Error`.
  - `sendDraftRouteError` rethrows non-descriptor errors, which gives a 500.
  - The agent-final route rethrows `ContextFileDescriptorError`, which also gives a 500.
  - The resolver's `parseDraftLocator` catches errors and returns `null`.
- Scope guardrail confirmed: Yes. In scope: UC-001..UC-003. Out of scope: Project-task routes, per-user authorization, remote-access policy and release. Preserved: BEH-007 and every valid request.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes. No blocking findings remain. AR-001 was resolved in round 2. The AC-008 wording change in SR-003 only names a case that REQ-008 already required, so no re-approval is needed.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass (the upload route maps all errors to 400; the codec throws before `ensureDraftOwnerDir`) | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass (D4) | Confirmed | — |
| BEH-006 | System | Pass | Pass (resolver catches codec errors and returns `null`) | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass (unchanged) | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass (SR-003: D2 rejects dot-only names; `.` and `%2E` are tested at the unit, integration and probe levels) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. The evidence references are listed consistently across the artifacts.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix (security hardening) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`. The codec is the single parse point, and its own `safeIdentity` is not applied to 3 fields. Verified in code. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Every entry point goes through the codec (grep of all callers) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | HTTP request → codec → layout guard → service → filesystem | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Runtime locator → resolver → codec → path or `null` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Codec parse functions | Pass | Pass | Pass | Pass | Routes must not add their own ID checks (stated) |
| `ContextFileLayout` guard | Pass | Pass | Pass | Pass | Raises an error type from the codec |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| store → domain (error class) | Pass | Pass | Pass | Pass | The layout already imports from the codec |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `parseDraftContextFileOwnerDescriptor` (exact fields + `safeIdentity`) | Pass | Pass | Pass | Low | Pass |
| `parseFinalContextFileOwnerDescriptor` (`agent_final.runId`) | Pass | Pass | Pass | Low | Pass |
| `assertStoredFilename` / `filename` | Pass | Pass | Pass (allowlist, no dot-only names, no `..` substring) | Low | Pass |
| `ContextFilePathContainmentError` | Pass | Pass | Pass | Low | Pass |
| Agent-final route mapping | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ID validation | Pass | Pass (`safeIdentity`) | N/A | Pass | — |
| Exact-field descriptors | Pass | Pass (`exactOrgIdentity` pattern) | N/A | Pass | — |
| Guard error type | Pass | Pass | Pass (needed so the routes can map it) | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `context-files/domain`, `context-files/store`, `api/rest` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

N/A. The design adds no new shared structures.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Draft owner descriptors | Pass | Pass (exact fields) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `context-file-owner-types.ts` | Pass | Pass | N/A | Pass | See AR-002 for dead exports |
| `context-file-layout.ts` | Pass | Pass | N/A | Pass | — |
| `api/rest/context-files.ts` | Pass | Pass | N/A | Pass | — |
| Test files, the probe and `TESTING.md` | Pass | Pass | N/A | Pass | Each named file exists. The `.` and `%2E` cases are added (SR-003). |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ContextFilePathContainmentError` in the codec file | Pass | Pass | Low | Pass | Placed next to `ContextFileDescriptorError` |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `required()` | Pass | Pass | Pass | Pass | — |
| Plain guard `Error` | Pass | Pass | Pass | Pass | — |
| `observeOnly` probe flags | Pass | Pass | Pass | Pass | — |
| Dead exports `getStoredFilenameFromLocator`, `getDisplayNameFromStoredFilename` in the touched codec file | Pass | N/A | Pass | Pass | Resolved in SR-003 (In This Change, with their test assertions) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| ID trimming | No | Pass | Pass | — |
| Extra descriptor fields | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Draft and final owner folders, stored filenames | Not Affected | Pass | Pass | N/A | Pass | See the evidence list below |

Evidence for the persisted-data decision:

- `buildStoredFilename` is the only producer of stored filenames (repo grep). Its sanitizer is byte-identical to the one in `d39b26e37`, so every generated name is within `[A-Za-z0-9._-]`. That excludes the dot-only and `..` cases, because names always start with `ctx_<hex>__`.
- Each of the three migration users of `assertStoredFilename` already fails per item on unproven or missing files. A non-allowlisted name can only come from hand-typed text, and that text would not prove an owner file anyway. The outcome is unchanged; only the error message differs.
- Historical run IDs with inner spaces still pass `safeIdentity`.
- There is no other producer of `agent_draft` or `team_member_draft` descriptors: only the web's `contextFileOwner.ts` and its locator parser. No hits in android, ios, the gateway or applications.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Codec → layout → route → tests → probe/`TESTING.md` | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Filename rule | Yes | Pass: `/^[A-Za-z0-9._-]+$/.test(v) && !/^\.+$/.test(v) && !v.includes("..")` | Pass (names "forgetting dot-only names") | Pass | — |
| ID field, containment | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A crafted stored filename `.` reaches the filesystem as the owner directory itself

- Related approved requirement or established contract: REQ-008 ("not dot-only"), REQ-002 (400 + detail, never 500), AC-008. The governing contract is SCN-001, the server trust boundary for crafted HTTP input, approved as a Supported Explicit Edge Scenario.
- Relevant behavior ID(s): BEH-008
- Initiating basis kind: `Contract`
- Independent trigger: any HTTP client, including a paired remote client, sends `DELETE /rest/drafts/agent-runs/<valid id>/context-files/%2E`. This is the same input class the user explicitly decided to enforce (SCN-001).
- Support evidence: SCN-001 in the approved requirements, and REQ-008, which explicitly forbids dot-only filenames.
- Forward path:
  1. The wildcard route passes the raw `request.url`.
  2. `parseDraftContextFileLocator` decodes the last segment to `.`.
  3. `filename(".")` passes today, and it would also pass the D2 rule as written.
  4. `layout.getDraftFilePath` calls `resolveSafeChildPath(ownerDir, ".")`, which returns `ownerDir`. The guard allows a candidate equal to the root (verified with Node `path.resolve`).
  5. `deleteDraftFile` calls `fs.unlink(ownerDir)`.
- Lifecycle preconditions and consequence: when the owner dir exists (any owner with a pending draft), unlink on a directory fails with EISDIR or EPERM. That is not ENOENT, so it is rethrown, `sendDraftRouteError` rethrows, and the client gets a 500 without a `detail`. That violates REQ-002. GET returns 404 (the path is not a file). No file is deleted.
- Reachability: `Reachable`
- Review consequence: D2 must also reject a dot-only filename, as REQ-008 states. The guard does not cover this case, so defence in depth does not catch it. Round 2: SR-003 adds that rejection, which addresses this premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Review Decision

`Pass`

## Findings

None open. Both round-1 findings are resolved; see ARCH-REV-002 in the revision record.

- AR-001 (Medium): **Resolved** in SR-003.
  - The rejection is stated in D2, line 61 (with the root-equality reason), in the Interface table (line 177) and in the Example (line 242).
  - Tests are added: codec unit cases (`.`, `..`, `...`), `INVALID_LOCATORS` GET and DELETE cases (400 with `detail`, owner folder intact) and a draft DELETE probe row for `%2E`.
- AR-002 (Low): **Resolved** in SR-003. Both dead exports and their test assertions are in the removal plan (lines 150–151) and in the codec file mapping (line 210).

Non-blocking note for implementation: `app.inject` and HTTP clients may normalize a literal `.../context-files/.` to `.../context-files/` before routing. That request still gets 400, because an empty filename fails the allowlist, but it no longer exercises the dot-only rule. The `%2E` form is the case that actually tests the dot-only rule, and it must stay in the unit, integration and probe tests. The integration case should run against an owner folder that exists, because the 500 only happens when the folder exists.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass rule).

## Residual Risks

- Owner IDs use the `safeIdentity` denylist by approved choice. On a Windows host, a drive-designator ID such as `D:` is caught only by the containment guard, and with D3 that now gives a 400. I traced no cross-owner reach for these IDs.
- For containment-only failures (AC-004), the read and delete services run the global TTL `cleanupExpiredDrafts` before the guard trips. That is normal maintenance, not a touch of the addressed file.
- Status codes for malformed input change exactly as listed in the requirements. Valid requests are unchanged.
- PB-001 remains an accepted pre-existing exception.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 is Reachable and addressed by the SR-003 D2 rule)
- Notes: Round 2 verified both fixes in the canonical design spec. The round-1 structural verdicts stand: the codec is the single validation point, D3 maps guard trips to 400 on every route, and data continuity is verified against the generator's history.
