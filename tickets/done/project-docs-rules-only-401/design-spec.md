# Design Spec — autobyteus-401 (project documents hold rules only)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (the user confirmed the plan, 2026-11-06, and added REQ-005)
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-docs-rules-only-401/tickets/in-progress/project-docs-rules-only-401/investigation-notes.md`
- Authorities read (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, the updated `references/project-documents.md`, `DESIGN.md` (repository root).
- Conflicts or discrepancies: None.

## Current-State Read

See the investigation notes (F-01..F-08). RELEASE.md L341-413 holds three release stories, and L125-127, L135-137, L168-169 and L325-327 carry incident detail inside rules. DESIGN.md rule 12 (L145-150) links to the section. TESTING.md is clean.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. Documentation only: RELEASE.md, three appended record sections, one DESIGN.md paragraph.
- Architectural risk: `Low`. No code, contract or data.
- Escalation trigger: a story whose rule is not yet stated anywhere. Then the rule is missing, and its owner (delivery for RELEASE.md) must write it. Report it; do not invent it.

## Intended Change

Move each release story to its record. Rules keep their meaning and reasons, plus one-line pointers to the records where they help.

## Change Scope (Mandatory)

- In scope: UC-001. Files:
  - `RELEASE.md`;
  - `DESIGN.md` (rule 12 example line);
  - append-only: `tickets/done/test-and-tooling-hygiene-294/release-deployment-report.md`, `tickets/done/release-beta-20261102/release-deployment-report.md`, `tickets/done/beta-release-v1.5.12-beta.2/release-deployment-report.md`.
- Derived consumers: links into RELEASE.md anchors (`#recovery`, `#watching-the-rollout`, `#build-only-release-run`, `#secret-gate`, `TESTING.md#fresh-start-build`). Implementation checks every RELEASE.md link and the links to RELEASE.md from DESIGN.md, TESTING.md, AGENTS.md and `docs/`.
- Deliberately left alone:
  - TESTING.md (F-07);
  - DESIGN.md design cases and `docs/design-cases.md`;
  - the Workflow Reference's version-format examples (`v1.1.8`, `v1.2.7-rc1`, `v1.2.7-beta.1`): these explain the tag format, not a story.
- Follow-ups: None.

## The Edits

| ID | Where | New text (meaning kept; wording is implementation's) |
| --- | --- | --- |
| E-1 | `RELEASE.md` § Case Studies (L341-413) | Removed. The text goes to the records below |
| E-2 | `RELEASE.md` L325-327 (Recovery) | "An escape is fixed at the earliest stage that can reproduce it, in that stage's document, whoever owns it, not at the stage that noticed it: a check added where a problem was noticed catches it late and slowly." Plus one pointer line: "Example: the per-tag build-only run, removed on the user's decision (`tickets/done/beta-release-v1.5.12-beta.2/release-deployment-report.md`)." |
| E-3 | `RELEASE.md` L125-127 | "A `:` in a file name breaks a Windows checkout, and ticket evidence is the usual source (logs named after a script, such as `web-audit:localization-literals.log`). Name evidence files with `-` instead of `:`." No version |
| E-4 | `RELEASE.md` L135-137 | "No other check before tagging starts a run, so a change that stops new runs from starting would otherwise ship unnoticed." No version |
| E-5 | `RELEASE.md` L168-169 | "(the user's decision)", without the date. Plus one pointer line to the beta.2 record, where the change and its reasons are recorded |
| E-6 | `RELEASE.md` Watching The Rollout (≈L276) | One pointer line to the beta.14 record (`tickets/done/test-and-tooling-hygiene-294/release-deployment-report.md`), where watching runs one after another let a partial release go unseen |
| E-7 | `DESIGN.md` L145-150 | One line: "Two releases failed this way: `v1.5.9-beta.14` and `v1.5.11-beta.11` (records: `tickets/done/test-and-tooling-hygiene-294/release-deployment-report.md`, `tickets/done/release-beta-20261102/release-deployment-report.md`)." |
| E-8 | The three records | Append `## Release story moved from RELEASE.md (autobyteus-401, 2026-11-06)` with the case's full text from RELEASE.md, unchanged in substance; links that pointed into RELEASE.md become `../../../RELEASE.md#…`. Nothing already in the record is edited |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `No` (document placement only)
- Structural triggers: none fire (no code). Vocabulary drift: none (no rule renamed).
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`

## Legacy Removal Policy (Mandatory)

- Obsolete: RELEASE.md § Case Studies (moved, not lost).
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory / Spines

N/A: documentation only. No runtime path.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| RELEASE.md § Case Studies | Stories belong in the records (the user's rule, project-documents.md) | The records (E-8) and one-line pointers (E-2, E-5, E-6) | Every rule they taught already stands (investigation table) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep a stub `## Case Studies` that lists the records | Old links | Rejected: no links remain after E-2 and E-7 | Pointer lines at the rules |

## Change / Refactor Sequence

1. E-8 first: append the stories to the records (copy, then verify the diff covers the section).
2. E-1 to E-6 in RELEASE.md; E-7 in DESIGN.md.
3. Run `git grep -n "Case Studies"` (AC-004), check each pointer path exists (AC-005), and check RELEASE.md's anchor links.
4. Commit docs only (`docs(release): …` and `docs(design): …`); stage paths explicitly.

## Risks

None material. A reviewer of RELEASE.md (delivery, its owner) sees the meaning unchanged at docs sync.

## Guidance For Implementation

- Reproduction to start from: `None`.
- Do not change any rule's meaning. If a sentence can't be rewritten without changing it, keep it and report it.
