# Requirements

- Status: `Design-ready`
- Ticket: `release-notes-workflow`
- Last Updated: `2026-03-10`

## Goal / Problem Statement

Current GitHub release notes for the desktop app are difficult to read because they rely on auto-generated change lists instead of short user-facing functional summaries. The release workflow should produce consistent, readable app release notes that describe only meaningful user-visible changes.

## In-Scope Use Cases

- `UC-001`: The software-engineering workflow requires a short functional `release-notes.md` artifact before final release.
- `UC-002`: The repo release script copies the approved release notes into a stable committed path before tagging a release.
- `UC-003`: GitHub release workflows publish the curated release notes body instead of raw auto-generated notes.
- `UC-004`: Repo documentation explains how release notes are authored and consumed during release finalization.

## Out of Scope

- Upgrade-step instructions for end users.
- Detailed internal engineering changelogs in the GitHub Release body.
- Server Docker publish summaries that do not create a GitHub Release body.

## Requirements

- `R-001`: The workflow skill must require a short, user-facing release-notes artifact for app releases.
- `R-002`: The workflow skill must provide a concrete release-notes template optimized for functional changes only.
- `R-003`: The repository release flow must publish curated release notes from a committed file in the tagged revision.
- `R-004`: Desktop and messaging-gateway GitHub release workflows must use the same curated release note body so concurrent asset-publish jobs do not overwrite the release body with different content.
- `R-005`: Release documentation must explain the authoring path and the release command usage for release notes.
- `R-006`: Manual republish of older tags must remain safe when the curated release-notes file is absent in the tagged revision.

## Acceptance Criteria

- `AC-001`: The workflow skill instructs Stage 10 to create/update `release-notes.md` with a short functional template.
- `AC-002`: Running the release helper with release notes stages the stable release-notes file into the release commit before the tag is created.
- `AC-003`: The desktop GitHub release workflow uses the committed curated release-notes file as the published release body.
- `AC-004`: The messaging-gateway GitHub release workflow uses the same committed curated release-notes file as the published release body.
- `AC-005`: Repository documentation describes the new release-note requirement and release command usage.
- `AC-006`: When a tagged revision predates the curated release-notes file, release workflows fall back to generated notes instead of failing on a missing body file.

## Constraints / Dependencies

- The current repository uses tag-triggered GitHub release workflows and `scripts/desktop-release.sh` as the release helper.
- The current workspace has unrelated user changes in a different worktree, so implementation must stay isolated in this dedicated worktree.

## Assumptions

- One user-verified ticket typically maps to one release-worthy change set.
- A concise user-facing release note is preferred over auto-generated commit/PR lists.

## Open Questions / Risks

- `--release-notes` should likely be mandatory for new releases to avoid ambiguous note-source selection.
- Historical manual republish paths need a workflow fallback when older tags do not contain the curated release-notes file.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-001` -> `UC-001`
- `R-002` -> `UC-001`
- `R-003` -> `UC-002`
- `R-004` -> `UC-002`
- `R-005` -> `UC-001`, `UC-002`
- `R-006` -> `UC-003`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario placeholder)

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-003`
- `AC-004` -> `AV-004`
- `AC-005` -> `AV-005`
- `AC-006` -> `AV-006`

## Scope Triage

- Confirmed classification: `Small`
- Rationale: the implementation stays within workflow instructions, release helper scripting, GitHub release publishing configuration, and repo docs.
