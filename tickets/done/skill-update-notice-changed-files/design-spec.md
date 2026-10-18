# Design Spec — `skill-update-notice-changed-files`

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction; the user was informed on 2026-10-17.
- Supplements: None.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files/tickets/in-progress/skill-update-notice-changed-files/investigation-notes.md`
- Authorities read: `references/architecture-design.md` (2026-10-13, current content), `references/design-principles.md` (2026-10-10, current content), root `DESIGN.md`, `TESTING.md` (read in this conversation). `design-examples.md` not used.
- Project design-principle conflicts: None.

## Current-State Read

`diffSkillVersion` (`skill-version-diff.ts`) computes changed, added and removed files but returns one flat `changedFiles: string[]`. `buildSkillUpdateNoticeText` (`skill-update-notice-builder.ts`) renders each skill as `- name (skillMdPath): files` and closes with "Re-read the updated SKILL.md…". The service builds the text once per run (`skill-update-notice-service.ts:232`) for both delivery paths. The web card renders the content as Markdown and labels it by sender or header.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: three source files in one subsystem (`domain/skill-update-notice-types.ts`, `services/skill-version-diff.ts`, `services/skill-update-notice-builder.ts`), plus updated tests (one unit, one integration and one gated E2E assertion) and one doc.
- Architectural risk: `Low`
- Risk rationale: text and a local type only. There is no change to delivery, persistence (snapshots store digests, not text), contracts (the header and sender are unchanged; the GraphQL/websocket payload is the same string field), concurrency or ownership.
- Escalation trigger: any need to change delivery, the web segment component, the stored snapshot shape or the header string means a Design Impact.

## Architecture Investigation Evidence

See the source log in the investigation notes. The builder, diff and type are the only owners.

## Intended Change

Carry each file's status from the diff to the builder, and render one Markdown block per skill (REQ-001…006).

## Change Scope (Mandatory)

- **In scope:** UC-001…003.
  - `src/skill-update-notices/domain/skill-update-notice-types.ts`: `SkillChange` `updated` becomes `{ kind: "updated"; skillName; skillDir; skillMdPath; files: readonly { path: string; status: "changed" | "added" | "removed" }[] }`.
  - `src/skill-update-notices/services/skill-version-diff.ts`: emit the per-file status. Sort with `SKILL.md` first, then by path, unchanged. Use `current.skillDir`.
  - `src/skill-update-notices/services/skill-update-notice-builder.ts`: the new text (format below).
  - Tests: `tests/unit/skill-update-notices/skill-update-notice-parts.test.ts`, `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts`, and the `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` assertion if its phrase changes.
  - Docs: `autobyteus-server-ts/docs/modules/skill_update_notices.md` (the example).
- **Deliberately left alone:**
  - delivery (`skill-update-notice-service.ts` beyond consuming the type);
  - the watcher;
  - the seen-versions store;
  - the web segment (the header is unchanged; Markdown renders the new blocks);
  - the core preface metadata.
- **Follow-ups:** None.

## Notice Format (normative shape; REQ-001…006)

```
[Platform notice — skill updated]
                                                        ← blank line
Your skill package `<name>` has been updated (<skillDir>).
                                                        ← blank line
Changed files:
- <relative path> (changed|added|removed)               ← max 10, SKILL.md first
- …and <N> more files                                   ← only when more than 10
                                                        ← blank line between skill blocks
Your skill package `<name2>` is no longer available.    ← removed skill
                                                        ← blank line
Re-read the updated files before continuing work that relies on this skill.   ← "these skills" when more than one updated; only when any update
Removed files are no longer available.                  ← only when any file is removed
Do not rely on a skill that is no longer available.     ← only when any skill is removed (existing line, kept)
```

Rules:
- Blocks follow the order of `changes` (the service already orders by skill name).
- The header stays byte-identical.
- No `SKILL.md` path anywhere.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001–006; AC-001–004 | `diffSkillVersion` (status per file) → `buildSkillUpdateNoticeText` (blocks) → the existing delivery (unchanged) |
| BEH-002 | REQ-007; AC-005 | Unchanged |

## Relevant Supplemental Task Artifacts

None (the screenshot is evidence in the investigation notes).

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (wording).
- Current design issue found: `No`. The owners are correct; the diff discarded information the builder needs.
- Structural triggers considered: shared-structure looseness (`changedFiles` lost the status). Fixed by a tight per-file record. No other trigger fires.
- Root cause classification: `Shared Structure Looseness` (minor, local).
- Refactor needed now: `No` beyond the type tightening above.
- Deferrals: None.

## Legacy Removal Policy (Mandatory)

- Obsolete: `changedFiles: string[]` and the old phrases. Replaced in this change (clean cut; no compatibility field).
- Wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`. `seen_skill_versions.json` stores snapshots, and `SkillChange` is never persisted. Notices already in history keep their old text.

## Data-Flow Spine Inventory / Spines / Ownership

Unchanged from `active-run-skill-update-notice` (DS-002/DS-003). Only the content of the change record and its rendering change. The owners are `diffSkillVersion` (change content) and `buildSkillUpdateNoticeText` (wording).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `SkillChange.changedFiles: string[]` | Loses per-file status | `files: {path, status}[]` | In This Change |
| Old notice phrases ("The following skills you use changed…", "Re-read the updated SKILL.md…") | Misleading | The new format | In This Change |

## Interface / File Mapping

| File | Change |
| --- | --- |
| `skill-update-notice-types.ts` | `SkillChange` updated variant: add `skillDir`; replace `changedFiles` with `files` |
| `skill-version-diff.ts` | Status per file |
| `skill-update-notice-builder.ts` | New text; `MAX_FILES_PER_SKILL` stays 10 |
| `skill-update-notice-service.ts` | Compiles against the new type (expected no logic change) |
| Tests and docs | As in Change Scope |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| References only | ``Your skill package `agent-package-creation` has been updated (/…/skills/agent-package-creation).`` / "Changed files:" / two `(changed)` lines / "Re-read the updated files…" | `- agent-package-creation (/…/SKILL.md): references/a.md, references/b.md` |
| Mixed | `- SKILL.md (changed)`, `- references/new.md (added)`, `- scripts/old.sh (removed)`, plus "Removed files are no longer available." | One inline comma list |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `changedFiles` alongside `files` | Rejected: clean cut |
| Change the header | Rejected: web label and history detection depend on it (REQ-006) |

## Change / Refactor Sequence

1. Type and diff.
2. Builder.
3. Unit tests: AC-001…004, the exact text for the references-only case, no "SKILL.md" when it did not change.
4. Integration test updates.
5. Doc example.
6. Real-app check (AC-005).

## Key Tradeoffs

Folder instead of the `SKILL.md` path: the agent sees no direct `SKILL.md` link when `SKILL.md` did not change. That is intended, and when it did change it is listed.

## Risks

- Markdown rendering of the blocks in the card. Verify in a browser probe or the desktop check (AC-005).

## Guidance For Implementation

- Keep wording strings in the builder only.
- Follow `TESTING.md`: server unit and integration plus typecheck; the gated AGY roots E2E if its assertion changes; an isolated desktop instance for AC-005.
