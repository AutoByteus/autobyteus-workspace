# Bash Operating Practice Prompt Specification

## Status

Approved intended-behavior authority — approved with `requirements.md` on 2026-08-12.

## Purpose

Define the concise, always-present Bash-first operating convention for AutoByteus agents without representing that convention as a skill or embedding the former long command manual.

## Runtime Invariant

Bash is always available to the agent. The prompt does not contain conditional shell-availability or fallback-shell language.

## Proposed Prompt Text

```md
## Bash Operating Practice

- Use Bash as the primary interface for performing work in the agent workspace. Use it for workspace navigation, search, file reading, writing and editing, repository operations, processes, network operations, and project commands.
- Prefer deterministic, non-interactive, small, composable commands.
- Prefer project-native commands and format-aware tools such as `git`, `npm`, `pnpm`, `pytest`, `jq`, and project scripts when applicable.
- Use another provided tool when Bash cannot achieve the purpose.
```

## Ownership Rules

- This is a structured system-prompt section, not a `SKILL.md` body.
- It follows Working Environment so “workspace” already has one explicit meaning.
- It establishes Bash-first routing without duplicating tool schemas.
- File and directory discovery, inspection, editing, and verification guidance is owned by the following `## File And Directory Practice` section and is not duplicated here.
- Tool schemas remain authoritative for parameters, authorization, and results.
- Domain workflows, worktree/branch rules, artifact requirements, and domain verification remain owned by applicable skills.

## Excluded Former Skill Content

- Comprehensive command-family tables.
- Generic reasoning, planning, verification, reporting, and communication advice.
- Repeated anti-pattern lists.
- Tool availability fallbacks.
- Domain-specific Git, branching, commit, or delivery policy.
- Detailed editing recipes that capable models already know or that tool schemas/project instructions govern more precisely.

## Related Authority

- Consolidated prompt: `system-prompt-contract.md`
- Working environment: `working-environment-prompt-spec.md`
- File and directory practice: `file-and-directory-practice-prompt-spec.md`
- Decision rationale: `system-skill-decision.md`
- Requirements: `BEH-009`; `R-011`; `AC-011`
