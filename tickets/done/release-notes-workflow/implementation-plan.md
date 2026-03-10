# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: localized workflow/documentation/release automation change with no product runtime or API surface redesign.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> finalize implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync -> final handoff -> wait for explicit user verification -> move ticket to `done` -> git finalization/release when git repo

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/release-notes-workflow/workflow-state.md`
- Investigation notes: `tickets/done/release-notes-workflow/investigation-notes.md`
- Requirements: `tickets/done/release-notes-workflow/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/release-notes-workflow/future-state-runtime-call-stack.md`
- Runtime review: `tickets/done/release-notes-workflow/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 review gate reaches `Go Confirmed` with no blockers; code edits can begin once `workflow-state.md` is updated to Stage 6.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` Author ticket-scoped functional release notes before final release.
  - `UC-002` Publish one curated GitHub release body for all workflows sharing the same tag.
  - `UC-003` Preserve manual republish safety for historical tags that predate the curated notes file.
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001`, `R-002` -> `UC-001`
  - `R-003`, `R-004` -> `UC-002`
  - `R-005` -> `UC-001`, `UC-002`
  - `R-006` -> `UC-003`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-003`: avoid breaking manual republish for older tags that do not contain the new release-notes file.
- Target Architecture Shape (for `Small`, mandatory):
  - skill-level Stage 10 guidance produces a ticket-local `release-notes.md`;
  - release helper validates/copies that file into `.github/release-notes/release-notes.md` before commit/tag;
  - GitHub release workflows publish `body_path: .github/release-notes/release-notes.md` when present, otherwise fall back to generated notes for legacy tags.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - none; only a stable repo file path for release body publication.
- Touched Files/Modules:
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md`
  - `scripts/desktop-release.sh`
  - `.github/workflows/release-desktop.yml`
  - `.github/workflows/release-messaging-gateway.yml`
  - `README.md`
  - `.github/release-notes/template.md`
- API/Behavior Delta:
  - release helper gains `--release-notes <path>` for `release`
  - release workflows publish curated notes from committed file when available
  - workflow skill requires ticket-level release-notes authoring for user-facing releases
- Key Assumptions:
  - release finalization is tied to ticket completion closely enough that one ticket can supply the user-facing release note
  - the same GitHub release tag is shared by desktop and messaging-gateway publish jobs
- Known Risks:
  - missing or malformed release notes could block release preparation unless validated clearly
  - historical manual republish needs a compatibility fallback

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md` | investigation + requirements | establishes the new Stage 10 artifact and template rules first |
| 2 | `scripts/desktop-release.sh` | skill direction | release helper must stage the curated notes file before tag creation |
| 3 | `.github/workflows/release-desktop.yml` | release helper stable file path | publish curated release notes for desktop artifacts |
| 4 | `.github/workflows/release-messaging-gateway.yml` | release helper stable file path | ensure the same release body is preserved when gateway assets publish |
| 5 | `README.md` | final behavior | document the required notes authoring and release command usage |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| workflow instructions | `/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md` | same | global workflow guidance | Keep | skill text updated coherently |
| release helper | `scripts/desktop-release.sh` | same | repo release orchestration | Keep | script parses and validates new flag |
| release body source | none | `.github/release-notes/release-notes.md` | repo release metadata | Keep | file exists in tagged commit after release prep |
| desktop release workflow | `.github/workflows/release-desktop.yml` | same | GitHub release publication | Keep | uses curated body when present |
| messaging release workflow | `.github/workflows/release-messaging-gateway.yml` | same | GitHub release publication | Keep | uses same curated body when present |
| release docs | `README.md` | same | operator documentation | Keep | release-note path documented |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | Solution Sketch | UC-001 | TASK-001 | Script/docs inspection | AV-001 |
| R-002 | AC-001 | Solution Sketch | UC-001 | TASK-001 | Skill text inspection | AV-001 |
| R-003 | AC-002, AC-003 | Solution Sketch | UC-002 | TASK-002 | Script + workflow inspection | AV-002 |
| R-004 | AC-003, AC-004 | Solution Sketch | UC-002 | TASK-003 | Workflow inspection | AV-002 |
| R-005 | AC-005 | Solution Sketch | UC-001, UC-002 | TASK-004 | README inspection | AV-003 |
| R-006 | AC-006 | Solution Sketch | UC-003 | TASK-003 | Workflow inspection | AV-004 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001, R-002 | skill requires and templates functional release notes | AV-001 | E2E | Planned |
| AC-002 | R-003 | release helper copies curated notes into stable repo path before tag | AV-002 | E2E | Planned |
| AC-003 | R-003, R-004 | desktop workflow publishes curated body from committed file | AV-003 | E2E | Planned |
| AC-004 | R-004 | messaging workflow uses the same curated body source | AV-004 | E2E | Planned |
| AC-005 | R-005 | README explains authoring and release command usage | AV-005 | E2E | Planned |
| AC-006 | R-006 | historical-tag fallback remains safe when curated file is absent | AV-006 | E2E | Planned |

## Step-By-Step Plan

1. Update the workflow skill to require a concise user-facing `release-notes.md` artifact for user-facing releases and add a reusable template.
2. Extend the release helper to require `--release-notes`, validate the input file, and copy it into `.github/release-notes/release-notes.md` before the release commit/tag.
3. Update both GitHub release workflows to publish the committed curated body when present and fall back to generated notes for older tags lacking the file.
4. Update repo release documentation to describe authoring and command usage.
5. Verify script syntax and workflow YAML after the edits.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `Legacy-tag workflow publish fallback only`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md` | Stage 10 artifact + template + publication guidance added | N/A | manual text inspection | skill-level only |
| `scripts/desktop-release.sh` | new flag parsed, file validated, stable file copied/staged | shell syntax check | dry-run invocation/inspection | no destructive release run |
| `.github/workflows/release-desktop.yml` | curated body step added with legacy fallback | YAML parse | workflow logic inspection | same tag body source as gateway |
| `.github/workflows/release-messaging-gateway.yml` | curated body step added with legacy fallback | YAML parse | workflow logic inspection | same body source as desktop |
| `README.md` | release note authoring/publish flow documented | N/A | doc inspection | keep concise |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/release-notes-workflow/code-review.md`
- Scope (source + tests): workflow skill, shell script, two GitHub workflows, README
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - no touched source file is expected to exceed the limit
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - inspect diff stats after edits and record explicit assessment if any file crosses the threshold
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - not expected
- module/file placement review approach (how wrong-folder placements will be detected and corrected):
  - restrict new repo file to `.github/release-notes/` and avoid scattering release-note publication logic elsewhere

## Test Strategy

- Unit tests:
  - shell syntax check for `scripts/desktop-release.sh`
- Integration tests:
  - inspect release workflow decision branches for curated-body vs generated fallback
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `6`
  - critical flows to validate (API/E2E):
    - release helper accepts ticket release notes and stages stable file
    - desktop workflow publishes curated body
    - messaging workflow uses same body source
    - historical-tag fallback remains safe
  - expected scenario count: `6`
  - known environment constraints:
    - no live GitHub release run in this session

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001, R-002 | UC-001 | E2E | Stage 10 skill instructions include release-notes artifact and template |
| AV-002 | Requirement | AC-002 | R-003 | UC-002 | E2E | release helper copies/stages stable release-notes file before tag |
| AV-003 | Requirement | AC-003 | R-003, R-004 | UC-002 | E2E | desktop workflow publishes `body_path` when release-notes file exists |
| AV-004 | Requirement | AC-004 | R-004 | UC-002 | E2E | messaging workflow publishes the same `body_path` when file exists |
| AV-005 | Requirement | AC-005 | R-005 | UC-001, UC-002 | E2E | README documents ticket release-note authoring and release command usage |
| AV-006 | Design-Risk | AC-006 | R-006 | UC-003 | E2E | workflows fall back to generated notes when historical tags lack curated file |
