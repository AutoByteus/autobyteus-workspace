# Design Spec — switch-back-eexist

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction (user informed). User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/investigation-notes.md` (F-01…F-09). Authorities read: skill references (see notes), `DESIGN.md` rules 4, 5, 6, 7, 12 (rule 12 does not apply: no build step or gate is touched), `TESTING.md`.

## Current-State Read
`AgyAgentRunBackendFactory.createBackend` (a new start, including the first start of a later era) calls `createAgyRunCapsule`, which makes `<memoryDir>/agy-project` with an exclusive `mkdir` and exclusive file writes; its `catch` removes the folder only for failures after the mkdir. `restoreBackend` reads the same folder's manifest. Nothing removes the capsule at the end of an era (F-02, F-03, F-06).

## Task Size And Architectural Risk
- Task size: `Small` (one function in one file; tests). Risk: `Low` (derived scaffolding under one run's memory folder; no stored contract; no API).
- Escalation trigger: the Team-member reproduction shows another failing step; or replacing the folder disturbs a live process (a second Antigravity process of the same run exists when a new start runs); then re-open.

## Intended Change
1. `createAgyRunCapsule` (`agent-execution/backends/antigravity/capsule/agy-run-capsule.ts`): before making the capsule, remove the run's existing capsule folder: `await fs.rm(root, { recursive: true, force: true })`, then the existing `mkdir(root, { recursive: false })` and exclusive file writes stay (a start always begins on an empty capsule, so the exclusive writes remain a correctness guard, not a collision source). Its doc comment states: a new start replaces the capsule of any earlier era or failed start; restore never calls it.
2. Nothing else changes: not the factory, the switch sequence, `restoreAgyRunCapsule`, the markers or the journal.

## Change Scope (Mandatory)
- In scope: UC-001: `agy-run-capsule.ts` and its tests; the regression cases.
- Deliberately left alone: an end-of-era cleanup hook (DEC-1 c); a unique folder per era (DEC-1 d); the error wording; other runtimes; Restore.
- Follow-ups: none new (see `follow-ups.md`).

## Relevant Behavior And Production-Path Map
BEH-001: settings save → pending switch → first message → `activateSwitched` → prepare candidate → `AgyAgentRunBackendFactory.createBackend` → ★ `createAgyRunCapsule` (replace, then create) → `launch` → record marker → commit. BEH-002: the same `createBackend` on a retry after a failed `launch`.

## Task Design Health Assessment (Mandatory)
- Posture: `Bug Fix`. Current design issue found: `Yes`: a "first start" assumption (exclusive create) in a path that, since the runtime switch, is also the start of a later era or a retry. Root cause: `Missing Invariant` (an era's runtime-private files are not part of the next era). Refactor needed now: `No`: the invariant is stated and enforced at the one owner of the file.
- Alternatives rejected: DEC-1 (b), (c), (d).

## Legacy Removal / Persisted Data
No legacy path. Persisted data: the derived capsule is replaced at a new start; nothing is migrated (`Directly Usable — No Migration`: a leftover capsule is handled where it is met).

## Ownership, Dependency Rules, Interfaces
Owner of the capsule's lifecycle at start: `createAgyRunCapsule`. No new interface.

## Backward-Compatibility Rejection Log
None kept.

## Change / Refactor Sequence
1. Reproduce first (below). 2. The change. 3. Tests. 

## Key Tradeoffs
A new start discards the earlier era's generated agent text; that is intended (the new era uses the current definition). 

## Risks
(1) `fs.rm` recursive must not follow skill links: tested (AC-006). (2) A live Antigravity process of the same run using the folder while a new start runs: not possible in the activation lanes (the previous runtime is released before the candidate starts; an Antigravity retry follows a stopped process), stated as the escalation trigger. (3) The real CLI's behavior on a reused path is not run here (ASM-001).

## Guidance For Implementation
- **Reproduction to start from (fails today):** `evidence/repro/switch-back-reproduction.e2e.test.ts` (cases RB-01 Antigravity → native → Antigravity; RB-02 Grok sweep passes). Copy it to `autobyteus-server-ts/tests/e2e/runtime/`, build (`pnpm -C autobyteus-server-ts build`) and run: `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch`; RB-01 fails with `ACTIVATION_FAILED … EEXIST … agy-project` (log `evidence/INV-01-…log`). It is a scratch reproduction: turn it into the regression test in the existing runtime-switch built-server E2E (a case beside RS-01), asserting markers and segments as RS-01 does, not just "completed".
- **Team member first (U-1):** reproduce the same sequence on a Team member in the members built-server harness (`runtime-switch-members-built-server.e2e.test.ts`) on the base before changing code; if it does not fail, stop and tell me.
- Tests (TESTING.md layers): unit for `createAgyRunCapsule` with a leftover capsule (replaced; its link target intact; the workspace untouched; a leftover from a failed start) and the failed-launch retry at the factory (AC-005, AC-006); built-server cases AC-001, 002, 003 (with the fourth hop); existing capsule/restore and RS-01…08 stay green.
- Do not touch the switch sequence, Restore, or the user's data; no data on node 8001 is read.
