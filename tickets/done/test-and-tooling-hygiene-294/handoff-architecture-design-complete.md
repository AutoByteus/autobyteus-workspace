# Handoff — Architecture Design Complete — test-and-tooling-hygiene-294 (autobyteus-294)

- Result: `Architecture Design Complete`; `task_size` Large, `architectural_risk` High (design-spec § Task Size And Architectural Risk).
- Package: `test-and-tooling-hygiene-294`; Project Task `autobyteus-294` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`.
- Current SR: `SR-005` (round 2, answering ARCH-REV-001). Requirements approved by the user: SR-002 (scope), SR-004 (REQ-031 wording), SR-005 (REQ-032, the four bug fixes: "yesss go ahead", 2026-10-27).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`, branch `codex/test-and-tooling-hygiene-294`, base `origin/personal` `2f48d85d4d` (rebased at the user's request on 2026-10-27); finalization target `origin/personal`. No commits on the branch yet; the ticket folder is untracked.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/tickets/in-progress/test-and-tooling-hygiene-294/`

## Original request and goals

The Task (description: 253 FU-001..FU-004) and its comments, which carry hygiene items from tickets 290, 204/280, 14, 297, 296, 303, 273, 260, 244, 185 and 32, plus the user's decision to remove the agent-management tools. Goal: every check named in TESTING.md green and deterministic, each failure fixed at its found cause (TESTING.md Rule 9), a web type check that is a gate, the listed dead code removed without behaviour change. "Done when": the web has a green type check wired into the project's checks and described in TESTING.md; the three gated E2E tests pass gated; merged to personal. Constraints: prove from a clean clone; no release unless asked; do not weaken assertions; clean up worktree and branch at the end.

## Approval basis

- The user (2026-10-27): do what is still broken and worth fixing; drop the optional items (real-worker E2E, RC-12 watchdog, matrix tool-event output, GraphQL regeneration script → follow-ups FU-005..FU-008); leave the TESTING.md Rule 9 vs skill question out; do not run live real-model compaction, but write a global TESTING.md rule about it (DEC-018, DEC-024, DEC-025).
- Every other decision is the Solution Designer's within the direction (requirements-doc § Decisions).

## Round 2: answers to ARCH-REV-001

- AR-001 (Requirement Gap): all 105 production errors triaged (design-spec § Group C table). 2 outside the final scope, 13 dead code (four components; the audio-recorder chain, rendered nowhere — `transcriptionStore` is dead, not live; the overridden first `ignore` in `nuxt.config.ts`), 1 codegen setting, 8 behind four live bugs, 81 type-only. The four bugs (BEH-032 a-d: mobile team workspace load throws; "undefined needs a runtime"; mobile team messages show "teammate"; custom provider "null models") are fixed in scope with a failing-first spec each — REQ-032 / AC-034, approved by the user (DEC-026).
- AR-002 (Design Impact): the disposition table per file, carried into Change Scope, Removal Plan and Files; the escalation trigger restated: no production baseline, no suppression; an unforeseen behaviour-changing fix stops that file and returns a Design Impact; the gate stays red until resolved.
- AR-003 (Design Impact): the checker runs each compiler with `--noEmit --pretty false` from `autobyteus-web` and fails on any unattributed `error TS` line, a non-zero exit or signal with no parsed diagnostic, and a compiler that cannot start; self-check cases added.
- R-1: scope through `nuxt.config.ts` `typescript.tsConfig.exclude` (merged by `defu`, `@nuxt/kit` L3568; no separate web typecheck tsconfig). R-2: `vite` and `vue-bundle-renderer` declared as dev dependencies at the resolved versions. R-3: `beforeAll`. R-4: DS-002 owner wording. R-5: TESTING.md note on lower counts.
- Also since round 1 (SR-004, the user): the TESTING.md live-compaction rule (H-31) says why — a real key or signed-in CLI and enough input to reach the threshold — and that small-input real-provider runs keep the existing Gates rule; H-26's one Codex run stays.

## What to review

- `design-spec.md`: the work items H-01..H-31 in groups A-F (commit order), Removal Plan, the type gate (scope, three projects, per-file shrink-only baseline, `build:electron*` placement), dependency declarations, the escalation trigger for type fixes that would change behaviour.
- `requirements-doc.md`: Scope Guardrail, REQ/AC, decisions.
- `investigation-notes.md`: the cause and proof of each item (Source Log, Corrections, Architecture Investigation Findings); evidence in `evidence/`.

## Open risks

- R-1: production type fixes in about 40 files must not change behaviour (escalation trigger in the design).
- Dependency declarations must not change resolutions (verify with a frozen install).
- The gate makes release builds fail on new type errors (intended).

## Follow-ups (not sent yet; the Solution Designer sends them when the ticket leaves the team)

`follow-ups.md` FU-001..FU-008.

## Expected next step

Independent architecture review of the design package; on Pass, the reviewer's own route to implementation.

## Route record

- Round 2 (2026-10-27): same rule → `/software_engineering_team/architecture_reviewer`.


- `get_handoff_rules` (2026-10-27): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
