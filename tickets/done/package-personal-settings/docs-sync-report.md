# Docs Sync Report — package-personal-settings (stage 1)

## Scope

- Ticket: `package-personal-settings`, Project Task `autobyteus-95`, stage 1 (UC-001..005). Stage 2 (UC-006, clean writes) was dropped by the user (DEC-010).
- Classification: `task_size=Large`, `architectural_risk=High`
- Route: reviewed. Architecture review ARCH-REV-002, code review CRR-001, API/E2E API-REV-001, test-code review CRR-002.
- Trigger: delivery DR-001 after the test-code review pass CRR-002
- Bootstrap base reference: `origin/personal` `a85bf4f38d`
- Integrated base reference used for docs sync: `origin/personal` `51ec39d86c`, merged into the ticket branch as `5a62a061b4`
- Post-integration verification reference: `evidence/delivery/DEL-01..10` (`handoff-summary.md`, Integration)

## Why Docs Were Updated

- Summary: stage 1 moves the user's four personal settings out of the package files and into AutoByteus. The four are tools, skills, avatar and default runtime/model, for package agents, Teams and Orgs and for built-in definitions.
  - They are stored in `<app-data>/agent-packages/personal-settings.json` and applied on top of the package.
  - A GitHub package update first captures edits made in the package files into personal settings and backs the changed files up to `backups/`. It then replaces the install.
  - The implementation updated the long-lived docs, and code review found them consistent. Delivery re-read them on the integrated state; they still match it.
  - Delivery made no edit. The one auto-merged doc, `GLOSSARY.md`, kept both the base's node-files entries and this ticket's personal-setting entries.
- Why this should live in long-lived project docs:
  - which edits are personal and which change the package is a product rule every editor and update path follows;
  - the file contract, capture and backup rules govern the user's data.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `GLOSSARY.md` | Package definition, personal setting, effective value, "Reset to the package's setting" | Updated (by implementation) | Auto-merged with the base's node-files entries; both kept |
| `autobyteus-server-ts/docs/modules/personal_settings.md` (new) and `README.md` index | Contract, storage, effective values, update capture, backups, unreadable-file rule | Updated (by implementation) | — |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Update now captures and backs up before replacing | Updated (by implementation) | — |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Effective definitions read through personal settings | Updated (by implementation) | — |
| `autobyteus-web/docs/agent_management.md`, `agent_teams.md`, `agent_orgs.md` | Personal marks, Reset, personal-only saves | Updated (by implementation) | — |
| `DESIGN.md` | Project design document (docs-sync rule) | No change | It holds general design rules and cases. This ticket adds a module rule, documented in `personal_settings.md`, not a project-wide design rule. Design cases are the Solution Designer's |
| `TESTING.md` | Project testing guideline | No change | The new gated suite uses the existing scripted AGY setup (`RUN_AGY_FAILURE_E2E`, `agy-failure-cli.mjs`, `LIST_TOOLS` from autobyteus-261) as described. The ungated suite follows the existing E2E rules. No report recorded a command that no longer works |
| `RELEASE.md` | Project release guide | No change | Its steps were used unchanged for this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none in delivery) | — | — | The implementation's doc changes describe the final integrated behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Personal settings | Four settings live in `personal-settings.json`, keyed by definition; effective value = package value + personal changes; reset removes the field | `personal-settings-file-contract.md`, `design-spec.md` | `personal_settings.md`, `GLOSSARY.md` |
| Update capture and backup | Before a GitHub update replaces the install, edits in package files are captured into personal settings and the changed files are copied to `backups/<install key>/<time>/` (latest 5 kept). If the installed revision cannot be downloaded, the update stops and nothing changes | REQ-006, DEC-008, AC-003/004 | `personal_settings.md`, `agent_packages.md` |
| Unreadable file | An unreadable or wrongly shaped file gives package values and a warning. The file is kept, and the next save sets it aside as `.unreadable-<time>` | REQ-001, AC-007 | `personal_settings.md` |
| Runs | Agent, Team, Org runs and delegated copies use effective tools, and a running agent picks up a change without a restart | REQ-002, AC-006 | `personal_settings.md`, `agent_definition.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Personal edits written into the package's files (agent/team/org config) | Personal settings in app data, applied on top | `personal_settings.md`, `agent_management.md` |
| Update replaces the whole install, losing personal edits | Capture + backup, then replace | `agent_packages.md` |

## No-Impact Decision

- Not applicable. The docs were changed by the implementation, and they are verified here.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization, the beta and the user's check (Task done-when); all done (DR-001)
- Notes: the code reviewer recorded that the design spec's Derived Consumers row calls `listAdmissionEntries` "not affected". The code applies personal settings there, as REQ-002 requires. That is the Solution Designer's design document, so it was not edited here. Follow-ups FU-002 and FU-003 are recorded in `follow-ups.md`.
