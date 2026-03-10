# API/E2E Testing

## Testing Scope

- Ticket: `release-notes-workflow`
- Scope classification: `Small`
- Workflow state source: `tickets/done/release-notes-workflow/workflow-state.md`
- Requirements source: `tickets/done/release-notes-workflow/requirements.md`
- Call stack source: `tickets/done/release-notes-workflow/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001, R-002 | Skill requires and templates functional release notes | AV-001 | Passed | 2026-03-10 |
| AC-002 | R-003 | Release helper stages stable release-notes file before tag | AV-002 | Passed | 2026-03-10 |
| AC-003 | R-003, R-004 | Desktop workflow publishes curated body when file exists | AV-003 | Passed | 2026-03-10 |
| AC-004 | R-004 | Messaging workflow uses the same curated body source | AV-004 | Passed | 2026-03-10 |
| AC-005 | R-005 | Repo docs explain release-note authoring and command usage | AV-005 | Passed | 2026-03-10 |
| AC-006 | R-006 | Historical tags fall back to generated notes when file is absent | AV-006 | Passed | 2026-03-10 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001, R-002 | UC-001 | E2E | Skill handoff path must require curated release notes | Skill text plus new template reference are present | `rg -n "release-notes" /Users/normy/.codex/skills/software-engineering-workflow-skill/SKILL.md /Users/normy/.codex/skills/software-engineering-workflow-skill/assets/release-notes-template.md` | Passed |
| AV-002 | Requirement | AC-002 | R-003 | UC-002 | E2E | Release helper must accept and stage curated notes | Script requires `--release-notes` and syncs `.github/release-notes/release-notes.md` | `bash -n scripts/desktop-release.sh` plus file inspection | Passed |
| AV-003 | Requirement | AC-003 | R-003, R-004 | UC-002 | E2E | Desktop workflow should publish curated body when present | YAML parses and includes curated notes branch with `body_path` | `python3` YAML parse plus workflow inspection | Passed |
| AV-004 | Requirement | AC-004 | R-004 | UC-002 | E2E | Messaging workflow should publish the same curated body source | YAML parses and includes checkout plus curated notes branch with `body_path` | `python3` YAML parse plus workflow inspection | Passed |
| AV-005 | Requirement | AC-005 | R-005 | UC-001, UC-002 | E2E | Release docs explain ticket note authoring and release command usage | README documents the new authoring path and command | `sed -n '81,145p' README.md` | Passed |
| AV-006 | Design-Risk | AC-006 | R-006 | UC-003 | E2E | Historical manual republish must remain safe | Both workflows keep generated-notes fallback branch when curated file is absent | workflow inspection | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None | None | None | No | N/A | N/A | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): no live tag push / GitHub release publish was executed in-session
- Compensating automated evidence:
  - `bash -n scripts/desktop-release.sh`
  - `python3` YAML parse for `.github/workflows/release-desktop.yml`
  - `python3` YAML parse for `.github/workflows/release-messaging-gateway.yml`
- Residual risk notes:
  - live GitHub Release publication was not executed in this session
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Validation was configuration-driven rather than a live release publish because no tag push was executed in this session.
