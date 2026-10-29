# Design Spec — stable-release-v1-5-6

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: SR-001 content, approved by the user 2026-10-19 ("just send to dleiver engineer to do a stable release please"), recorded in SR-002
- Behavior-defining supplements: `release-notes.md` (SR-001 content), same approval
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/DESIGN.md` (rule 9, no version-skew compatibility, drives REQ-005); `RELEASE.md` (governs the whole procedure). `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None. One RELEASE.md wording note: Rollback says "Docker users pin an earlier version tag to go back", which does not hold after this release's one-way data conversion. The notes say so for Docker explicitly; RELEASE.md itself is out of scope (possible follow-up, see Change Scope).

## Current-State Read

No product code changes. The candidate content is v1.5.6-beta.11 (`87732d5504`); `origin/personal` (`69d7d4f3e6`) adds only a docs-only delivery record (F-01). The release mechanism is RELEASE.md's stable path: `scripts/desktop-release.sh release X.Y.Z --release-notes <file> --branch <b> --no-push` bumps `autobyteus-web/package.json`, writes `.github/release-notes/release-notes.md`, commits `chore(release): …` and creates an annotated tag; pushing the `v*` tag starts the four release workflows (Desktop, Android, iOS, Server Docker). Stable tags publish non-prerelease releases (GitHub Latest), curated body from the tagged `.github/release-notes/release-notes.md`, Docker `:X.Y.Z` + `:latest`, and `:beta` when newest (`release_versions.py is-newest`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one curated notes file plus the release helper's standard version bump; no source, test, contract or workflow change.
- Architectural risk: `Low`
- Risk rationale: no structural surface changes in this ticket. The migrations, contract changes and NFS boundary changes shipped in the betas were each reviewed and verified in their own tickets; this ticket only publishes them as stable through the existing release path. Publication itself is irreversible (immutable tags; one-way user data conversion), handled by RELEASE.md's Recovery rules and the notes' backup/no-rollback text, not by design machinery.
- Escalation trigger: origin/personal gains any non-`tickets/` change before the cut; a pre-tag check fails; a release workflow fails because of tag content. Stop and return to Solution Designer / the user rather than widening scope.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Candidate diff | `git log v1.5.6-beta.11..origin/personal` | One docs-only commit | Cut from current origin/personal (REQ-002) | Recheck at cut |
| Release helper | `scripts/desktop-release.sh`; `.github/workflows/release-desktop.yml:641` | No heading validation; curated file used as body | Notes may use a "Before You Update" section first | — |
| Pipeline health | `gh run list` (beta.9–11 all success; beta.11 17 assets) | Workflows healthy on this content | No extra pre-checks | Transient CI |
| Version | semver | 1.5.6 > 1.5.6-beta.N; Android code limits respected | Version `1.5.6` | Delivery confirms with `release_versions.py android-version-code 1.5.6` |

## Intended Change

Publish stable `v1.5.6` from origin/personal with this ticket's curated notes, verify every channel, record the release and clean up.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. Files changed: this ticket folder; at cut, the helper's `autobyteus-web/package.json` version and `.github/release-notes/release-notes.md`.
- Deliberately left alone: all product code (F1 kept by the user's decision DEC-001); RELEASE.md, workflows and scripts; in-progress Tasks named in the Task (autobyteus-146, -149, -181, -180, -53, test vault, cross-node); users' installs and nodes; the NFS repository.
- Follow-ups:
  - FU-1: RELEASE.md Rollback says Docker users can pin an earlier version tag to go back; after a release with a one-way data migration that is not true. Suggest one sentence there pointing to the release notes' rollback statement. (Docs only; for `/project_task_manager`.)
  - FU-2: the repository documents no support channel; RELEASE.md asks notes to point to support. This release uses GitHub Issues (user decision DEC-002); recording it in RELEASE.md would make it the standing pointer. (Docs only.)

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, 002, 006, 008; AC-001..003, 006, 007 | Delivery runs the stable cut | Latest = v1.5.5 | v1.5.6 Latest on all channels; no published tag moved | DS-001 |
| BEH-002..004 | User | REQ-003..005, 007; AC-004, AC-005 | Users read the release | v1.5.5 notes | Approved curated notes are the body | DS-001 (notes travel with the tag) |
| BEH-005 | System | REQ-002 | — | F1 in beta.11 | Kept unchanged | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/release-notes.md` | Curated notes | REQ-003..007 | Input to `--release-notes`; after archiving, `tickets/done/stable-release-v1-5-6/release-notes.md` | Approved |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (release of completed work); no code change.
- Current design issue found: `No`
- Structural triggers: none fire; no code, interface, persistence or ownership change in this ticket (persisted-data triggers were handled in the delivering tickets).
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: F-01, F-07.
- Design response: follow RELEASE.md unchanged.
- Intentional deferrals: FU-1, FU-2 (docs).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in scope: None.
- Compatibility mechanisms kept: `None`.

## Persisted Data / State Transition Decision

- Decision for this ticket: `Not Affected`. This ticket writes no data. The one-way migrations it publishes (`20261017_task_agent_own_run_v1`, message-log conversion) and the Work Journal cleanup were designed and verified in their own tickets; REQ-004 only requires the notes to state them, with backup advice and the support pointer, per the migration guideline §4.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..004 | Finalize branch from origin/personal | v1.5.6 on GitHub (Latest), updater metadata, Android APK, TestFlight, Docker Hub | Delivery Engineer under RELEASE.md | The whole release |

## Primary Execution Spine(s)

`finalize/stable-release-v1-5-6 (origin/personal + archived ticket) -> pre-tag checks -> desktop-release.sh release 1.5.6 --no-push -> push personal, push v1.5.6 -> 4 release workflows -> GitHub release / updater / APK / TestFlight / Docker tags -> verification -> delivery record on personal -> cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Delivery archives this ticket to `tickets/done/`, branches `finalize/stable-release-v1-5-6` from freshly fetched origin/personal, merges the ticket branch, confirms no product diff against beta.11, runs licensing and hygiene checks, cuts 1.5.6 with the archived notes, re-fetches, pushes personal then the tag, watches the four workflows, verifies release/assets/Latest/Docker manifests, commits the delivery record to personal, removes the worktree and branches. | release commit, tag, four workflows, published channels | Delivery Engineer | RELEASE.md Recovery for partial/transient failures |

## Spine Actors / Main-Line Nodes

Release helper, tag, release workflows, published channels.

## Ownership Map

- Delivery Engineer: cut, push, watch, verify, record, clean up (team instruction; RELEASE.md).
- Solution Designer: notes content (approved), receipt verification.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no code.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6`, branches `codex/stable-release-v1-5-6`, `finalize/stable-release-v1-5-6` | Release done | Archived ticket on personal | In This Change | REQ-009 |

## Return Or Event Spine(s) (If Applicable)

Delivery returns `Delivery Completed` to Solution Designer for receipt verification.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| RELEASE.md Recovery | DS-001 | Delivery | Rerun failed jobs; never move tags | Partial publications | — |

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules / Interface Boundary Mapping / Interface Boundary Check / Naming Check / Reuse Check / Subsystem Allocation / File Responsibility Mappings / Reusable Structures / Tightness Check / Applied Patterns / Folder Boundary Check

N/A — no code or interfaces change. Reuse: the existing release helper and workflows, unchanged.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `tickets/done/stable-release-v1-5-6/` | Folder | This ticket | Requirements, design, notes, delivery record | Ticket archive convention | Raw `.xcresult`, CI zips, names with `:` (hygiene) |
| `.github/release-notes/release-notes.md` | File | Release helper | Copy of the approved notes | RELEASE.md | Internal IDs |
| `autobyteus-web/package.json` | File | Release helper | Version `1.5.6` | RELEASE.md | Other changes |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Cut command | `bash scripts/desktop-release.sh release 1.5.6 --release-notes tickets/done/stable-release-v1-5-6/release-notes.md --branch finalize/stable-release-v1-5-6 --no-push` | Running it in the shared checkout, or without `--no-push` | RELEASE.md |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Rollback support for converted data | One-way migrations | Rejected (RELEASE.md, migration guideline §4) | Notes: backup first; contact support |
| Version-skew tolerance desktop/node | Mixed versions | Rejected (DESIGN.md rule 9) | Notes: update together |

## Change / Refactor Sequence

1. Archive the ticket folder to `tickets/done/stable-release-v1-5-6/` on the ticket branch (or the finalize branch).
2. `git fetch origin personal`; `git checkout -b finalize/stable-release-v1-5-6 origin/personal`; `git merge --no-ff codex/stable-release-v1-5-6`.
3. `git diff --stat v1.5.6-beta.11 HEAD -- . ':!tickets'` must be empty (AC-003). Otherwise stop and ask.
4. Remove untracked `*/dist/`; `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`; `python3 scripts/release_versions.py android-version-code 1.5.6`.
5. `bash scripts/desktop-release.sh release 1.5.6 --release-notes tickets/done/stable-release-v1-5-6/release-notes.md --branch finalize/stable-release-v1-5-6 --no-push`.
6. `git fetch origin personal` (unchanged), `git push origin HEAD:personal`, `git push origin v1.5.6`.
7. Watch all four workflows; verify AC-001, AC-002, AC-004..AC-007.
8. Commit the delivery record to personal (fetch-check before push), remove worktree and branches (AC-008).

## Key Tradeoffs

- Cut from current origin/personal rather than from the beta.11 commit: the extra commit is docs-only, and RELEASE.md cuts from personal; product content still equals beta.11 (AC-003).

## Risks

- RSK-001/RSK-002 (investigation notes). A tag-content failure requires a new patch version (1.5.7), never moving the tag.

## Guidance For Implementation

There is no implementation step. Delivery Engineer owns steps 1–8. The notes text is approved; editorial fixes to it are fine, content changes come back to Solution Designer.
