# Requirements — résumé PDF search preview

## Document Status
- Status: Approved
- Package: `resume-pdf-search-preview`; Project Task `project_task_1aefbe1a-dfb5-4ec1-b893-8423b09a12dd`
- Owner/approver: Solution Designer within delegated direction, user informed, 2026-10-12.
- Exact approved baseline: R1 / SR-001. Approval reference: conversation message beginning “The server logs show that search results contain absolute paths”.
- Behavior-defining supplements: None. Screenshot and probe are evidence, not separate normative behavior.
- Authorities read: solution-designer/SKILL.md, requirements-engineering.md and requirements-doc-template.md; root/package AGENTS.md, DESIGN.md, TESTING.md (including refreshed base delta), RELEASE.md.

## Problem And Desired Outcome
The user searches `resume` in the investor-applications Files panel, clicks a résumé PDF and receives HTTP 400 instead of a rendered PDF. Establish the actual cause and correct the software defect without editing documents or weakening workspace access. Success is a valid PDF rendering from a search result on a changed build and, after safe rollout, explicit verification in the user's port-8001 environment. Source-only success is insufficient.

## Relevant Current And Desired Behavior
| Behavior | Kind / scenarios | Current evidence | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001 | User screenshot, server error/access logs and isolated installed-module reproduction: search produces absolute paths rejected by protected content reader | Selecting a PDF search result displays its pages | Search ordering, workspace selection, lazy-loaded results, shared PDF viewer |
| BEH-002 | User / SCN-002 | Tree browsing uses relative paths; shared viewers and content routes are documented | Search-selected files retain the same workspace identity as browsed files | Existing content and editing semantics; no desktop-local or external-URL behavior changes |
| BEH-003 | Contract / SCN-003 | resolveWorkspaceRelativePath rejects absolute and escaping paths; REST returns 400 | All existing rejection boundaries continue | No expansion of readable filesystem, no new arbitrary-host file access |
| BEH-004 | Operational / SCN-004 | Running server is /app build, distinct from git workspace; host public URL 8001, container listen 8000 | Changed build delivery and runtime/user verification are reported precisely | User documents, settings, conversations, unrelated services and work |

## Stakeholders, Actors, And Outcomes
User: read résumé within selected workspace. Engineering: focused evidence-backed correction and durable regression. Delivery: safely coordinate deployment/verification without treating source changes as runtime delivery.

## Scope Guardrail (Mandatory)
| Use case | Scope | Scenarios |
| --- | --- | --- |
| UC-001 | Search and open a workspace PDF; preserve shared search-file identity | SCN-001, SCN-002 |
| UC-002 | Preserve existing workspace content path restrictions | SCN-003 |
| UC-003 | Coordinate safe delivery to the user-reported Docker runtime | SCN-004 |
Out of scope: résumé changes, search ranking/index deduplication changes, new content types, global host file access, symlink-security redesign, auth changes, UI redesign, broad upgrades/migrations or unrelated services.
Non-goals: search-performance promises or a public version release (no release requested; RELEASE.md default applies).
Preserved boundary: BEH-002/003/004, REQ-002/003. No loss of application state is acceptable.
Review authority: blocking corrections must cite these approved IDs; scope-changing proposals are Requirement Gaps requiring approval, not automatic technical corrections. Adjacent concerns are non-blocking follow-ups. Review findings do not amend requirements by themselves.

## Requirements
| ID | Requirement | Behavior / source | Priority |
| --- | --- | --- | --- |
| REQ-001 | A valid in-workspace PDF selected from Files search must render through the existing workspace preview path; result identity must work even when parent folders are not expanded | BEH-001/002; user request and Files documentation | Must |
| REQ-002 | Existing workspace-scoped access validation must retain its absolute-path, traversal and outside-workspace rejections; no content bypass to fix search | BEH-003; user constraint and current protected reader | Must |
| REQ-003 | Preserve user documents and unrelated state/services; record actual changed-build validation, deployment state, explicit user verification, outstanding checks and cleanup | BEH-004; delegation, TESTING.md, RELEASE.md | Must |
| REQ-004 | Keep search-selected and tree-selected identity consistent for shared file access, with durable regression coverage of the established path defect | BEH-001/002; consistency solution detail DEC-001 | Must |

## Acceptance Criteria
| ID | Related IDs / scenario | Preconditions and trigger | Observable outcome / verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001/004; BEH-001; SCN-001 | Test-owned workspace contains a valid multi-page PDF in an unexpanded nested folder; search `resume`, click result | Search result opens workspace content, response 200 with application/pdf and matching fixture bytes, real viewer renders PDF canvases/pages without load-error alert; changed-stack browser assertions plus screenshot |
| AC-002 | REQ-002; BEH-003; SCN-003 | Content request with valid relative path vs absolute in-root, absolute outside, parent traversal or sibling-prefix escape | Valid request succeeds; prohibited inputs remain denied with no outside bytes. Retain existing REST/security response contract; use real path owner, not only mocked getAbsolutePath |
| AC-003 | REQ-004; BEH-002; SCN-002 | Search-selected PDF and representative text file versus tree-selected equivalent | Same workspace/file identity; text can be read; search results don't publish host absolute paths as workspace locators. Existing search abort/ordering and lazy-node handling remain |
| AC-004 | REQ-003; BEH-004; SCN-004 | Delivery candidate verified in isolation; applicable user approval obtained before disruptive rollout | Exact deployed revision/build, target runtime, rollout or precise blocker, rollback, explicit user verification reference, résumé checksum unchanged and cleanup receipt recorded. No success claim for port8001 if only isolated tests/source done |

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal, starting condition, trigger and product steps | Expected outcome / alternate | Validity / independent basis | Related IDs |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Selected investor workspace; nested PDF exists; Files search `resume` → result → preview | Pages render; missing/unreadable file remains error | Supported Normal Scenario; user screenshot + request + file_explorer docs | REQ-001/004; AC-001 |
| SCN-002 | User | Browse file or search same file (even unloaded nested folder) → open existing viewer/editor | Equivalent workspace file, shared access path; unsupported types unchanged | Supported Normal Scenario; FileExplorer/FileItem and docs | REQ-004; AC-003 |
| SCN-003 | Contract | Workspace reader receives prohibited absolute/escaping request while serving registered workspace | Denial before bytes; correct relative file still accessible | Supported Explicit Edge Scenario; user safety constraint, path-utils and REST contract | REQ-002; AC-002 |
| SCN-004 | Operational | Validated fix needs rollout to running Docker backend used by user's frontend | Safe coordinated rollout, real user re-search/open verification; blocker if prerequisites absent | Supported Normal Scenario; explicit delegated outcome, TESTING/RELEASE | REQ-003; AC-004 |

## UI, Interaction, And Experience Requirements
Preserve current Files/search/PDF interaction; no new visual behavior. Product design/spec/visual approval: N/A — bug fix, not a Product Design request. Error states outside the proven defect stay unchanged.

## Quality And Non-Functional Requirements
QR-001 Security → REQ-002/AC-002: existing accepted/rejected path boundary unchanged. QR-002 Data/operability → REQ-003/AC-004: no user-data edits; no uncoordinated restart or tests against live user data.

## Data Continuity And Acceptable Loss
Documents and production app state must be preserved; no rewriting, deletion or migration authorized. The report must retain the original résumé SHA-256 as an integrity check. Test-owned fixtures may be removed. Transient search tabs/results can be refreshed through normal user action, not hidden production-state edits.

## External Contracts And Dependencies
Existing GraphQL search, workspace content REST, PDF viewer and Docker runtime. Search returns strings used as workspace file identity; intended result format must be compatible with protected relative readers. No host filesystem or unrelated API expansion. Runtime rollout may require host Docker access and interruption approval; those are delivery prerequisites, not scope amendments.

## Supplemental Artifacts / Assumptions
See canonical investigation inventory. No behavior-defining supplements. No assumption of PDF corruption, missing mount or service identity; investigated facts replace those premises. Exact Docker image tag/digest and desktop frontend build remain unverified.

## Decisions
| ID | Question | Reasoning / recommendation | Owner / status |
| --- | --- | --- | --- |
| DEC-001 | PDF-only workaround vs consistent search identity? | All search results flow to shared file access; repairing the established identity mismatch avoids the same issue for text/media and preserves UI. Approve workspace-relative search identities, not relaxed readers or PDF-specific bypass | Solution Designer / Decided within direction |
| DEC-002 | Live automated tests and immediate restart? | TESTING.md forbids testing against user's running app, and conversations depend on server. Validate on test-owned data/ports; delivery coordinates rollout and asks user for explicit verification. Do not silently restart | Solution Designer / Decided within direction; rollout interruption decision belongs to user if needed |

## Traceability
REQ-001 → UC-001 / BEH-001 / SCN-001 / AC-001. REQ-002 → UC-002 / BEH-003 / SCN-003 / AC-002. REQ-003 → UC-003 / BEH-004 / SCN-004 / AC-004. REQ-004 → UC-001 / BEH-001/002 / SCN-001/002 / AC-001/003.

## Architecture Phase Input
Verify public search ownership and all consumers; choose one correction boundary, retain protected readers unchanged, examine strategy outputs/cancellation lifecycle and current external response format. Deployment must not be conflated with source checkout. No persisted-data transition requested.

## Readiness Check
Current evidence, desired/preserved behavior, scope, traceability, supported scenario validity, measurable safety/data constraints and decisions: Yes. Product/supplement approval: N/A. Content ready: Yes. Approval recorded for R1/SR-001 with user informed: Yes. Ready for architecture: Yes. Open requirements decisions/blockers: None.
