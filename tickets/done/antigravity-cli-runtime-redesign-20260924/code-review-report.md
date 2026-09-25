# Code Review Report — AGY runtime implementation

## Review round, authority and scope

- **CRR-016 — Pass**, renewed independent implementation-source review of IR-009 at `42ec93de0`, SR-024/DS-006, ARCH-REV-005 Pass. Classification remains **Large / High** and requires fresh API/E2E. Prior CRR-013 source, API-REV-008/CRR-015 and Delivery DR-005 1.4.80 package results are pre-SR-024 only. Delivery is still on explicit user-verification hold; this is not product acceptance, a release, or cleanup authorization.
- Approved behavior: `requirements-doc.md` SR-016 plus user-approved SR-021; SR-024 is a technical recovery, not a new behavior approval. Context reviewed: `investigation-notes.md` §SR-024, `solution-revision-record.md`, `solution-org-member-skill-recovery-handoff.md`, `design-spec.md` DS-006, `investigation-result.md`, `design-review-report.md`/`architecture-review-revision-record.md` ARCH-REV-005, current implementation handoff/IR-009, prior code/API review and delivery hold artifacts. Supplemental mounted skill/link evidence was inspected through the source tests and design investigation.
- Changed source: shared resolved configured-skill binding and resolver provenance; AGY configured-skill materializer. Reviewed capsule create/restore and backend factory as forward consumers, and the changed unit/Codex/Claude tests proportionately. Unchanged provider identity/MCP/trace/UI paths retain their earlier basis but require affected executable regression. No implementation change by reviewer.

## Approved behavior, production path and supported-scenario gate

| Basis | Independent trigger, lifecycle and forward path | Source conclusion |
| --- | --- | --- |
| **SCN-002 / BEH-002 / REQ-002 / AC-002**, supported normal user goal | User opens the active 1.4.80 AGY Org and sends a first prompt to its configured Solution Designer member → Org member activation → `AgyAgentRunBackendFactory.createBackend` → existing SkillService/ConfiguredAgentSkillResolver selects that member's private skill → new AGY capsule snapshots the skill → CLI init/provider ID → answer. The mounted skill has two actual file links into the owning team's `shared/`. | **Confirmed at source boundary.** Resolver records the winning contextual source; materializer copies both links as ordinary private capsule bytes in the actual-mounted-skill unit. The live original cause was not logged: the same-build old materializer's `AGY_SKILL_SOURCE_SYMLINK` is high-confidence reproduction, not a captured production stack or proof of post-fix integrated success. |
| **BEH-005 / REQ-005 / AC-004**, established run-capsule/source trust contract | The same legitimate configured-skill exposure must not import files outside the owning team/agent/global boundary, leave a link into the capsule, alter selected workspace/source, or change an existing run's saved snapshot. | **Confirmed.** Resolver derives canonical origin/source/trusted roots at lookup; AGY checked traversal does not follow directory links, accepts only regular file targets within the proper root, writes ordinary private capsule files, validates source stability and aborts/removes a failed candidate. `NONE` bypasses source inspection; restore reads saved capsule, not edited source links. |
| **SCN-005 / REQ-006**, non-AGY preservation | Existing Codex/Claude configured-skill consumers continue their normal runtime selection/materialization. | Shared resolved binding gains provenance but `collectResolvedConfiguredSkills` and other runtime consumption remain behaviorally unchanged; focused Codex/Claude suites pass. |

The user-facing first-turn failure and actual mounted link shape independently establish this scenario; a test/diff cannot create it. The security boundary is an approved governing contract, not a hypothetical adversarial race. No unsupported arbitrary-host-file import or AGY-native subagent workflow is accepted.

### Candidate finding/mechanism gate

| Candidate | Scenario/contract and evidence | Disposition |
| --- | --- | --- |
| CF-009: blanket reject all configured skill source symlinks | Supported first-turn Solution Designer member path; real two in-team file links, same-build packaged materializer rejection; DS-006. | **Promote as corrected prior mechanism, not a current finding.** IR-009 replaces it with one checked snapshot path. |
| CF-010: follow every symlink through generic recursive copy | Approved capsule isolation/trust contract; would permit external host bytes and retained links, but the changed source instead uses canonical containment, regular-file check, `O_NOFOLLOW`, bounded reads and post-copy verification. | **Reject as current finding.** Unsafe route is absent; no fallback copier remains. |
| CF-011: claim live root cause or success from disposable reproduction/unit tests | Actual first-turn live cause was not captured and full disposable Org first-turn has not been rerun. | **Hold for API/E2E**, with no product-defect attribution beyond high-confidence reproduced mechanism and no score deduction for unproven integrated outcome. |

ARCH-REV-005's supported first-turn and source-trust premise remains confirmed; no new or reclassified design premise. Fail-closed change detection follows the reviewed contract, not a new adversarial filesystem threat model.

## Structural and design checks

| Mandatory check | Result | Evidence / action |
| --- | --- | --- |
| Task-design health assessment | Pass | SR-024 bounded resolver/capsule refactor matches the reviewed integration defect. |
| Supplemental artifact alignment | Pass | Actual team-private linked Solution Designer source and DS-006 trust rules match the changed code. |
| Data-flow spine clarity | Pass | UI first prompt → lazy member factory → shared resolver → capsule snapshot → AGY init/answer remains clear; restore is separate. |
| Ownership and boundary clarity | Pass | Existing resolver owns winning-source provenance; AGY materializer owns provider capsule copy/security. |
| Off-spine concern clarity | Pass | Filesystem snapshot remains AGY capsule concern, not an Org/UI or generic skill-service copier. |
| Existing subsystem reuse | Pass | No second skill resolver; existing binding/SkillService path enriched. |
| Reusable owned structures | Pass | One typed source descriptor and one checked snapshot path serve all AGY configured bindings. |
| Shared-data tightness | Pass | Resolved binding adds required small provenance; no mostly-optional cross-runtime base. |
| Repeated coordination ownership | Pass | Lookup precedence remains centralized in `ConfiguredAgentSkillResolver`. |
| Empty indirection | Pass | Changed functions own real provenance and checked-copy work. |
| Separation of concerns | Pass | Resolver does not copy provider files; snapshotter does not choose skill precedence. |
| Dependency direction | Pass | Backend factory → shared resolver binding → AGY capsule; no reverse runtime dependency. |
| Authoritative Boundary Rule | Pass | AGY consumes resolved binding rather than bypassing SkillService to rediscover roots. |
| File placement | Pass | Three changed source files remain in skills domain/service and AGY capsule owner paths. |
| Flat/split judgment | Pass | Snapshot code is cohesive; no forced split or mixed subsystem blob. |
| Interface/API clarity | Pass | `origin`, `sourceRoot`, `trustedRoot` identify the winning source and authority; `NONE`/restore remain explicit. |
| Naming/readability | Pass | Stable `AGY_SKILL_*` error codes and source descriptors; compact copy code remains navigable. |
| Unjustified duplication | Pass | Removed blanket walker and `fs.cp`; no second fallback copy route. |
| Patch-on-patch complexity | Pass | One checked path replaces, rather than wraps, the previous rejection/copy pair. |
| Dead-code cleanup | Pass | Old `rejectSymlinks` and unchecked generic copy removed. |
| Requirement-aligned tests | Pass | Actual mounted links, synthetic allowed/unsafe links, provenance/layout, source change, cleanup, `NONE` and immutable restore covered. |
| Test helper coherence | Pass | Shared fixture and binding builders; non-AGY consumer tests remain focused. |
| No stale/compatibility-only tests | Pass | Previous capsule tests adjusted to required binding shape; no obsolete symlink assumption retained. |
| API/E2E readiness | Pass | Focused tests/build pass; disposable real Org member first prompt remains explicitly downstream. |

Reviewer independently reran `agy-configured-skill-materializer.test.ts` and `skill-service.test.ts`: **53/53 passed** (including the mounted Solution Designer case). Implementation reports five-suite **87/87**, production TypeScript and full build/bootstrap smoke; those broader commands were not repeated by reviewer. `git diff --check 42ec93de0^ 42ec93de0` passes. No real AGY Org first-turn or Electron rerun by reviewer.

## Source-size, compatibility, persistence and docs

| Changed source | Effective non-empty lines | Added/deleted | Ownership/threshold result |
| --- | ---: | ---: | --- |
| `agy-configured-skill-materializer.ts` | 136 | 107/13 | Pass; one cohesive AGY checked snapshot; below 500-line and 220-delta thresholds. |
| `configured-agent-skill-binding.ts` | 16 | 8/1 | Pass; narrow provenance type. |
| `configured-agent-skill-resolver.ts` | 170 | 15/9 | Pass; winning branch tagged at resolution. |

No changed source crosses the limits; test files are exempt. No historical AGY migration, dual reader, PTY mode, global skill-authority fallback, or version-specific compatibility branch. Existing successful capsule manifests remain directly usable and immutable; the failed member has no provider binding/capsule to migrate. **Directly Usable — No Migration**. No dead/obsolete item remains in changed scope. Docs impact **Yes** for Delivery's existing AGY configured-skill/trust-boundary documentation, without claiming user verification.

## Review scorecard

Renewed for the SR-024 changed source, with prior unaffected areas retained from CRR-013. **Overall 9.0/10 (90/100)**. Pending real first-turn validation is an acceptance gate, not an evidenced source defect.

| Priority | Category | Score | Basis / remaining improvement |
| --- | --- | ---: | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.0 | First-turn and restore paths distinct; prove full Org activation downstream. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.0 | Resolver provenance and AGY capsule trust/copy ownership are separate. |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Required source descriptor is explicit; live provider initiation remains E2E. |
| 4 | Separation of Concerns and File Placement | 9.0 | Three changed source files fit their owners. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.0 | Small provenance type; no broad duplicated copy policy. |
| 6 | Naming Quality and Local Readability | 9.0 | Trust-root semantics and failure codes identifiable. |
| 7 | API/E2E Readiness | 9.0 | Focused source controls/build pass; actual full Org first turn pending. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | Real link fixture and fail-closed controls pass; integrated outcome unproven. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | No fallback copier, migration, old PTY or source-link preservation. |
| 10 | Cleanup Completeness | 9.0 | Aborted capsule cleanup retained and old blanket walker removed. |

## Findings, classification and route

- **New actionable source findings:** None. CR-001–CR-004/CR-006 remain resolved; CR-005 remains withdrawn. TR-001 is separate and resolved. No score deduction or machinery is based on an unsupported technical possibility.
- **Latest authoritative source result:** **Pass**, supported-scenario and material-premise gates Pass; no failure classification.
- **Primary recipient:** `/api_e2e_engineer` for disposable full Org first prompt to the **actual configured Solution Designer member**, requiring AGY init/provider ID and visible answer, linked-file capsule snapshot/negative controls, exact restore and representative Codex/Claude/non-AGY regression. Then `/implementation_engineer` informational Pass per rules.
- Delivery must rebuild Electron after validated source and obtain explicit user verification. Do not mutate the user's normal Org, release, finalize or clean up based on this source review.
