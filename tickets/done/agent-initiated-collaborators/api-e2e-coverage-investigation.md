# API/E2E Coverage Investigation — agent-initiated-collaborators

## Investigation Meta

- Requirements Doc: `tickets/in-progress/agent-initiated-collaborators/requirements-doc.md` (Approved, SR-005)
- Investigation Notes: `investigation-notes.md` (E-01–E-12)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-005)
- Supplemental Task Artifacts: `architecture-design-handoff.md`; predecessor UI spec VIS-001–015 (`/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`); `implementation-evidence/render-check-aic/`
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.3/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass; branch `codex/agent-initiated-collaborators` @ `2dfbd1843` (implementation `549510977`), base `origin/personal` @ `84224a58d`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- REQ-001/AC-001: opt-in `list_available_agents`, exposed only when the definition selects it, on every runtime (AutoByteus local tool; Agent Tools MCP for Codex, Claude, AGY, Grok/ACP).
- REQ-002/003, AC-002/003: `{agents:[{name, kind, address, description}]}`, same eligibility as `@`; in-run definitions at their in-run address; no in-run flag; `CatalogAddressMap` (plain segment unless it collides, else `segment_<sha256(defId)[:6]>` for every colliding definition); deterministic; unknown address → not found.
- REQ-004/010, AC-004/010: `send_message_to(address)` — sender instance (no fall-through) → run-wide → catalog bring-in (same admission as `@`, Offline then start) → deliver; second message same run IDs; concurrent first messages → one instance (per-root admission queue, C-01); failure `COLLABORATOR_ADD_FAILED`, nothing written; by run ID unchanged (existing only). `@` and bring-in reuse one instance in both orders.
- REQ-005, AC-005: `delegate_task(catalog address)` → fresh copy each call, `source` persisted on the task record, no collaborator (Q-1); restorable from `source`.
- REQ-006, AC-006: anyone in the run (collaborator members, copy members) may bring in / delegate.
- REQ-007, AC-007: a team instance is one unit — in-team addresses resolve within the sender's own instance; two copies never cross; outside addresses unchanged; **Org behavior change**: copies of a mounted Team stay inside the copy.
- REQ-008, AC-008: same in standalone, Team and Org roots; standalone package created by the first bring-in or catalog copy; listing writes nothing.
- REQ-009, AC-009: new wording identical on every runtime.
- REQ-011, AC-011: UI rows, Team/Org tab messages, "From <Sender>:" for agent-initiated items.
- AC-012 preserved: `@`, configured messaging, Org configured handoffs, delegated-copy lifecycle, existing history.
- Persisted data: `Directly Usable — No Migration` (optional `source`).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SC-001 (PM lists, then messages a team, which works through its handoffs), SC-002 (three parallel copies of a listed team, each following its own handoffs, reporting back), SC-003 (Org member delegates a copy of a mounted Team; the copy's handoffs stay inside the copy), SC-004 (listed team cannot run with the run's settings → reason, nothing added), SC-005 (user `@`s a team the PM already brought in → same instance).
- Real-use scenarios added from investigating the implementation:
  - RU-01: an agent without the tool asks for it (AC-001 opt-in) — real trigger: a normal user turn on an agent whose definition does not select the tool.
  - RU-02: re-listing after bring-in returns the same addresses, the brought-in one now in-run (AC-002/003).
  - RU-03: two same-name shared definitions (a real catalog fact, design P-001 note) → distinct hashed addresses.
  - RU-04: Stop and reopen of a run whose copies came from the catalog → restore reads `source` (AC-005 "restorable").
  - RU-05: a member of a brought-in Team and a member of a catalog copy bring in / delegate (AC-006).
  - RU-06: a full restart of the desktop app with catalog copies and agent-initiated collaborators (history opens unchanged, sending continues) — the user's own acceptance bar from the predecessor.
  - RU-07: concurrent first messages from two agents to the same new address (code-review RS-003) — produced in real use by parallel copies; covered by repository tests in three roots; a live attempt is opportunistic (LLM timing cannot be forced).
- Recorded `Technically Possible but Unsupported/Contrived` (not tested): P-001 (rename/unshare/delete then reuse a name mid-run).

## Changed Behavior Summary

| Behavior | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 list tool | Added | REQ-001/002 | live per runtime: absent unless selected; shape; parity with `@` |
| BEH-002 addresses | Changed (allocator replaced) | REQ-003 | live: twin definitions, re-list identical; repo `catalog-address-map.test.ts` |
| BEH-003 bring-in by message | Added | REQ-004/010 | live per runtime + three roots; failure; concurrency (repo) |
| BEH-004 catalog copies | Added | REQ-005 | live ×3 copies with `source`, restore |
| BEH-005 one unit | Changed (Org behavior) | REQ-007 | live Agent/Team/Org roots |
| BEH-006 anyone, all roots | Added | REQ-006/008 | live Team root (collaborator member, copy member) |
| BEH-007 wording | Changed | REQ-009 | repo pins/snapshots; live tool descriptions observed per runtime |
| BEH-008 UI | Changed (selectors) | REQ-011 | desktop instance: Agent, Team and Org roots |
| BEH-009 `@`, configured messaging, history | Preserved | AC-012 | rerun predecessor live suites + probe; desktop restore |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | resolver, map, admission queue, catalog delegation in 3 roots | unit tests per root (fakes for runtimes) | real runtime tool calls, real persistence/restore | Live API (server E2E, real runtimes) |
| API / transport / contract | Yes | MCP tool exposure, tool results, `source` DTOs, GraphQL views | unit (MCP provider, schema) | real MCP sessions on 5 runtimes | Live API |
| Frontend component / state | Yes | `agentSourceSelectors`, view indexes | web unit | rendered rows for Team/Org roots | Desktop instance |
| Browser integration / journey | Yes | rows, Team/Org tabs, "From" | render check (Agent root only) | Team and Org roots live | Desktop instance |
| Authentication / permissions | No (REQ-006: no new permission) | — | — | — | — |
| Desktop renderer | Yes | same as frontend | — | — | Desktop instance |
| Desktop shell | No | — | — | full restart path only | Desktop instance restart |
| Process / lifecycle | Yes | Stop/reopen/restore from `source` | unit restore tests | real runtime wake | Live API + desktop restart |
| Persisted-data transition | Yes | optional `source` | schema tests | old history opening | desktop/history + predecessor data |
| Worker / queue / coordination | Yes | per-root admission queue | 3 unit tests | live concurrency (timing) | Live, opportunistic |
| External integration | Yes | runtimes: AutoByteus/LM Studio, Codex, Claude, AGY, Grok | none live | all | Live API |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators`
- Stack: pnpm monorepo; Fastify/TypeScript server (Vitest), Nuxt/Electron web, contracts packages.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md` for the changed folders.
- Conflicts/unclear: none.
- Secrets: runtimes authenticate through their CLIs (Codex, Claude, AGY, Grok) and LM Studio is local; no vault import needed for the live server E2E (in-process server with temp data). Grok quota state to be checked.

| Instruction / Config | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | layers, rules | server tests via vitest; real-runtime E2E gated by env vars; isolated desktop instances for full product journeys; never touch the user's app |
| `autobyteus-server-ts/package.json`, `pnpm prepare:shared` | build prerequisites | shared SDK `dist/` must exist for server tests; removed afterwards (untracked) |
| `docs/isolated-app-instances.md` | desktop instances | `isolated-app start --build`, `restart`, `stop` |
| predecessor live test header | runtime gates | `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_AGY_E2E`, `RUN_GROK_E2E` |

| Component | Dir | Start | Notes | Ready | Stop |
| --- | --- | --- | --- | --- | --- |
| In-process server (live E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the test | temp app data dir | GraphQL reachable | `afterAll` closes and removes |
| Base worktree for baselines | `/tmp/aic-base` (detached `84224a58d`) | `git worktree add`, `pnpm install --offline` | owned | — | `git worktree remove` |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | own ports, temp data root | `start` result | `isolated-app stop <id>` |

| Data / Fixture | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent/team/org definitions | GraphQL create mutations with unique suffixes | test-owned data dir | deleted in `afterEach`; data dir removed |
| Public agent package (desktop) | Settings → Agent Packages import | isolated instance only | instance data root removed on stop |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration`.
- Representative existing data: task records without `source` (every pre-change record); predecessor collaborator entries with stored addresses.
- Evidence planned: repo `task-execution-source-schema.test.ts`; live restore of catalog copies (with `source`) and configured/collaborator copies (without); desktop restart opens runs unchanged.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (predecessor) | first-turn `delegate_task("/mention_helper")` before any mention starts nothing and returns "bring one in with @" | predecessor AC-014 vs REQ-005 | **Needs Update** | REQ-005: a listed catalog address now starts a copy; "bring one in with @" wording no longer exists in `src` | Change the first-turn step to an unknown address (not found, nothing created); keep the rest |
| same file, rest of journey and DI-001 case | `@` admission, briefing, reuse, extra copy, Stop/wake, collaborator Team handoff | AC-012, AC-007 | Still Valid | — | rerun |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | `@` UI journeys (A01–A05, T01, T02, O01, O02, F01, L01/L02, P01, N01) | AC-012 (`@` unchanged) | Still Valid (to verify by rerun) | — | rerun on Claude |
| `mixed-task-delegation.e2e.test.ts` (Org delegation lifecycle) | Org copies of mounted Team, wake | AC-012 delegated-copy lifecycle; REQ-007 | Still Valid (copy lead messages `/coordinator`, outside its team) | — | rerun (if runtimes allow) |
| Team inter-agent roundtrips (`claude-`, `codex-`, `agy-team-inter-agent-roundtrip`) | configured member messaging | AC-012 | Still Valid | — | rerun Claude (+ others opportunistically) |
| New/updated unit tests (21 server files, web spec, contracts) | per the implementation handoff | all | Still Valid | code review CRR-001 | run |

## Durable Coverage To Add

| Case ID | Behavior | Evidence | Path | Why Durable |
| --- | --- | --- | --- | --- |
| LE-A1 | AC-001/002/003/004/008/010, SC-001/005, RU-01/02/03 | REQ-001–004, 008, 010 | `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | the tool contract changed on every runtime; only live sessions prove MCP exposure and model-visible results |
| LE-A2 | AC-005/007/008, SC-002, RU-04 | REQ-005/007/008 | same file | catalog copies + one-unit resolution through real runtimes, restore from `source` |
| LE-T1 | Team root: AC-006/007/008 | REQ-006/007/008 | same file | Team-root resolution and admission on real runs |
| LE-O1 | Org root: SC-003, AC-007/008/012 (Org behavior change, configured handoffs) | REQ-007/008 | same file | the approved Org behavior change needs a real Org run |

## Durable Coverage To Update

| Case ID | Path | Update | Evidence |
| --- | --- | --- | --- |
| LE-P1 | `standalone-agent-collaborator-mention.e2e.test.ts` | first-turn step: `delegate_task` to an unknown address returns not found and starts nothing; header text | REQ-005, REQ-003 |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Dir | Proves | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prepare:shared` | worktree | build prerequisite | Pass | `/tmp/aic-prepare.log` |
| 2 | `npx vitest run tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,agent-run-collaboration,agent-tools,run-history,agent-execution,services/agent-streaming,startup} tests/integration/agent-team-execution tests/architecture` | server | affected units (all 21 changed files included) | Pass — 271 files pass; the 7 failing files (23 tests) fail identically on base | `api-e2e-evidence/repo-server-affected.clean.log` |
| 3 | same 7 files on base `84224a58d` | `/tmp/aic-base` | pre-existing? | Pass (pre-existing: same 23 failures) | summarized in the ledger |
| 4 | web `NUXT_TEST=true npx vitest run services/collaborators stores components/workspace` | web | selectors, stores, rows | Pass — 2 failures in `WorkspaceAgentRunsTreePanel.regressions.spec.ts`, identical on base | `api-e2e-evidence/repo-web-affected.log` |
| 5 | contracts `pnpm -C <pkg> test` ×3 | contracts | DTO `source`, note parser | Pass — 7/7, 5/5, 5+7 fail identical on base | `api-e2e-evidence/repo-<pkg>.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent live cases across five runtimes, long-running, interruption-prone.
- Path: `api-e2e-test-case-ledger.md`.

## Post-Repository Confidence Scorecard

| Category | Score | Supports | Uncertainty | Could improve |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | unit tests per root for every Guidance item | no runtime has run the tool or a catalog copy | live per runtime |
| Changed-boundary directness | 70% | resolver, map, admission tested with fakes | MCP exposure, real tool results, real member contexts | live sessions |
| Integration realism / mock gap | 65% | — | runtime adapters and model behavior mocked | live + desktop |
| Environment / fixture fidelity | 75% | temp stores | real package content (public agent package) | desktop with package |
| Failure / lifecycle / recovery | 80% | failure writes nothing; restore from `source` (unit) | real restart | desktop restart |
| User surface / desktop | 60% | render check (Agent root only) | Team and Org root UIs | desktop |
| Durable regression quality | 85% | requirement-aligned unit tests | no live coverage | new live file |

- Overall post-repository confidence: 73% (simple average); below target → broader validation `Required`.

## Broader Validation Decision

- Decision: `Required`.
- Modes: Live API (server E2E against real runtimes) for every runtime; Project Desktop Validation (isolated instance, public agent package) for Agent, Team and Org root UIs and full restart.
- Gap addressed: MCP exposure on AGY/ACP (never run live), real model-driven bring-in/delegation, Team/Org root UIs (unit-only), Org behavior change in a real Org run, restore.
- Expected confidence after: ≥95%.

## Desktop Application Validation Decision

- Shell: Electron (isolated instance from the worktree build).
- Web-equivalent behavior: rows, tabs, "From" labels (renderer).
- Shell-specific: full app restart (restore) only.
- Approach: `isolated-app start --build`; drive via CDP control port; user's app untouched.

## Live Environment And Fixture Plan

- Server live E2E: in-process server, temp data dir; definitions created per test with unique suffixes; runtimes gated by env vars; cleanup in `afterEach/afterAll`.
- Desktop: isolated instance, public package `https://github.com/AutoByteus/autobyteus-agents` imported, plus a PM definition with `list_available_agents`; evidence under `api-e2e-evidence/desktop/`; `isolated-app stop` at the end.

## Temporary Executable Validation Plan

| Case ID | Probe | Proves | Why not durable |
| --- | --- | --- | --- |
| DK-* | desktop driver script under `api-e2e-evidence/desktop/` | Team/Org/Agent root UI, restart | depends on an isolated desktop build and public package content |
| SC-004 live | LM Studio host change probe (if the live test cannot produce it portably) | failure reason reaches the agent, nothing added | needs a mutable local LM Studio setup |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| P-001 | Unsupported/Contrived | none | — |
| Live forced concurrency | LLM timing cannot be forced; repo tests in 3 roots | Low | opportunistic live observation |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-01 catalog Team copies get no handoff rules (all roots) | Local Fix (preliminary) | `le-claude-3.log`, `le-codex-2.log`; member-scope builders in three roots | implementation engineer via Code Reviewer failure-origin review |
| F-02 Team-root catalog copy rows show raw address names | Local Fix (preliminary) | `desktop/DT-04/05-*` | implementation engineer via Code Reviewer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Durable coverage: `Yes` (added `agent-initiated-collaborators.e2e.test.ts`; updated `standalone-agent-collaborator-mention.e2e.test.ts`)
- Post-repository confidence: 73%; after broader validation: 84% with failures F-01, F-02
- Broader validation: `Required` — executed (Grok and AutoByteus blocked by environment)
- Reroute required: `Yes` — `Fail`, focused failure-origin review by the Code Reviewer

## Round 2 Note (API-REV-002)

- Trigger: CRR-004 (IR-002 / SR-006). Scope: recheck F-01/F-02, the reviewer's focus list (catalog Agent copies get no scope; Team/Org configured, mounted, cross-placement and collaborator handoffs incl. Stop → reopen), and round-1 gaps (SC-004 live, forced concurrency, AGY exposure, browser probe).
- Coverage decisions: extend LE-A2/T1/O1 and add LE-F1 in the same durable file; instruction checks only on Claude (only runtime emitting `SYSTEM_INSTRUCTIONS_SUPPLIED`; the composer is shared and unit-pinned); SC-004 trigger = a model the runtime runs but the catalog does not offer.
- New finding: DI-01 (Design Impact) — Org task copies placed under the delegator's team rather than by address; agreed with the user as a design issue. Reroute: Code Reviewer failure-origin → Solution Designer.

## Round 3 Note (API-REV-003)

- Trigger: CRR-006 (IR-003 / SR-007: REQ-012 / AC-013 copy placement by address).
- Coverage decisions: placement asserted by stored path in all three roots (LE-A3 new; LE-T1/LE-O1 extended, also after reopen); stored old-rule copies proven with a temporary two-server probe (round-2 build → round-3 build on one data root); desktop placement and label checks with a temporary driver; AutoByteus runtime covered with DeepSeek (user-instructed; key into the test vault only).
- Result: Pass, 96%. Proportional test-code review requested.
