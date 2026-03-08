# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - touches multiple backend subsystems and server tests

## Plan Status

- Current Status: `Ready For Implementation`
- Runtime Review: `Go Confirmed`

## Planned Changes

1. Update agent definition provider to read/write/delete against the resolved source directory and expose bundled-skill convention.
2. Update agent team definition provider to read/write/delete against the resolved source directory.
3. Extend `SkillService` so definition roots contribute bundled skills from `agents/*/SKILL.md`.
4. Add targeted tests for imported-definition updates and bundled skill discovery.

## File Plan

| Order | File | Purpose |
| --- | --- | --- |
| 1 | `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | resolved-source writes + bundled-skill convention |
| 2 | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | resolved-source writes for teams |
| 3 | `autobyteus-server-ts/src/skills/services/skill-service.ts` | bundled skill discovery from definition roots |
| 4 | `autobyteus-server-ts/tests/integration/agent-definition/md-centric-provider.integration.test.ts` | provider integration coverage |
| 5 | `autobyteus-server-ts/tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts` | GraphQL coverage for imported updates |
| 6 | `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | bundled skill scanning coverage |

## Verification Plan

- Stage 6:
  - targeted `vitest` runs for provider integration, definition-source e2e, and skill source unit tests
- Stage 7:
  - use GraphQL e2e scenarios already covering source add/update/read behavior

## Guardrails

- No backward-compatibility shim layer.
- Explicit `skillNames` remains authoritative.
- Precedence remains deterministic and first-hit-wins.
