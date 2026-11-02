# Design Spec — clean-runner-build-order

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` @ SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-02).
- Supplements: none. User approval of the design: `Not required` (the direction is the user's own request; no product behavior changes).
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/investigation-notes.md` (F-01…F-09)
- Authorities read: `architecture-design.md`, `design-principles.md` (earlier in this conversation), project `DESIGN.md` rules 1, 4, 5, 6 and the new rule 12, `TESTING.md`, `RELEASE.md`; no conflict.

## Current-State Read

`autobyteus-web/package.json`: `prepare:shared-types` builds `application-sdk-contracts` only; `typecheck`, `typecheck:update-baseline` run it first. `autobyteus-server-ts/package.json`: `prepare:shared` (autobyteus-ts, application-sdk-contracts, application-backend-sdk), `prebuild` = `prepare:shared` + `prisma generate`, `pretypecheck` = `prepare:shared`. The web gate's cross-package project compiles the server's `src` (F-02, F-03).

## Task Size And Architectural Risk

- Task size: `Small`. Rationale: two `package.json` files (five script lines) plus the already written guide documents; no production code.
- Architectural risk: `Low`. Rationale: build scripts only; the effect is verified by running them on a clean clone (F-05, F-06); no stored data, no API.
- Escalation trigger: the clean-clone run shows another missing output (a generated file besides the Prisma client), or a release runner fails `prisma generate`; then the owner script grows (still one owner) and the design is revisited.

## Intended Change

1. `autobyteus-server-ts/package.json`: add `"prepare:source": "pnpm prepare:shared && pnpm exec prisma generate --schema ./prisma/schema.prisma"` (everything the server's source needs to type-check and build: the three workspace packages' build output and the Prisma client). `prebuild`, `pretypecheck` and `typecheck:update-baseline` call `pnpm prepare:source` instead of repeating the two commands. `prepare:shared` stays (used by `pretest` and by `prepare:source`).
2. `autobyteus-web/package.json`: `"prepare:shared-types": "pnpm -C ../autobyteus-server-ts prepare:source"`. The name stays (it is called by `typecheck` and `typecheck:update-baseline`); its content is now the server's one owner (DEC-1). It covers `application-sdk-contracts`, which it built before.
3. The guide documents (already written in this branch by the Solution Designer): `DESIGN.md` rule 12, checklist item, anti-pattern; `docs/design-cases.md` Case 15; pointers in `TESTING.md` and `RELEASE.md`; `RELEASE.md` case study.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002; the two `package.json` files and the guide documents.
- Derived consumers: `build:electron*` chains call `pnpm typecheck`, which calls `prepare:shared-types`; `.github/workflows/release-desktop.yml` calls those chains (not edited); the server's `pretest` keeps `prepare:shared` (tests need no Prisma generation beyond what `test:integration:prepare` does; not changed).
- Deliberately left alone: `prepare-server` and the order of the electron chain; the cross-package tests project; other workflows; `prepare:shared`'s package list.
- Follow-ups: `FU-1` in `follow-ups.md` (a clean-runner CI job as the enforceable guard).

## Relevant Behavior And Production-Path Map

| Behavior | Path |
| --- | --- |
| BEH-001 | `build:electron*` → `pnpm typecheck` (web) → `pnpm prepare:shared-types` → `pnpm -C ../autobyteus-server-ts prepare:source` → `prepare:shared` (3 builds) → `prisma generate` → `nuxt prepare` → `scripts/typecheck.mjs` |
| BEH-001 (server) | `pnpm typecheck` (server) → `pretypecheck` → `prepare:source` → `scripts/typecheck.mjs` |
| BEH-002 | Documents only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (release blocker) plus a guide rule.
- Current design issue found: `Yes`: duplicated policy, two prepare lists for the same source (web and server), one of them stale.
- Structural triggers: Duplicated Policy Or Coordination (fires; resolved by delegation to one owner, DEC-1). Others checked: no boundary, no stored shape.
- Root cause classification: `Duplicated Policy Or Coordination`, with a missing design-time question (the rule).
- Refactor needed now: `Yes`, minimal: the web step stops keeping its own list.
- Intentional deferrals: the enforceable fresh-runner guard (`FU-1`); de-duplicating the double build inside one chain (ASM-001).

## Legacy Removal Policy (Mandatory)

- Obsolete: the web step's own one-package list; the repeated two-command text in the server's `prebuild`. Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine, Ownership, Dependency Rules

- Spine: as the production-path map. Owner of "what the server's source needs built": `autobyteus-server-ts` `prepare:source`. Dependency rule: a package whose gate compiles another package's source calls that package's prepare owner; it never lists the other package's dependencies itself.

## Interface Boundary Mapping

| Interface | Producer | Consumer |
| --- | --- | --- |
| `pnpm prepare:source` (server) | server package | server `prebuild`/`pretypecheck`, web `prepare:shared-types` |

## Backward-Compatibility Rejection Log

No old script name is kept; `prepare:shared-types` keeps its name because it is the web gate's own prepare step and is called by two scripts in the same file.

## Change / Refactor Sequence

1. Server scripts. 2. Web script. 3. Clean-clone proof (below). 4. Push the branch for the build-only release run.

## Key Tradeoffs

Delegation to the server prepare builds `autobyteus-ts` twice in one chain (gate, then `prepare-server`): accepted for one owner (ASM-001); the build-only run shows the time.

## Risks

`prisma generate` on a release runner needs its engine files: it already runs in `prepare-server` on the same runners, so the risk is low (AC-004).

## Guidance For Implementation

- Reproduction to start from: `evidence/INV-01-web-typecheck-clean-install-before.log` (fails: 325 `TS2307`); command in a clean checkout of `origin/personal`: `pnpm install --frozen-lockfile && pnpm -C autobyteus-web typecheck`. The fix turns it green (`evidence/INV-03-with-prisma-generate-pass.log` is the expected result).
- Checks to run (TESTING.md; implementation-scoped, not a test suite):
  1. In a fresh clean clone/worktree of the branch (no `*/dist/`, no Prisma client; a plain `pnpm install --frozen-lockfile` only): `pnpm -C autobyteus-web typecheck` → AC-001; `pnpm -C autobyteus-server-ts typecheck` → AC-002 (if it fails for another reason also on the base, record a follow-up, do not widen).
  2. On a machine with everything built: web typecheck and `pnpm -C autobyteus-server-ts build` → AC-003.
  3. `pnpm -C autobyteus-web guard:web-boundary` is unaffected (scripts only); no unit tests are added for `package.json` scripts.
- Do not edit the guide documents (written by the Solution Designer; wording corrections go back to it).
- Do not run `release:test`; delivery runs it on the pushed branch (AC-004).
