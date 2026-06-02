# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement

Restore the original Skills page behavior: skills bundled inside imported agent packages and definition roots must appear in the normal Skills page catalog alongside user/global skills, open in the existing Skill Detail/File Explorer UI, and behave like normal skill entries subject to the underlying filesystem permissions.

The restoration must also preserve the newer package skill layouts introduced by the recent refactor, including multiple skills under an agent or team `skills/` folder.

## Investigation Findings

Root cause found: commit `716a570374c4e86abab8bd53ab9555f2c4aaed15` (`chore(ticket): checkpoint agent package multiple skills candidate`, 2026-05-31) removed package/definition-root skill scanning from the normal global skill catalog and moved package skill resolution behind `ConfiguredAgentSkillResolver` runtime context.

Before that refactor, `SkillService.listSkills()` and `getSkill()` scanned definition roots using helpers such as `getAllDefinitionRoots`, `searchBundledSkillDirectory`, and `scanBundledSkillsFromDefinitionRoot`. That made package/agent skills show up as normal rows on the Skills page.

After the refactor, GraphQL `skills` still drives the Skills page, but `SkillService.listSkills()` scans only global skill-source directories (`getSkillsDir()` and `AUTOBYTEUS_SKILLS_PATHS`) using `scanSkillDirectory()`. That scanner no longer discovers agent package layouts, so paths such as `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` are omitted from the Skills page.

The product requirement is to restore the old user-facing catalog behavior, not to create a separate view-only catalog. Package/private skills should again appear as normal Skills page entries. Editing can remain governed by existing filesystem writability and existing Skills/File Explorer behavior.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / behavior restoration after false refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Git history shows package-root scanning existed before `716a5703`; current Skills page path still depends on `SkillService.listSkills()`; current `SkillService.listSkills()` no longer scans agent package roots or app-data definition roots.
- Requirement or scope impact: Restore package/definition-root scanning into the normal skill catalog, extended for all supported current package skill layouts.

## Recommendations

- Reintroduce package/definition-root bundled skill discovery into `SkillService.listSkills()` and `SkillService.getSkill()`.
- Extend the restored scanner to cover both old colocated skill layouts and new `skills/<skill-name>/` layouts.
- Keep the existing Skills page, Skill Detail, SkillWorkspace, File Explorer, and mutability behavior as normal as possible.
- Keep `ConfiguredAgentSkillResolver` for runtime context-first resolution; it can coexist with normal catalog discovery.
- Add mandatory end-to-end validation proving package skills appear on the Skills page catalog after importing an agent package.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases

- UCA-001: User imports or configures an agent package root; bundled package skills appear in the normal Skills page list.
- UCA-002: User can open a package skill from the Skills page and view its `SKILL.md` content and files through the existing Skill Detail/File Explorer UI.
- UCA-003: Existing user/global skills continue to appear and behave as before.
- UCA-004: Runtime configured skill resolution continues to prefer the owning agent/team context and supports multi-skill package layouts.
- UCA-005: Duplicate skill names are handled with deterministic first-seen precedence, matching current `listSkills()` de-dup behavior.

## Out of Scope

- Designing a separate read-only package skill catalog.
- Adding provenance badges or new package-skill-only UI sections unless needed for implementation clarity.
- Changing file edit semantics beyond what the existing Skills/File Explorer workspace already provides.
- Solving all possible duplicate-name UX improvements beyond deterministic de-dup precedence.
- Publishing or release work.

## Functional Requirements

- REQ-001: `SkillService.listSkills()` must include skills from the default skills dir, `AUTOBYTEUS_SKILLS_PATHS`, app-data definition roots, and `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- REQ-002: `SkillService.getSkill(name)` must be able to resolve a bundled package/definition-root skill by name using the same precedence as `listSkills()`.
- REQ-003: Bundled skill discovery must support `agents/<agent-id>/SKILL.md`.
- REQ-004: Bundled skill discovery must support `agents/<agent-id>/skills/<skill-name>/SKILL.md`.
- REQ-005: Bundled skill discovery must support `agent-teams/<team-id>/agents/<agent-id>/SKILL.md`.
- REQ-006: Bundled skill discovery must support `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`.
- REQ-007: Bundled skill discovery must support `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`.
- REQ-008: Global/user skill source precedence must remain first; duplicate later package skills with the same `name` are skipped by deterministic first-seen de-duplication.
- REQ-009: The normal Skills page GraphQL query (`skills`) must return bundled package skills so the existing Skills page list displays them without a separate catalog UI.
- REQ-010: Opening a bundled package skill from the Skills page must use existing `skill(name)`/`SkillWorkspace` behavior and point at the discovered package skill root.
- REQ-011: `ConfiguredAgentSkillResolver` runtime behavior must remain context-first and continue to resolve package-private/team-shared skills for the owning agent/team.
- REQ-012: Durable tests must include end-to-end coverage proving an imported agent package's bundled skills appear through the Skills page/GraphQL catalog and can be opened for content inspection.

## Acceptance Criteria

- AC-001: Unit tests cover package skill scanning for all five required layouts.
- AC-002: Unit tests cover deterministic duplicate-name precedence between global skills and package-root skills.
- AC-003: GraphQL/API validation proves `skills` includes bundled package skills after a package root is imported/configured.
- AC-004: GraphQL/API validation proves `skill(name)` resolves a bundled package skill and returns its root path/content.
- AC-005: Runtime validation proves `ConfiguredAgentSkillResolver` still resolves context-owned package skills for agent execution.
- AC-006: End-to-end validation imports or configures a local agent package fixture, queries/loads the Skills page catalog, verifies a bundled package skill is visible, opens it, and verifies its `SKILL.md` content/file tree is viewable.
- AC-007: Existing global/user Skills page behavior remains intact.

## Constraints / Dependencies

- Work from dedicated branch/worktree `codex/agent-package-private-skills-page-regression`.
- Use Git history around `716a5703` as implementation reference for restoring original scanning semantics.
- Preserve existing global skill CRUD behavior.
- Preserve runtime context-first configured skill resolution.
- E2E coverage is mandatory before delivery.

## Assumptions

- Package/private skills should be normal Skills page entries, as they were before the false refactor.
- Editing behavior can remain governed by existing filesystem permissions and existing File Explorer/SkillWorkspace behavior.
- Duplicate-name behavior can remain simple first-seen precedence for this restoration ticket.

## Risks / Open Questions

- Name-only skill identity means duplicate package skill names remain hidden by first-seen precedence. This matches current simple catalog behavior but may warrant future provenance UX.
- Restoring package skills to `getSkill(name)` means name-based global lookup can resolve package skills again, as before the refactor. This is accepted by the current product clarification.
- Some GitHub-managed or read-only package roots may be physically writable or unwritable depending on install permissions; no new permission model is introduced in this ticket.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UCA-001, UCA-003 |
| REQ-002 | UCA-002 |
| REQ-003 | UCA-001, UCA-002 |
| REQ-004 | UCA-001, UCA-002, UCA-004 |
| REQ-005 | UCA-001, UCA-002 |
| REQ-006 | UCA-001, UCA-002, UCA-004 |
| REQ-007 | UCA-001, UCA-002, UCA-004 |
| REQ-008 | UCA-005 |
| REQ-009 | UCA-001 |
| REQ-010 | UCA-002 |
| REQ-011 | UCA-004 |
| REQ-012 | UCA-001, UCA-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Prove all supported package layouts are discoverable. |
| AC-002 | Prove duplicate behavior is deterministic and simple. |
| AC-003 | Prove backend catalog restoration. |
| AC-004 | Prove detail/workspace lookup can target bundled package skills. |
| AC-005 | Prove runtime behavior was not regressed. |
| AC-006 | Prove real user-facing end-to-end restoration. |
| AC-007 | Prove existing global skills remain unaffected. |

## Approval Status

Approved by user for ticket kickoff on 2026-06-01. User explicitly clarified that the desired behavior is to restore original Skills page behavior: package/private skills should be displayed normally like other skills, and E2E tests must cover this restoration.
