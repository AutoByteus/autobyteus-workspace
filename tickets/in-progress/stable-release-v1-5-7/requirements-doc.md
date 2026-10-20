# Requirements Document: stable-release-v1-5-7

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `stable-release-v1-5-7`
- Request / ticket: Project Task autobyteus-213, "Release stable v1.5.7"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-20 ("I think we could release a stable version now, since the embedding feature is already there")
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `Solution Designer within the direction (user informed)`. The user's direction in the Solution Designer conversation, 2026-10-20: "I just want to release the latest version. Okay, whatever on the personal, it's not like you're going to pick what will be released. Okay, release the latest." This overrides the Task's candidate (v1.5.7-beta.4 without autobyteus-190). The notes follow RELEASE.md and the v1.5.6 precedent; there is no `Needs user` decision.
- Exact approved baseline: SR-001
- Behavior-defining supplements: `release-notes.md` (SR-001), approved with the same reference

## Problem And Desired Outcome

- Problem: four v1.5.7 betas and a later fix (MCP Bulk Import) are on `personal`. Users on the stable channel and on Docker `:latest` are still on v1.5.6.
- Desired outcome: stable `v1.5.7`, cut from the `origin/personal` tip at cut time, published as GitHub Latest on every channel. Curated notes state what changed since v1.5.6, the one-way conversion of delegated runs, the update-together rule and the Docker channel moves.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Latest = v1.5.6; Docker `:latest` = 1.5.6; `:beta` = 1.5.7-beta.4 | v1.5.7 is Latest; `:1.5.7`, `:latest`, `:beta` = 1.5.7 | No published tag moved or deleted | F-05, F-07; RELEASE.md |
| BEH-002 | User | SCN-002 | v1.5.6 notes | v1.5.7 notes in users' terms, since v1.5.6 | No internal IDs | Notes inventory |
| BEH-003 | User | SCN-003 | The first start converts delegated runs' files one-way | Notes: backup, no going back, support pointer | — | delegated-copy notes; RELEASE.md Rollback |
| BEH-004 | User | SCN-004 | Mixed desktop and node versions are unsupported | Notes: update together | — | DESIGN.md rule 9 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Publish stable v1.5.7 on every channel from the `origin/personal` tip at cut time | SCN-001 |
| UC-002 | Curated release notes | SCN-002..SCN-004 |
| UC-003 | Delivery record on personal; cleanup | SCN-001 |

### Out Of Scope

- Product code changes; RELEASE.md, workflow and script changes.
- Waiting for in-progress work (notification area, cross-node, runtime lifecycle review, release smoke checks, and so on). Whatever is merged to `personal` at the cut ships; nothing else does.
- The user's own installs and Docker node (his to update and check).

### Non-Goals

- Re-validating each feature ticket (each was verified at its own delivery; the betas are in use).
- Rollback support for converted data.

### Preserved Behavior Boundary

No published tag is moved or deleted (BEH-001).

### Prerequisites

None.

### Review Authority

As in the template: findings cite REQ/AC IDs; scope changes need the user.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Publish `v1.5.7` per RELEASE.md: a non-prerelease GitHub release marked Latest, all four release workflows succeeded on the tag, 17 assets | BEH-001 | Critical | RELEASE.md; Task |
| REQ-002 | Cut from the `origin/personal` tip at cut time with the standard stable path (`desktop-release.sh release 1.5.7 --release-notes … --no-push`). The tag is on `personal`. Record the exact candidate revision and its diff from v1.5.7-beta.4 in the delivery record | BEH-001 | Critical | The user's direction 2026-10-20 |
| REQ-003 | The release body is this ticket's curated `release-notes.md` (via `.github/release-notes/release-notes.md` in the tagged revision): functional, in users' terms, since v1.5.6, no internal IDs | BEH-002 | Critical | RELEASE.md |
| REQ-004 | The notes state the one-way conversion of delegated runs, a backup with where the data is, that installing an older version afterwards is not supported, and the GitHub Issues support pointer | BEH-003 | Critical | RELEASE.md Rollback |
| REQ-005 | The notes state that the desktop app and its remote and Docker nodes are updated together | BEH-004 | High | DESIGN.md rule 9 |
| REQ-006 | The notes state the Docker tags and how beta-track launcher users return to `latest` | BEH-001 | High | RELEASE.md |
| REQ-007 | Docker `:1.5.7`, `:latest` and `:beta` resolve to the 1.5.7 image on linux/amd64 and linux/arm64 | BEH-001 | Critical | RELEASE.md |
| REQ-008 | If a product change lands on `personal` after the notes were written and before the cut, the notes cover it: delivery returns to the Solution Designer for the notes, without waiting for anything in progress | BEH-002 | High | Accuracy |
| REQ-009 | The delivery record is merged to personal; the worktree and branches are cleaned up | — | High | Task |

## Acceptance Criteria

| AC | REQ | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Tag pushed | `gh release view v1.5.7`: `isPrerelease=false`, 17 assets; `releases/latest` = v1.5.7 | gh CLI / API |
| AC-002 | REQ-001 | Tag pushed | Desktop, Android, iOS and Server Docker workflows succeeded on `v1.5.7` | `gh run list` / `gh run view` |
| AC-003 | REQ-002, REQ-008 | Before and after tagging | `git merge-base --is-ancestor v1.5.7 origin/personal`. `git diff <candidate> v1.5.7` touches only `tickets/`, the `autobyteus-web/package.json` version and `.github/release-notes/release-notes.md`. The product commits since v1.5.7-beta.4 are exactly those covered by the notes | git |
| AC-004 | REQ-003 | Published | The release body equals the archived `release-notes.md`; no internal IDs | `gh release view --json body` vs the file |
| AC-005 | REQ-004..REQ-006 | Published | The body has the backup, one-way conversion, no-going-back, support pointer, update-together and Docker statements | Read the body |
| AC-006 | REQ-007 | Docker workflow done | `:1.5.7`, `:latest` and `:beta` share one digest listing amd64 and arm64 | `docker buildx imagetools inspect` |
| AC-007 | REQ-001 | Desktop workflow done | `latest*.yml` updater metadata names 1.5.7; Android `.sha256` present | release assets |
| AC-008 | REQ-009 | After publication | Delivery record on origin/personal; release worktree and branches removed | git |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Trigger | Expected | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Delivery Engineer under RELEASE.md | Stable cut and push | v1.5.7 on all channels | Supported Normal |
| SCN-002 | User | Stable desktop user | Update prompt / release page | Understands changes since v1.5.6 | Supported Normal |
| SCN-003 | User | User with delegated runs | Updates | Backed up; data converted; knows there is no downgrade | Supported Normal |
| SCN-004 | User | User with a remote or Docker node | Updates | Updates both | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: `N/A — not applicable`.

## Data Continuity And Acceptable Loss

- No new migration in this ticket. It publishes `20261019_delegated_copy_own_file_complete_v1`, verified in its own ticket and on the user's data in beta.4. REQ-004 communicates it.

## Supplemental Artifacts

| Artifact | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `release-notes.md` (this folder) | Curated v1.5.7 notes | REQ-003..REQ-006; AC-004, AC-005 | SR-001 | Approved within the direction (user informed) |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which revision is released? | The user: "release the latest … whatever on the personal". Cut from the origin/personal tip at cut time; this includes autobyteus-190 (MCP Bulk Import), which is in the notes | User | Decided |
| DEC-002 | Support pointer | Same as v1.5.6 (the user's DEC-002 then): GitHub Issues | Solution Designer (precedent) | Decided |
| DEC-003 | Open items the Task asked to raise (the user's Docker node at localhost:8001; his check of the sudden-shutdown restore fix after a backup; anything else to check) | Informational; the release does not depend on them. Asked in the conversation; any answer is recorded without holding the release | Solution Designer | Decided |

## Readiness Check

- Content ready: `Yes`
- Approval recorded: `Yes` (within the direction, user informed)
- Ready for design: `Yes`
