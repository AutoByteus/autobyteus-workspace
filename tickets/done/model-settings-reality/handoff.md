# Handoff — model-settings-reality (SR-004)

- Classification: `Architecture Design Complete` — `task_size: Large`, `architectural_risk: High`
- Route (from `get_handoff_rules`, 2026-11-10): Large or High → `/software_engineering_team/architecture_reviewer` (independent architecture review)
- Package identifier: `model-settings-reality`
- Request: Project Task `autobyteus-9` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), requested by `/project_task_manager` for the user; Parts A–D (Claude Off truthful on both runtimes, no stale config keys, LLM docs sync, model lists refresh without restart)
- Worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, branch `codex/model-settings-reality`
- Base: `origin/personal` at `fd0eb664c` (investigation ran on `310fc2745`; the 11 newer commits touch no cited file). Finalization target: `origin/personal`
- Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/` (documents are uncommitted working files in the worktree)
- Dependencies: installed with `corepack pnpm install --frozen-lockfile` (`pnpm` is not on this shell's PATH; use `corepack pnpm`)

## Approval basis

- Requirements `Approved` at SR-002 by the Solution Designer within the direction, user informed (SR-001 message 2026-11-10; SR-002 clarifications DEC-013..DEC-015 reported with this handoff). The user, 2026-11-10: "if you think it's clear now, then we could start to work on it now". No `Needs user` decision open. Design approval by the user: not required.

## What the user asked to know (re-check on the latest origin/personal)

| Part | Still exists? | Evidence |
| --- | --- | --- |
| A / FU-001 | Yes | PRB-A2 (Opus 5, Fable 5 think with today's Off) |
| A / FU-003 | Reported 400 no longer reproduces; Off is ineffective on the SDK runtime | PRB-A1 |
| B / FU-004, FU-005 | Yes | SRC-011, SRC-013 |
| C / FU-002 | Yes (wider) | SRC-016 |
| D | Yes, client-side; server already fresh | SRC-023, PRB-D3 |

## Documents

- [requirements-doc.md](requirements-doc.md) — REQ-001..014, AC-001..013, DEC-001..015
- [investigation-notes.md](investigation-notes.md) — SRC-*, PRB-*, ARC-* evidence
- [design-spec.md](design-spec.md) — DS-001..DS-007, file mapping, removal plan, classification
- [solution-revision-record.md](solution-revision-record.md) — SR-001, SR-002
- [follow-ups.md](follow-ups.md) — FU-001..FU-003 (not sent yet; sent when the ticket leaves the team)
- Supplements: [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md), [probes/](probes/)

## Review focus (open risks)

- Contract changes: `model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`; `ModelCatalogService` throwing on an empty external list (availability, GraphQL catalog, validation consumers); `LLMFactory` raw-config contract (undeclared settings no longer reach `extraParams`, `extra_params` included, standard fields kept).
- DEC-014: creation-time projection for external runtimes by backend setting keys (no catalog read).
- Web background refresh (QR-001/QR-002).
- RSK-001 (CLI could start honoring `thinking: disabled`), RSK-004 (switch default On raises token use).

## Expected next action

Architecture review of the SR-002 package; findings return to the Solution Designer; on Pass the reviewer hands off to implementation per its rules.

## SR-003 revision (after ARCH-REV-001, 2026-11-10)

- Review: [design-review-report.md](design-review-report.md) — `Fail`, Design Impact: AR-001 (blocking), AR-002, AR-003, R-3, R-4.
- Resolution (design-spec SR-003; requirements unchanged at SR-002):
  - AR-001: design-spec "Change Scope → Derived consumers" now lists every consumer with a decision. Fallback reason: option (a), DEC-D1 — keep the persisted vocabulary, record a list-read failure as `model_unavailable` (as today) with a precise `detail` from the wording owner. `invalidModelMessage`, `refusalOf` and the application capability validator use the owner. `runtimeCurrentModelDescriptors` (error instead of null rows) and the application validator (empty read → catalog-failure issue) accepted with tests; cache preloader unaffected.
  - AR-002: "DS-003 creation trace" table added (incl. remote inbound delegation and `remote-team-run-starter.ts` L76; one projection point in `createTeamRun`).
  - AR-003: one mode, `adaptive_required`, for Fable 5, Fable 5.1, Opus 5.5 — measured (PRB-A3). FU-001 consistent.
  - R-3: projection stores declared settings in one canonical top-level form. R-4: glossary headword "Offered models".
- Classification unchanged: Large / High. Route: architecture reviewer (focused re-review).

## SR-004 revision (after code review CRR-003 / CR-004, 2026-11-10)

- Trigger: `/software_engineering_team/code_reviewer` failure-origin review of API-14 → Design Impact CR-004 ([code-review-report.md](code-review-report.md)). Code at `817bd9950`, API/E2E documents at `a3b87f061`; the reviewer's round-3 report updates are uncommitted in the ticket folder.
- Resolution (design-spec SR-004; requirements SR-004 states AC-012's failure alternate):
  - Server: `RunModelOptions.modelListReadable` (GraphQL `Boolean!`, all options objects); `false` with empty options and the owner's `modelListUnreadableText` when the list cannot be read; one read-failure classification shared with validation; dead `supportedRuntime` gate removed.
  - Web: request the field; unreadable row → `unavailable` state with message; `reloadModelOptions` / `delegatedLaunchDraftStore.reloadOptions` keep shown `ready` options for unreadable rows and resolve `false` (menu: "Couldn't refresh models" + Retry); "No longer offered" only for a readable answer. First read with a failing CLI fixed by the same signal (scope decision in SR-004).
- Reproduction to start from: `probes/locked-menu-failed-refresh.repro.spec.ts` (`evidence/API-14-repro-unit.log`).
- Classification unchanged: Large / High. Route per rules: architecture reviewer (re-review of the SR-004 delta); then implementation, source review of the delta, API/E2E rerun of API-14, API-11, API-12 and API-15.
