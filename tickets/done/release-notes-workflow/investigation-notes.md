# Investigation Notes

- Ticket: `release-notes-workflow`
- Date: `2026-03-10`
- Scope triage candidate: `Small`

## Investigated Surfaces

- Workflow skill: `/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md`
- Desktop release helper: `scripts/desktop-release.sh`
- Release workflows:
  - `.github/workflows/release-desktop.yml`
  - `.github/workflows/release-messaging-gateway.yml`
  - `.github/workflows/release-server-docker.yml`
- Repo release docs: `README.md`

## Current-State Findings

1. The workflow skill requires Stage 10 handoff plus release finalization, but it does not require a dedicated release-notes artifact.
2. The desktop GitHub release workflow publishes release assets with `generate_release_notes: true`.
3. The messaging-gateway GitHub release workflow also publishes assets to the same GitHub release tag with `generate_release_notes: true`.
4. The server Docker release workflow pushes Docker images only; it does not create a GitHub release body.
5. The release helper script bumps the version, syncs the messaging release manifest, commits, tags, and pushes, but it has no release-notes input or publication step.
6. Because desktop and messaging-gateway publish to the same GitHub release tag, they must use the same release body source or one workflow can overwrite the other with inconsistent text.

## Problem Framing

- Auto-generated GitHub release notes are too noisy for the Electron app’s user audience.
- The desired release note is short, functional, and user-facing only.
- The workflow should produce release notes as part of the ticket handoff so the release commit/tag can publish them deterministically.

## Design Constraints

- No source-code edits can start until the Stage 5 gate is satisfied.
- The release body file must exist in the tagged commit if GitHub Actions should publish it using `body_path`.
- Older tags may not contain the new release-notes file, so workflow fallback behavior should remain safe for manual republish of historical tags.

## Options Considered

### Option A: Keep GitHub auto-generated notes and ask humans to edit after publish

- Rejected.
- Reason: it leaves readability to a post-release manual step and does not make the workflow deterministic.

### Option B: Store per-ticket release notes only and manually paste into GitHub Release

- Rejected.
- Reason: it improves authoring but still relies on manual publication and does not integrate with the tag-driven release flow.

### Option C: Write ticket-level release notes, copy them into a stable committed repo path before tagging, and publish that file from GitHub Actions

- Selected.
- Reason: it matches the existing release flow, keeps release-note authorship inside the workflow, and ensures both GitHub release workflows publish the same curated body.

## Selected Direction

- Skill:
  - Add a Stage 10 requirement for a concise user-facing `release-notes.md` artifact when a ticket leads to a user-facing app/GitHub release.
  - Add a reusable functional release-notes template and writing rules.
- Repo:
  - Extend `scripts/desktop-release.sh release` with a required `--release-notes <path>` option.
  - Copy the provided notes into a stable committed path such as `.github/release-notes/release-notes.md` before the release commit/tag is created.
  - Update desktop and messaging-gateway publish workflows to use that committed file as the release body when present, with fallback to generated notes only for legacy tags without the file.
  - Update repo release docs with the new authoring/publish path.

## Scope Triage

- Confirmed classification: `Small`
- Rationale: the change is localized to workflow instructions, release helper scripting, GitHub workflow publish steps, and repo documentation. No runtime product code or schema changes are required.
