# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record keeps the concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` / CRR-002 pass | SR-002, SR-004, ARCH-REV-002, IR-001, IR-002, CRR-002 | N/A | Fail / 90% (AE-001) |
| API-REV-002 | code_reviewer / `code-review-report.md` / CRR-005 pass | SR-005, SR-006, SR-007, ARCH-REV-005, IR-003, IR-004, CRR-003, CRR-004, CRR-005 | Fail / 90% (AE-001) | Pass / 94.7% |

## Revision Entries

### API-REV-001 — Initial baseline: live delegated-child lifecycle across runtimes and roots, real-install upgrade, real UI

- Triggering role, report path, and round: code_reviewer, `code-review-report.md`, CRR-002 (round 2, Pass).
- Triggering finding or scenario IDs: the review's residual risks and candidates C-04 and C-07. The stale `mixed-task-delegation.e2e.test.ts` was handed off for a rewrite.
- Related revision IDs: SR-002 (requirements), SR-004 (design), ARCH-REV-002, IR-001, IR-002, CRR-002.
- Why this baseline was recorded: first completed API/E2E validation result.
- Coverage decisions or durable test paths changed:
  - Rewritten: `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (LIVE-001…005).
  - Added: `tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts`.
  - Updated:
    - `tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts` (QR-002)
    - `tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts` (AC-015 Team)
    - `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts` and helper `helpers/task-publication-handles.ts` (AC-015 Org)
    - `tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` (AC-019 MCP output schema)
    - `tests/e2e/helpers/team-run-metadata-helpers.ts` (Team tree DTO v3; unblocks 9 live e2e files)
- Scenarios added: REPO-001…003, LIVE-001…005, DUR-001…005, PROBE-QR002, PROBE-UPG, BROWSER-001.
- Commands, environment, fixture, or broader-validation delta:
  - All runs used the sanitized env `/tmp/tdrl-api-e2e/senv.sh`, because the agent shell carries the user's live production env.
  - Live runs: grace 60 s; Claude coordinator; AutoByteus, Codex and Claude children; Team and Org roots.
  - Real-install upgrade on an APFS clone of `~/.autobyteus/server-data` with a rebuilt server.
  - Real UI via owned Nuxt dev plus headless Chrome.
  - Exact base comparison in a temporary base worktree.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (plan, revised decisions, scorecard), execution coverage report (all sections), test-case ledger (events 1–22).
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 90%. Proven in this round:
  - Live runtimes: AC-001–010 and AC-012–015; AC-011 in unit/integration only.
  - Real installed data: AC-018.
  - Durable tests: AC-016 and AC-019.
  - QR-001, QR-002, QR-003.
  - Team-root AC-017.
- New or remaining failure IDs:
  - **AE-001 (Medium).** On Org roots, delegated children in the members tree (the Org sidebar) show no spawner and keep a visible "Task: <name>" label. This fails AC-017 via REQ-017. `WorkspaceAgentOrgHistoryCollection.vue` is unchanged by the ticket. Preliminary classification: `Local Fix` (web).
- Recommended recipient: `/code_reviewer` (failure-origin review).
- Remaining risks, blocked evidence, or untested scope:
  - Rerun PROBE-UPG after Delivery integrates `origin/personal`. Two `grok_build` packages cannot migrate at base `8bffda045`; the migration status stays `FAILED` and is retried at each startup, blocking nothing.
  - OBS-001: per-root FIFO head-of-line latency. Every exact delivery or operator post waits behind an in-flight shutdown or restore; no message is lost.
  - `team-run-v1-production-upgrade.e2e.test.ts` fails at base already, and its `schema_version: 2` and "+4 ledger rows" expectations become 3 and +5 with this change. It needs an owner.
  - AC-005 (activity during grace cancels) and AC-011 (context unavailable) are proven by unit/integration tests only, not live.

### API-REV-002 — SR-007 basis: tolerant reading without migration, on both entrypoints and real data; live lifecycle per runtime; real desktop UI

- **Trigger:** code_reviewer, `code-review-report.md`, CRR-005 (round 5, Pass). The basis is `HEAD` `origin/personal@8f57d16d1` plus the uncommitted IR-004 diff.
- **Triggering scope:** the design's "SR-007 → Evidence obligations", items 3 and 4 (item 5 is the per-runtime obligations); per-runtime AC-006, AC-007, AC-009 and AC-013 plus QR-002; the real-app UI (R-14); wake latency (C-11 / OBS-001).
- **Related revision IDs:** SR-005, SR-006, SR-007; ARCH-REV-005; IR-003, IR-004; CRR-003, CRR-004, CRR-005.
- **Superseded run:** a full run on IR-003, recorded in the ledger as "Round 2", was superseded by SR-007 before it was reported. It is historical only. Its live, desktop and C-11 observations are consistent with this round.
- **Durable test changes:**
  - Updated `tests/e2e/helpers/team-run-metadata-helpers.ts`. It removes the `schema_version` guard because R-13 dropped the DTO field; the helper had silently resolved no members.
  - Updated `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. LIVE-002 now denies any extra approval request from the gate children after the planned approval, because a child may call `get_handoff_rules` after the rebase.
  - The round-1 durable paths are unchanged and pass.
- **Scenarios run:**
  - R3-REPO-001 (21 focused files / 160 tests) and R3-REPO-003 (server and web regression).
  - Live LIVE-001…005 (4 tests).
  - PROBE-QR002 and PROBE-C11 (temporary).
  - Installed-data copy through both entrypoints (standalone and packaged desktop).
  - Skip-version chain through both entrypoints, plus repeat startups.
  - Real desktop UI.
- **Commands, environment and fixture delta:**
  - Built the packaged worktree desktop app (`build:electron:mac`) and ran it through `pnpm isolated-app` on disposable data roots.
  - Standalone `node dist/app.js --data-dir`.
  - A temporary seeder built the released-shape skip-version fixture and was then deleted.
  - Standalone server processes need `USER` and `LOGNAME` for Claude authentication.

#### Prior Failure Resolution

| Prior Failure ID | Status | Evidence |
| --- | --- | --- |
| AE-001 (Org-root members tree: no spawner, "Task:" label) | Resolved | CR-003 (IR-003); re-verified on SR-007 in the real desktop app. New Org children show "worker / Started by coordinator" and "squad / Started by coordinator". Old children show no starter (R-14). No "Task:" label anywhere (ledger R3-7, R3-8) |

- **Canonical artifacts updated:**
  - coverage investigation: meta, basis, persistence note, and the new "Round 2 (API-REV-002) Basis" section;
  - execution coverage report: rewritten as the API-REV-002 authority;
  - test-case ledger: R3-1 … R3-18 and a re-entry note.
- **Prior result:** `Fail`, 90%.
- **Current result:** `Pass`, 94.7%. No category is below 90%, and every critical AC is directly proven. The 0.3-point gap to 95% is the stopped-writer condition, which cannot be closed without stopping the user's running app.
- **Proven this round:**
  - **Design item 3:** on both entrypoints, only the 4 pending released migrations ran. Their released outputs are as expected, there is no delegator migration, the old Team tree stays byte-identical (still `schemaVersion: 2` and `settledAt`), and a repeat startup runs nothing.
  - **Design item 4:** on both entrypoints, all 1,324 tree and records files are unchanged at startup. Admission is 204 Team plus 25 Org roots, the same set as the live app, with the 8 tree-less roots excluded. Old children have `delegator_agent_run_id: null`, and 33/33 old conversations are identical. New Team and Org delegations write version-less trees with `delegatorAgentRunId`, no `settledAt` and no records file. A new child shut down and later woke with its context.
  - **Live:** grace for AutoByteus 60,002, Codex 60,018 and Claude 60,409 ms. Approval hold of 90,001 ms with no shutdown. Org task Team and nested wake. Stop and reopen restore on each runtime. QR-002 order: offline < input < reply.
  - **Regression:** 0 new failing files in server unit + architecture, integration or e2e, or in web unit.
- **New or remaining failure IDs:** none.
- **Recommended recipient:** `/code_reviewer` (proportional test-code review).
- **Remaining risks and observations:**
  - **C-11 / OBS-001:** a wake delays other messages in the same root by the provider restore time. Measured: Codex +667 ms, AutoByteus +5 ms, Claude +2 ms. No loss.
  - **OBS-002, pre-existing and not this ticket:** in the desktop app, opening a second old Team run in one session fails with `DataCloneError` at `teamExecutionContextFactory.ts:55`. The installed release 1.4.91-beta.6 reproduces it identically. Recommend a separate ticket.
  - **Writer not stopped during the copy:** no root changed during it.
  - **Stale pre-existing e2e files needing an owner:** `hierarchical-team-run-config-graphql` and `team-run-v1-production-upgrade`.
  - **Unit/integration-only proof:** AC-005 and AC-011 are proven in unit and integration tests only.
