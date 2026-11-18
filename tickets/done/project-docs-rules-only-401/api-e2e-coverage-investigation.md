# API/E2E Coverage Investigation — autobyteus-401 (project documents hold rules only)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/project-docs-rules-only-401/requirements-doc.md` (SR-001; § Document Status "Validation": reading and grep only)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md`
- Supplemental Task Artifacts: `handoff-implementation.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct Small / Low route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation_engineer handoff, IR-001, HEAD `10a6967442`
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

RELEASE.md loses `## Case Studies`, and its three stories are appended to their release records (REQ-001, AC-002). Incident mentions inside rules become reasons (REQ-002, AC-003). No reference to the removed section remains, and anchors resolve (REQ-003, AC-004). One-line pointers name the record paths on `personal` (REQ-005, AC-005). TESTING.md is unchanged (REQ-004). No rule changes meaning. Docs only; no release.

The user decided the validation surface (2026-11-06, recorded in the requirements doc): "is super simple. There's nothing to test to be honest." Reading and grep only: no test suites, builds or gates.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (a role reads the documents to follow the project's rules).
- Real-use scenarios added: SCN-A1, a reader follows a pointer or anchor from RELEASE.md or DESIGN.md, or a moved story's link inside a record. Every such link must resolve.
- Contrived scenarios: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 RELEASE.md rules and section | Changed (stories removed; meaning preserved) | `277660ed19` | Reading review; text-coverage diff |
| BEH-002 DESIGN.md rule 12 example | Changed (pointer to records) | `5b6ae4805b` | Reading review; path check |
| Three release records | Added to (append only) | `277660ed19` | Append-only check; their links resolve |

## Changed Surface And Boundary Classification

Only project documentation and archived records change. Every runtime surface (backend, API, frontend, browser, auth, desktop renderer/shell, lifecycle, persisted data, workers, external integration) is `No`. Repository evidence: the documents themselves.

- Changed build-input paths (the guideline's list compared with `git diff --name-only 6324fb056d...HEAD`): `None` (DESIGN.md, RELEASE.md, `tickets/**`). No fresh-start build case is needed.

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-docs-rules-only-401`, branch `codex/project-docs-rules-only-401`, HEAD `10a6967442`
- Project testing guideline path(s): `TESTING.md` (root), read for § Fresh-start build
- Conflicting, missing, or unclear project instructions: None. The user's reading-only decision sets the surface.
- Required environment variables or secrets available: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `requirements-doc.md` § Validation | The user's decision | Reading and grep only |
| `TESTING.md` § Fresh-start build | Build-input list | No changed path matches |

Components, data and fixtures: none (read-only checks on the repository).

## Existing Durable Coverage Inventory

None relevant. No test covers documentation wording; the hygiene check covers tracked paths, and no path names change here.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-002 | removed section vs three records | Temporary Probe | Normalized line-by-line check that each removed line appears in the appended text, with link targets ignored; `git diff -U0` hunks show the records were only appended to | An independent rerun of IMP-01 |
| API-02 | AC-004, AC-005, AC-001, REQ-004 | references, links, anchors, pointer paths | Temporary Probe | `git grep` for "Case Studies" outside tickets/; a link and anchor resolver over RELEASE.md, DESIGN.md, TESTING.md and the three records; `git cat-file -e origin/personal:<path>` for each pointer; version and date greps; TESTING.md diff | An independent rerun of IMP-02 and IMP-03, extended to anchors and the records' links |
| API-03 | AC-001, AC-003, BEH-002 | reading review | Journey (reading) | Read each rewritten rule before and after; check that each rule the removed stories listed as "added from it" still stands | Meaning can only be judged by reading |

- Test progress log needed: `Yes` (three cases, kept short)

## Durable Coverage To Add / Update / Remove

None: these are one-off documentation checks, and the user asked for reading only.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Test suites, builds, gates | The user's decision; no code or build input changed | None | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
