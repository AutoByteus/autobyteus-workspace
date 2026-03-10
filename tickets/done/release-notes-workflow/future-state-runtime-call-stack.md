# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/release-notes-workflow/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/release-notes-workflow/implementation-plan.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002, R-005 | N/A | Author ticket-scoped user-facing release notes | Yes/N/A/Yes |
| UC-002 | Requirement | R-003, R-004, R-005 | N/A | Publish one curated GitHub release body from the tagged commit | Yes/N/A/Yes |
| UC-003 | Design-Risk | R-006 | Historical-tag republish safety | Fall back to generated notes when the curated file is absent in an older tag | Yes/N/A/Yes |

## Transition Notes

- The repository transitions from auto-generated GitHub release notes to a committed curated body file for new releases.
- Historical tags that predate the new body file keep working through workflow fallback logic.

## Use Case: UC-001 [Author ticket-scoped user-facing release notes]

### Goal

Produce a concise functional `release-notes.md` during Stage 10 handoff so release finalization has approved user-facing text.

### Preconditions

- Ticket has completed technical workflow through Stage 9.
- User-facing release notes are required for the release path.

### Expected Outcome

- Ticket folder contains a short functional `release-notes.md` that can be promoted into the repo release body file.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md:Stage10HandoffRules
├── tickets/in-progress/<ticket>/handoff-summary.md:updateSummary()
├── tickets/in-progress/<ticket>/release-notes.md:writeFunctionalTemplate() [IO]
└── tickets/in-progress/<ticket>/workflow-state.md:recordStage10Evidence() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if the release is not user-facing or no GitHub release body is published
/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md:Stage10HandoffRules
└── tickets/in-progress/<ticket>/handoff-summary.md:recordReleaseNotesNotRequiredRationale() [IO]
```

### State And Data Transformations

- Delivered ticket scope -> user-visible change bullets
- User-visible bullets -> ticket-local `release-notes.md`

### Observability And Debug Points

- Evidence logged in `workflow-state.md`
- Release-note artifact path recorded in handoff summary

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Publish one curated GitHub release body from the tagged commit]

### Goal

Publish the same curated release-note body for all GitHub release workflows that share the tag.

### Preconditions

- `scripts/desktop-release.sh release` is invoked with `--release-notes <path>`.
- The notes file exists and passes validation.

### Expected Outcome

- The release commit contains `.github/release-notes/release-notes.md`.
- Desktop and messaging-gateway release workflows publish the same release body from that path.

### Primary Runtime Call Stack

```text
[ENTRY] scripts/desktop-release.sh:run_release(version, --release-notes path)
├── scripts/desktop-release.sh:validate_release_notes_file(path)
├── scripts/desktop-release.sh:sync_release_notes_body(path -> .github/release-notes/release-notes.md) [IO]
├── scripts/desktop-release.sh:git_add_release_metadata() [IO]
├── scripts/desktop-release.sh:git_commit_release_prep() [IO]
├── scripts/desktop-release.sh:git_tag_release() [IO]
└── .github/workflows/release-desktop.yml:publish-release [ASYNC]
    ├── actions/checkout@v4:checkoutTaggedCommit() [IO]
    ├── resolve-release-body:detectCommittedNotesFile()
    └── softprops/action-gh-release@v2:publishWithBodyPath() [IO]
        └── .github/workflows/release-messaging-gateway.yml:publish-release [ASYNC]
            ├── actions/checkout@v4:checkoutTaggedCommit() [IO]
            ├── resolve-release-body:detectCommittedNotesFile()
            └── softprops/action-gh-release@v2:publishWithBodyPath() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if --release-notes is missing or invalid for a new release
scripts/desktop-release.sh:run_release(...)
└── scripts/desktop-release.sh:exitWithUsageError()
```

```text
[ERROR] if a release workflow cannot find the curated file in a tagged commit that should have it
.github/workflows/release-*.yml:resolve-release-body
└── softprops/action-gh-release@v2:publishWithGeneratedNotesFallback() [IO]
```

### State And Data Transformations

- Ticket-local release notes -> stable repo release body file
- Stable repo release body file -> GitHub Release body

### Observability And Debug Points

- Release helper prints copy/validation status
- GitHub workflow summary records whether curated notes or fallback mode was used

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Fall back to generated notes when the curated file is absent in an older tag]

### Goal

Preserve manual republish for historical tags that do not contain the curated release-notes file.

### Preconditions

- Workflow is running for an older tag/ref created before the repo carried `.github/release-notes/release-notes.md`.

### Expected Outcome

- Workflow publishes generated GitHub release notes instead of failing on a missing body file.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/release-desktop.yml:publish-release [ASYNC]
├── actions/checkout@v4:checkoutTaggedCommit() [IO]
├── resolve-release-body:detectMissingCuratedNotesFile()
└── softprops/action-gh-release@v2:publishWithGeneratedNotesFallback() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if both curated file is absent and fallback branch is removed
.github/workflows/release-*.yml:publish-release
└── workflow job failure
```

### State And Data Transformations

- Missing repo file signal -> workflow publish mode selection

### Observability And Debug Points

- Workflow step summary logs fallback mode

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
