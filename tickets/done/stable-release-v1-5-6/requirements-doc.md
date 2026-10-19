# Requirements Document — stable-release-v1-5-6

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `stable-release-v1-5-6`
- Request / ticket: Project Task `project_task_784234fc-e6b8-43db-8f87-94e4a4757b13` — Release stable v1.5.6
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `User`, 2026-10-19, in the Solution Designer conversation, replying to the SR-001 questions: "just send to dleiver engineer to do a stable release please". Read as: proceed with the stable release using the recommendations as presented (DEC-001 keep F1, DEC-002 GitHub Issues, DEC-003 no extra beta checks) and route to the Delivery Engineer (DEC-004).
- Exact approved requirements baseline / solution revision: SR-001 content, recorded as approved in SR-002
- Behavior-defining supplements and their approved versions: `release-notes.md` as of SR-001 (unchanged in SR-002), approved with the same reference

## Problem And Desired Outcome

- Problem: eleven v1.5.6 betas have shipped since stable v1.5.5; users on the default (stable) channel and Docker `:latest` do not get them.
- Affected actors or systems: desktop users on stable, Docker/launcher users on `latest` or `beta`, Android and iOS (TestFlight) users.
- Desired outcome: stable `v1.5.6`, built from the content of v1.5.6-beta.11 (= origin/personal), published as GitHub Latest on every channel, with curated user-facing notes that state honestly what changed, the one-way data conversion, the update-together rule and the Docker channel moves.
- Observable definition of success: AC-001..AC-008.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | GitHub Latest = v1.5.5; desktop stable channel and Docker `:latest` = 1.5.5; `:beta` = 1.5.6-beta.11 | v1.5.6 is Latest; stable desktop installs are offered 1.5.6; `:latest`, `:beta`, `:1.5.6` = 1.5.6 | Published tags (v1.5.5, all betas) unchanged | RELEASE.md; F-01, F-07 |
| BEH-002 | User | SCN-002 | v1.5.5 notes describe up to v1.5.5 | v1.5.6 notes describe what users see since v1.5.5, in their terms | No internal IDs, review rounds or code paths | RELEASE.md "Release notes are user-facing"; inventory |
| BEH-003 | User | SCN-003 | First start of 1.5.6 converts data one-way | Notes say so plainly, recommend a backup, say rollback is not supported and give the support pointer | — | F-04; RELEASE.md Rollback; migration guideline §4 |
| BEH-004 | User | SCN-004 | Older desktop + newer node: no live text in Team/Org/delegated chats, no member files | Notes say to update desktop and nodes together | — | F-05 |
| BEH-005 | System | SCN-001 | F1 local-workspace changes present in beta.11 | Per DEC-001 | Everything else in beta.11 | F-06 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user (product owner) | Ship the betas as stable | Stable on all channels with accurate notes | Decides F1, support pointer, extra checks |
| Stable desktop users | Get the update | Offered 1.5.6 with honest upgrade notes | Data converted one-way |
| Docker/launcher users | Upgrade nodes | `:latest` and `:beta` correct on amd64/arm64 | Beta-track users can return to `latest` |
| Delivery Engineer | Cut and publish | RELEASE.md followed, results verified | Never move or delete a published tag |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Publish stable v1.5.6 on every release channel from the beta.11 content | SCN-001 |
| UC-002 | Curated user-facing release notes for v1.5.6 | SCN-002, SCN-003, SCN-004 |
| UC-003 | Record the release (delivery record) on personal and clean up | SCN-001 |

### Out Of Scope

- In-progress work: Settings model chooser (autobyteus-146), release smoke checks (autobyteus-149), MCP SDK upgrade (autobyteus-181), file-list cache race (autobyteus-180), stopped-run model (autobyteus-53), the test vault, cross-node. Not waited for, not included.
- Product code changes of any kind, unless the user chooses to revert F1 (DEC-001), which would be its own Task done first.
- Upgrading the user's own installs or nodes; the user's update check on a real install is his to do afterward.
- Changes to RELEASE.md, workflows or the release scripts.
- The NFS repository's releases.

### Non-Goals

- Re-validating each feature ticket (each was verified at its own delivery; the betas have been in use).
- Rollback support for the converted data (RELEASE.md: migrations move forward).

### Preserved Behavior Boundary

- BEH-001 preserved column: no published tag is moved or deleted.
- The tagged content equals beta.11's product content (REQ-002), plus only the release bump and curated notes.

### Prerequisites

None, unless the user chooses to revert F1 (DEC-001 option B), which would become a prerequisite Task.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Publish `v1.5.6` per RELEASE.md as a non-prerelease GitHub release marked Latest, with all four release workflows succeeding on the tag and 17 release assets. | BEH-001 | Critical | Stable definition | RELEASE.md; Task |
| REQ-002 | The tag is cut from origin/personal at a revision whose product content equals v1.5.6-beta.11 (only ticket records and the release bump/notes may differ), and the tag is an ancestor of origin/personal. If origin/personal gains product changes before the cut, stop and ask. | BEH-001, BEH-005 | Critical | Ship what was beta-tested | F-01; Task |
| REQ-003 | The GitHub release body is the curated `release-notes.md` of this ticket (via `.github/release-notes/release-notes.md` in the tagged revision): functional, in users' terms, grouped by what users see since v1.5.5, without internal IDs, review rounds or code paths. | BEH-002 | Critical | RELEASE.md | Supplement |
| REQ-004 | The notes state that the first start converts existing data one-way (task agents' own runs; message-log conversion), recommend a backup with where the data is, state that installing an older version afterwards is not supported, and point users who need to go back to support. | BEH-003 | Critical | RELEASE.md Rollback; migration guideline §4 | DEC-002 |
| REQ-005 | The notes state that the desktop app and its remote and Docker nodes must be updated together, with the observable effect of a mismatch. | BEH-004 | High | No version-skew compatibility | F-05 |
| REQ-006 | The notes state the Docker tags (`:1.5.6`, `:latest`, `:beta`) and how beta-track launcher users return to `latest`. | BEH-001 | High | RELEASE.md Server Docker tags | — |
| REQ-007 | The notes do not announce items already in v1.5.5 or beta-only regressions that stable users never had. | BEH-002 | Medium | Accuracy | F-02, F-03 |
| REQ-008 | Docker `autobyteus/autobyteus-server:1.5.6`, `:latest` and `:beta` resolve to the 1.5.6 image for linux/amd64 and linux/arm64. | BEH-001 | Critical | Channels | RELEASE.md |
| REQ-009 | The delivery record is merged to personal and the release worktree/branches are cleaned up. | — | High | Task "Done when" | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Tag `v1.5.6` pushed | `gh release view v1.5.6`: `isPrerelease=false`, 17 assets; GitHub Latest = v1.5.6 | Partial publication → recorded as partial; recovery per RELEASE.md, never moving the tag | gh CLI / API (`releases/latest`) |
| AC-002 | REQ-001 | SCN-001 | Tag pushed | Desktop, Android, iOS and Server Docker workflows for `v1.5.6` concluded `success` | Transient failure → rerun failed jobs only | `gh run list`/`gh run view` |
| AC-003 | REQ-002 | SCN-001 | Before tagging and after | `git diff v1.5.6-beta.11 v1.5.6` touches only `tickets/`, `autobyteus-web/package.json` version and `.github/release-notes/release-notes.md`; `git merge-base --is-ancestor v1.5.6 origin/personal` | Product diff → stop, ask the user | git |
| AC-004 | REQ-003, REQ-007 | SCN-002 | Release published | Release body equals the approved `release-notes.md`; no internal IDs | — | `gh release view --json body` vs file |
| AC-005 | REQ-004, REQ-005 | SCN-003, SCN-004 | Release published | Body contains the backup, one-way conversion, no-rollback, support-pointer and update-together statements | — | Read the body |
| AC-006 | REQ-006, REQ-008 | SCN-001 | Docker workflow done | `:1.5.6`, `:latest`, `:beta` manifests list amd64 and arm64 and share the same digest | — | `docker buildx imagetools inspect` / registry API |
| AC-007 | REQ-001 | SCN-001 | Desktop workflow done | `latest*.yml` updater metadata on the release name version 1.5.6; Android `.sha256` present | — | release assets |
| AC-008 | REQ-009 | — | After publication | Delivery record merged to origin/personal; release worktree and branches removed | — | git |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Delivery Engineer under RELEASE.md | Publish stable | `desktop-release.sh release 1.5.6 --release-notes … --no-push`, push branch and tag | origin/personal ⊇ beta.11 | checks → cut → push → 4 workflows → verify | v1.5.6 on all channels | Partial/transient per RELEASE.md Recovery | Supported Normal Scenario | RELEASE.md | REQ-001,002,006,008,009; AC-001..003, 006..008 |
| SCN-002 | User | Stable desktop user | Learn what changed | Update prompt / GitHub release page | On v1.5.5 | Reads notes | Understands changes since v1.5.5 | — | Supported Normal Scenario | RELEASE.md | REQ-003, REQ-007; AC-004 |
| SCN-003 | User | User with existing data | Update safely | Release notes | Has runs from earlier versions | Backs up, updates, first start converts | Data kept; knows no downgrade | Needs to go back → contacts support | Supported Normal Scenario | F-04 | REQ-004; AC-005 |
| SCN-004 | User | User with a remote/Docker node | Keep desktop and node working | Release notes | Desktop and node on 1.5.x | Updates both | Live text and member files work | Mismatch → missing live text/files | Supported Normal Scenario | F-05 | REQ-005; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (release notes text only). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-003 | Operability | Pre-tag `check_licensing.py` and `check_repository_artifact_hygiene.py` pass on the cut | Before tag | Delivery logs |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`, by code already in beta.11 (no new migration in this ticket).
- Data or state that must be preserved: users' data is converted at the first start by the already-verified migrations; this ticket only communicates it (REQ-004).
- Acceptable loss: none new.
- Constraints: rollback not engineered (RELEASE.md).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GitHub Releases / Actions | 4 workflows on `v*` tag | RELEASE.md | Transient runner failures |
| Docker Hub | `:latest`, `:beta` move forward | RELEASE.md | — |
| App Store Connect | TestFlight upload only | RELEASE.md | Public App Store review external |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/release-notes.md` | Curated v1.5.6 notes | REQ-003..REQ-007; AC-004, AC-005 | Approved (SR-001 content) | Behavior-defining; approved by the user 2026-10-19 |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Version 1.5.6 is the right stable (1.5.6 > every 1.5.6-beta.N) | Version choice | Delivery confirms with `release_versions.py` | Validated (semver) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | F1: keep the two non-skill local-workspace changes from the NFS extraction for the stable, or revert first? | Visible behavior; a revert would be its own Task before the release | A: keep (in beta since beta.2, used by the user). B: revert first. Evidence F-06 | Keep. A run that silently works in the temporary folder instead of the user's chosen workspace writes files where the user doesn't look; an error the user can act on is safer. The behavior has been in every beta since beta.2 with no report against it. The notes mention it (Improvements). | User | Decided by user (keep), 2026-10-19 |
| DEC-002 | Support pointer for users who need to go back | RELEASE.md requires one; none is documented | GitHub Issues (public, enabled); an email address; other | GitHub Issues of `AutoByteus/autobyteus-workspace`: public, already enabled, no new channel needed. | User | Decided by user (GitHub Issues), 2026-10-19 |
| DEC-003 | Anything to check in the beta before the stable? | Could delay | Evidence F-07: beta.9–11 published fully; each ticket verified at delivery | Nothing extra recommended; the user has been running the betas. | User | Decided by user (no extra checks), 2026-10-19 |
| DEC-004 | Route: send the approved package straight to the Delivery Engineer | No configured rule covers a release-only request; the implementation route has nothing to implement | Precedent v1.5.4 (`stable-release-20261014`): user named Delivery | Send to Delivery Engineer directly (needs the user to name it, since no rule matches). | User | Decided by user ("just send to delivery engineer"), 2026-10-19 |
| DEC-005 | Omit Task keys / depends on, the beta-only skill regression fix and the withdrawn adoption from the notes | Accuracy | F-02, F-03 | They are not changes for stable users. | Solution Designer | Decided |
| DEC-006 | Put the backup / update-together warnings first ("Before You Update") | Users must read them before updating | Template has no such section; scripts don't validate headings | Safety-critical text belongs before features. | Solution Designer | Decided |
| DEC-007 | Include the data folder location in the backup advice | RELEASE.md bars code paths, not user guidance | Desktop `~/.autobyteus/server-data`; Docker data volume | A backup instruction needs a location. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-007 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-001, BEH-005 | AC-003 | SCN-001 | — |
| REQ-003 | UC-002 | BEH-002 | AC-004 | SCN-002 | release-notes.md |
| REQ-004 | UC-002 | BEH-003 | AC-005 | SCN-003 | release-notes.md |
| REQ-005 | UC-002 | BEH-004 | AC-005 | SCN-004 | release-notes.md |
| REQ-006 | UC-002 | BEH-001 | AC-006 | SCN-001 | release-notes.md |
| REQ-007 | UC-002 | BEH-002 | AC-004 | SCN-002 | release-notes.md |
| REQ-008 | UC-001 | BEH-001 | AC-006 | SCN-001 | — |
| REQ-009 | UC-003 | — | AC-008 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-004.
- Constraints: RELEASE.md in full; never move/delete published tags; product content = beta.11.
- Deferred to design: none beyond the RELEASE.md procedure.
- Technical facts to verify at cut: origin/personal still product-equal to beta.11.
- Risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
