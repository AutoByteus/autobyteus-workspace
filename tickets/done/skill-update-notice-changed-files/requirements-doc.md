# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `skill-update-notice-changed-files`
- Request / ticket: Project Task `autobyteus-136` (2026-10-17)
- Requested by: `/project_task_manager` (on behalf of the user's feedback)
- Requirements owner: Solution Designer
- Date: 2026-10-17
- Approved by and reference: `Solution Designer within the direction (user informed)`. The Task's direction and the user's wording settle the visible behavior; there are no `Needs user` decisions. The user was informed on 2026-10-17 (SR-001 message).
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: None

## Problem And Desired Outcome

- **Problem:** The skill-update notice shows the skill's `SKILL.md` path as the skill label, lists the changed files inline after a colon, and closes with "Re-read the updated SKILL.md". When only reference files changed, the user and the agent both read it as "SKILL.md changed".
- **Desired outcome:** The notice says plainly which skill package was updated (folder shown once) and lists exactly the changed files, one per line, each marked changed, added or removed. It closes with "re-read the updated files before continuing work that relies on this skill". Placement, one-notice-per-change, the platform-notice marking and all runtimes stay as they are.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001–004 | The notice labels the skill by its `SKILL.md` path, lists files inline, says "Re-read the updated SKILL.md" | One block per skill: a sentence naming the package with its folder, a one-per-line list of exact changed files with status, and a matching closing line | Header `[Platform notice — skill updated]` unchanged | Notes BEH-001 |
| BEH-002 | Contract | SCN-001 | One notice per run per change, platform notice, all runtimes, "Skill updated" card | Unchanged | All of it | Notes BEH-002 |

## Stakeholders, Actors, And Outcomes

| Actor | Required Outcome |
| --- | --- |
| User | Sees at a glance which files of which skill changed |
| Running agent | Knows exactly which files to re-read |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The notice for one updated skill lists its exact changed files with status | SCN-001, SCN-002 |
| UC-002 | A notice covering several skills and/or a removed skill reads as one block per skill | SCN-003 |
| UC-003 | A very large update stays readable | SCN-004 |

### Out Of Scope

- Detection, batching, delivery paths and timing.
- The web card design (it already renders the content as Markdown with the "Skill updated" label).
- Diffs of file contents.

### Non-Goals

- Re-wording historical notices already stored in run history.

### Preserved Behavior Boundary

BEH-002; the header string; delivery on every runtime; one notice per run per change.

### Review Authority

Standard: blocking findings must cite an approved ID. New behavior is a Requirement Gap.

## Requirements

| REQ | Requirement | Behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | For each updated skill the notice MUST contain one sentence naming the skill package and showing its folder path once, e.g. ``Your skill package `agent-package-creation` has been updated (/…/skills/agent-package-creation).`` | BEH-001 | High | Task direction |
| REQ-002 | Below that sentence, the notice MUST list the skill's changed files one per line, as paths relative to the skill folder, each marked `(changed)`, `(added)` or `(removed)`. `SKILL.md` appears only if it changed, like any other file. | BEH-001 | Critical | User request |
| REQ-003 | The closing line MUST read "Re-read the updated files before continuing work that relies on this skill." (or "…these skills." when several skills are updated). It MUST NOT single out `SKILL.md`. When a listed file was removed, the notice MUST also say that removed files are no longer available. | BEH-001 | High | User wording |
| REQ-004 | A skill that is no longer available MUST get its own block: ``Your skill package `x` is no longer available.`` | BEH-001 | Medium | Consistency (DEC-003) |
| REQ-005 | Several skills in one notice MUST appear as one block per skill, in the order the change list gives (by skill name). Each skill MUST list at most 10 files, followed by "- …and N more files" when longer. | BEH-001 | Medium | Task direction |
| REQ-006 | The first line MUST remain exactly `[Platform notice — skill updated]`. The text MUST render as readable Markdown in the chat card (blank lines between paragraphs, lists and blocks). | BEH-002 | Critical | Web label and history detection |
| REQ-007 | One notice per run per change, platform-notice marking, delivery on every runtime and the busy/idle paths MUST be unchanged. | BEH-002 | Critical | Task |

## Acceptance Criteria

| AC | REQ | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001–003, REQ-006 | SCN-001 | Only `references/a.md` and `references/b.md` of skill `x` change | The notice has the header, ``Your skill package `x` has been updated (<folder>).``, "Changed files:" with `- references/a.md (changed)` and `- references/b.md (changed)`, then "Re-read the updated files before continuing work that relies on this skill." It contains no "SKILL.md". | Unit test on the builder; integration test through the service |
| AC-002 | REQ-002 | SCN-002 | `SKILL.md` edited, `references/new.md` added, `scripts/old.sh` deleted | Lists `SKILL.md (changed)`, `references/new.md (added)`, `scripts/old.sh (removed)` (`SKILL.md` first), plus the removed-files sentence | Unit and integration tests |
| AC-003 | REQ-004, REQ-005 | SCN-003 | Skill `x` updated and skill `y` removed in one change | Two blocks; the closing line covers updated skills; `y` says "no longer available" | Unit test |
| AC-004 | REQ-005 | SCN-004 | 25 files change in one skill | 10 listed, then "- …and 15 more files" | Unit test |
| AC-005 | REQ-006, REQ-007 | SCN-001 | Real app: edit a reference file of a skill used by a running agent | The "Skill updated" card shows the new layout as rendered Markdown; one notice; the agent re-reads the listed files | Isolated desktop check; user verification |

## Relevant Scenarios And Journeys

| Scenario | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | System/User | Reference files of a used skill change (the Agent Package Creator's PR merged) | The notice lists exactly those files | Supported Normal | Screenshot |
| SCN-002 | System | `SKILL.md` and other files change, are added or removed | Every file listed with its status | Supported Normal | Task |
| SCN-003 | System | Several skills change, or one is removed, in one batch | One block per skill | Supported Normal | Task |
| SCN-004 | Operational | A large merge | Capped list with a count | Supported Normal | Task |

## UI, Interaction, And Experience Requirements

- Applicable: Yes. The text is rendered by the existing card; there is no component change.
- Normative layout (example; illustrative content):

```
[Platform notice — skill updated]

Your skill package `agent-package-creation` has been updated (/…/skills/agent-package-creation).

Changed files:
- references/package-anti-patterns.md (changed)
- references/result-and-handoff-contract.md (changed)

Re-read the updated files before continuing work that relies on this skill.
```

- Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

None beyond REQ-006 (Markdown readability).

## Data Continuity And Acceptable Loss

Persisted data: No. Historical notices keep their old wording.

## External Contracts And Dependencies

The web label detection relies on the header string (REQ-006).

## Supplemental Artifacts

None (the screenshot is external evidence).

## Assumptions

- ASM-001: agents resolve relative file paths against the shown folder. A clear "(folder)" sentence makes that explicit.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Show the folder or the `SKILL.md` path? | The user's confusion came from the `SKILL.md` link. The folder is the package; files are relative to it. **Folder, once.** | Solution Designer | Decided |
| DEC-002 | Per-file status words | The diff already knows the status. "(changed)/(added)/(removed)" are short and unambiguous for people and LLMs. | Solution Designer | Decided |
| DEC-003 | Removed skill wording | Consistent with the new per-skill sentence: ``Your skill package `x` is no longer available.`` | Solution Designer | Decided |
| DEC-004 | Cap | Keep the existing 10-file cap (tested, readable). The count line is "…and N more files". | Solution Designer | Decided |
| DEC-005 | Header | Keep it byte-identical: the web label and history detection depend on it, and the user likes the placement. | Solution Designer | Decided |

## Traceability

REQ-001→AC-001; REQ-002→AC-001, AC-002; REQ-003→AC-001, AC-002; REQ-004→AC-003; REQ-005→AC-003, AC-004; REQ-006→AC-001, AC-005; REQ-007→AC-005.

## Architecture Phase Input

- Owners: the builder, diff and type in `src/skill-update-notices/`.
- Constraints: the header string; no delivery changes.

## Readiness Check

- Content ready: Yes.
- Approved (within the direction; user informed 2026-10-17): Yes.
- Ready for design: Yes.
