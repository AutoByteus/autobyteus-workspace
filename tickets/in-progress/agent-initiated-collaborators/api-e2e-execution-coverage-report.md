# API/E2E Execution Coverage Report — agent-initiated-collaborators

## Round 3 (API-REV-003) — authoritative

- Trigger: CRR-006 Pass (IR-003 / SR-007 / ARCH-REV-005: REQ-012 / AC-013 copy placement by address), branch `codex/agent-initiated-collaborators` @ `7ae1335c8` (implementation `e2c658e3d`).
- Evidence: `api-e2e-evidence/r3/` (live logs, old-placement reopen, desktop placement), `api-e2e-evidence/probes/old-placement-reopen.mjs` (+ `old-placement-reopen/report.json`), `api-e2e-evidence/desktop/desktop-placement.mjs`, `PL-01/02-*.png`, `desktop-placement-report.json`, `desktop-restart-state-r3.json`.
- Result: **Pass**, confidence 96%. AC-013 proven live in all three roots on four runtime paths (Claude, Codex, AGY, AutoByteus over DeepSeek), on the desktop and for stored old-rule data; every regression item passes.

### Prior failure resolution

| Prior | Resolution | Evidence |
| --- | --- | --- |
| DI-01 (Org copies placed under the delegator's team) → REQ-012 / AC-013 | **Resolved.** A mounted-team member's `/marketing_team` copy is stored at `rootOrg.taskExecutions[0]` and drawn at the Org top level; its teammate copy stays at `rootOrg.members[1].taskExecutions[0]`; same rule in standalone (`agentRoot.taskExecutions` vs `collaborators[0].taskExecutions`) and Team runs; delegator kept; "Started by solution designer" only in the accessible label | `r3/desktop-placement-stored-paths.txt`, `desktop/PL-01-placement-tree.png`, `desktop-placement-report.json`, `r3/le-claude.log` (A3, T1, O1), `r3/le-codex.log`, `r3/le-codex-a3.log`, `r3/le-agy.log` |

### Round-3 results

| Case | Claude | Codex | AGY | Notes |
| --- | --- | --- | --- | --- |
| LE-A1 discovery, bring-in, reuse, failures | Pass | Pass | (r2 Pass) | **AutoByteus over DeepSeek: Pass** — closes AC-001 for the AutoByteus runtime (local bound tool path) |
| LE-A2 three catalog copies (own scope, mate before report, no crossing, restore) | Pass | Pass | Pass | |
| **LE-A3 (new)** standalone: collaborator-team member's top-level copy at the root, teammate copy inside the team, kept after Stop | Pass | Pass | Pass | Codex first timed out with two back-to-back requests; test now sends them one at a time (both runtimes pass) |
| LE-T1 Team root + **placement** (collaborator member and copy member top-level copies at `task_executions`, teammate copy at `collaborators[i].task_executions`, kept after reopen) | Pass | Pass | — | |
| LE-O1 Org root + **placement** (mounted member's catalog copy at `rootOrg.taskExecutions`, teammate copy under the team, still reports to its delegator, kept after restore) | Pass | Pass | — | |
| LE-F1 SC-004 | Pass | — | — | |
| **AutoByteus runtime (DeepSeek `deepseek-v4-flash`)**: LE-A1, LE-A2, LE-A3, LE-T1, LE-O1 | — | — | — | **5/5 Pass** (`r3/le-deepseek.log`); `DEEPSEEK_API_KEY` read from the user's `~/.autobyteus/server-data/.env` (user-instructed) into the test process only and saved into the test vault by the repo helper after the setup's database reset; no evidence file contains the key |
| **Old stored copies (AC-013)** | Pass 8/8 | — | — | round-2 server (old rule) records copies under the team (Org) and inside the collaborator team (Agent root); the round-3 server opens them at the same paths, both answer, and a new copy by the same member goes to `rootOrg.taskExecutions` beside them |
| Desktop placement (Org + Agent root) | Pass | — | — | stored paths and tree as expected; "Started by" only in labels. Org row labels carry no "level N", so the Org level check uses the stored path and the tree drawing |
| Desktop full restart | Pass 6/6 | — | — | top-level copy stays at the top level and wakes from `source` |
| LE-P1 / BR-P1 predecessor suites | P1 Pass 2/2; BR-P1 11 Pass (O01 first timed out waiting for the Product Team coordinator's report — agent variance; `--cases O01,O02` rerun 2/2 Pass), 3 N/A | | | `r3/le-p1-claude.log`, `r3/browser-probe.log`, `r3/browser-probe-o01.log` |
| Repository suites | no new failures | | | identical to base (7 server files / 23 tests, 2 web tests) |

### Observations

- Grok: blocked again (first turn never went idle; same quota pattern as rounds 1–2, `r3/le-grok.log`). LM Studio off (not started; the AutoByteus runtime was covered with DeepSeek instead, at the user's request).
- Probe setup lessons (no product impact): the server only starts when `argv[1]` is its real path (`/tmp` is a symlink on macOS); the Claude CLI needs `USER`/`TMPDIR` in the server environment.

### Durable coverage changed (round 3)

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | `pathsOf`/`copyPath` helpers; LE-A3 added; placement assertions in LE-T1 and LE-O1 (also after reopen); LE-A3 sends its two delegations one at a time; AutoByteus-over-DeepSeek case (`RUN_DEEPSEEK_E2E=1` + `DEEPSEEK_API_KEY`, saved into the test vault with `initializeLiveRuntimeSecretVaultFromEnvironment`); runtime case `id`/`provider` fields |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | unchanged since round 1 |

### Confidence (round 3)

| Category | Score |
| --- | --- |
| Requirement / AC proof | 97% |
| Changed-boundary directness | 96% |
| Integration realism | 96% |
| Environment fidelity | 93% (four runtime paths live incl. AutoByteus/DeepSeek; Grok blocked by quota) |
| Failure / lifecycle / recovery | 97% (old data, Stop → reopen, restart, SC-004, race) |
| User surface / desktop | 95% |
| Durable regression quality | 96% |

- Overall: 96%. No applicable category below 90%. Residual: Grok/ACP live (quota); the ACP exposure path is the same Agent Tools MCP catalog verified on Claude, Codex and AGY.

### Cleanup (round 3)

Instance `iso-63049-8ec7` stopped; `/tmp/aic-r2old` worktree removed; probe and placement temp data removed; untracked shared `dist/` removed after the last run.

### Latest Authoritative Result

- Result: `Pass`
- Confidence: 96%
- Broader validation: `Required` — executed
- Test-code review: `Required` (Large / High) — proportional review of the durable test changes
- Next recipient: `/software_engineering_team/code_reviewer`

---

# Round 2 (API-REV-002) — superseded

- Trigger: CRR-004 Pass (IR-002 / SR-006 / ARCH-REV-004), branch `codex/agent-initiated-collaborators` @ `d651e10b8` (fix `9b594693b`).
- Evidence: `api-e2e-evidence/r2/` (live logs, browser probe) and `api-e2e-evidence/desktop/` (isolated instance `iso-59571`→`iso-51918-19a4`, round-2 files `desktop-report-r2.json`, `desktop-restart-state-r2.json`, `DT-02*`, `DT-06*`, `DO-05*`).
- Result: **Fail** — one Design Impact finding (DI-01), agreed as a design issue with the user. Every executed case passed. Confidence 93%.

### Prior failure resolution

| Prior | Resolution | Evidence |
| --- | --- | --- |
| F-01 catalog Team copies lack their own handoffs | **Resolved** — every catalog Team copy's `get_handoff_rules` names its own mate; the lead hands off to its mate before reporting; copy members get their own team instruction (Claude); restored copies keep their handoffs | `r2/le-claude.log` (A2, T1), `r2/le-claude-o1.log`, `r2/le-codex.log` (A2, T1, O1), `r2/le-agy-a2.log` |
| F-02 Team-root catalog copy rows show raw names | **Resolved** — "marketing team", "marketing content creator", "computer use operator"; no `_` names | `desktop/DT-02-team-copy-names.png`, `desktop-report-r2.json` |

### Round-2 results

| Case | Claude | Codex | AGY | Notes |
| --- | --- | --- | --- | --- |
| LE-A1 list / bring-in / reuse / failures create nothing | Pass | Pass | Pass | AGY/ACP exposure now verified live (AGY); Grok blocked |
| LE-A2 three catalog copies: own handoffs + instruction, mate before report, no crossing, restore | Pass | Pass | Pass | instruction check Claude-only (only Claude emits `SYSTEM_INSTRUCTIONS_SUPPLIED`) |
| LE-T1 Team root: configured scope; 2 catalog copies + brought-in instance apart; catalog Agent copies (root-level and from a copy member) get no handoffs/instruction; AC-006; **RS-003 forced race → one instance**; Stop → reopen scopes | Pass | Pass | — | race: both first messages returned the same run ID; one collaborator |
| LE-O1 Org root: Org placement, mounted and **cross-placement** handoffs + instructions; SC-003; Org catalog copy own scope; bring-in; Stop → restore scopes | Pass | Pass | — | reopen uses `restoreAgentOrgRun` as the app does |
| LE-F1 SC-004 live: run on a model the catalog does not offer → bring-in `COLLABORATOR_ADD_FAILED` with reason, catalog copy refused with reason, nothing added, no package | Pass | — | — | Claude full Haiku ID (catalog lists the alias); the round-1 Codex idea is invalid: the provider now rejects `gpt-5.4-mini` for the whole run |
| LE-P1 predecessor live suite | Pass 2/2 | — | — | |
| BR-P1 predecessor browser probe | 11 Pass, 3 N/A | — | L01, L02 Pass | F01 needs LM Studio (down) |
| Desktop D0/DA/DT/DTtab | Pass | — | — | tool picker; Agent root journey; Team root names (F-02) and Team tab |
| Desktop Org (server + tree labels) | Pass | — | — | names correct; **placement → DI-01** |
| Desktop full restart | Pass 6/6 | — | — | same collaborators/copies/`source`; copy wakes from `source` |
| Repository suites | no new failures | | | 7 server files / 23 tests and 2 web tests fail identically on base |

### DI-01 (Design Impact) — Org task copies are placed under the delegator's team, not by their address

- Observation (desktop Org run, Software Development Department): `/software_engineering_team/solution_designer` delegated `/marketing_team` (a catalog team). The copy is stored at `rootOrg.members[1].taskExecutions[0]` (inside the mounted Software Engineering Team) and the tree nests it under "software engineering team", although its address `/marketing_team` is Org-level, it is not an SE member, and it runs with Marketing Team's own scope. The same definition brought in by message sits at `rootOrg.collaborators[]`.
- Mechanism: the Org adapter hosts every copy in the delegator's host (`agent-org-execution/services/agent-org-task-execution-adapter.ts`: `host = index.requireAgent(delegator).host`), while the Team root already places a copy by its address (`TeamExecutionScopeResolver.resolveTargetOwner`: the team whose address is the target's parent, else the root).
- Expected (user-agreed): a copy is recorded at the level its address belongs to — `/marketing_team` in `rootOrg.taskExecutions[]` with `delegatorAgentRunId` = the solution designer ("Started by solution designer"); copies of real teammates stay inside the team. Side effect to decide: a mounted member's copy of another Org-level address (e.g. `/coordinator`) would also move to the Org level; stored runs keep their recorded placement.
- Evidence: `desktop/DO-05-org-rows-r2.png`; Org snapshot path `rootOrg.members[1].taskExecutions[0]` (recorded in the ledger); user conversation 2026-10-01.
- Classification: `Design Impact` (agreed with the user). Recommended owner: Solution Designer, via Code Reviewer failure-origin review. Expected size: small (one Org adapter rule, tests, design text).
- Coverage plan after the decision: LE-O1 gains a placement assertion (a mounted member's catalog copy is recorded at the Org level).

### Observations

- O-1 (carried) Codex defers MCP tools behind `tool_search`. O-2 (carried) AGY spills large MCP results to a file. O-5 only Claude emits `SYSTEM_INSTRUCTIONS_SUPPLIED`, so instruction checks run on Claude.
- Blocked by environment: Grok (`429 free-usage-exhausted`, `r2/le-grok.log`), AutoByteus/LM Studio (127.0.0.1:1234 not answering).

### Durable coverage changed (round 2)

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Round 2: unique team instructions; own-scope, mate-before-report and restored-scope checks in A2; rewritten LE-T1 (configured scope, catalog Agent copies, race, Stop → reopen) and LE-O1 (Org/mounted/cross-placement handoffs, catalog copy, restore); new LE-F1 (SC-004); Claude-only instruction checks |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | unchanged since round 1 |

### Confidence (round 2)

| Category | Score |
| --- | --- |
| Requirement / AC proof | 90% (all ACs executed and passing; DI-01 open) |
| Changed-boundary directness | 95% |
| Integration realism | 95% |
| Environment fidelity | 85% (Grok, LM Studio blocked) |
| Failure / lifecycle / recovery | 95% (SC-004, race, Stop → reopen, restart) |
| User surface / desktop | 90% (Org placement, DI-01) |
| Durable regression quality | 95% |

- Overall 92% → reported 93% after rounding the per-runtime breadth; result `Fail` because DI-01 is a user-agreed design issue.

### Cleanup (round 2)

Instance `iso-51918-19a4` stopped; untracked shared `dist/` removed; probe and desktop temp workspaces removed; no test processes left.

### Round 2 Result (superseded)

- Result: `Fail` (DI-01, Design Impact; all executed cases pass)
- Confidence: 93%
- Next recipient: `/software_engineering_team/code_reviewer` (failure-origin review → Solution Designer)

---

# Round 1 (API-REV-001) — superseded

## Execution Round Meta

- Round: 1 (API-REV-001)
- Trigger: CRR-001 Pass (code reviewer), branch `codex/agent-initiated-collaborators` @ `2dfbd1843` (implementation `549510977`), base `origin/personal` @ `84224a58d`
- Investigation: `api-e2e-coverage-investigation.md` (round 1)
- Ledger: `api-e2e-test-case-ledger.md`
- Evidence: `api-e2e-evidence/` (repo logs, live logs `le-*.log`, `probes/`, `desktop/`)
- Date: 2026-10-01

## Routing Classification

- Task size `Large`, architectural risk `High` (carried, unchanged); input route `Reviewed`.
- Result `Fail` → focused failure-origin review by the Code Reviewer.

## Investigation And Execution Basis

Requirements SR-005 (REQ-001–011, AC-001–012, SC-001–005), design SR-005 (BEH-001–009, DS-001–005), IR-001, CRR-001. Project guideline `TESTING.md`.

## Test-Case Ledger Reconciliation

| Case | Result |
| --- | --- |
| RC-01–04 repository + base comparison | Pass (no new failures; every failure also fails on base) |
| LE-A1 (Agent root: list, bring-in, reuse, failures) | **Pass** on Claude, Codex, AGY; Grok **Blocked** (quota); AutoByteus/LM Studio **Blocked** (LM Studio stopped answering) |
| LE-A2 (Agent root: 3 catalog copies, one unit, restore) | **Fail** on Claude and Codex (F-01); AGY run showed the same symptom (one copy skipped its mate) |
| LE-T1 (Team root) | **Fail** on Claude (F-01) |
| LE-O1 (Org root) | SC-003 mounted-copy, configured and outside messaging, Org bring-in: **Pass** (Claude, run `le-claude.log`); added catalog-copy check: **Fail** (F-01, `le-claude-3.log`) |
| LE-P1 predecessor live suite (updated) | **Pass** on Claude 2/2 |
| DK desktop (isolated instance, public package) | D0 Pass; DA Pass; DT server Pass / UI **F-02**; DO Pass (server + UI); restart Pass |
| BR-P1 predecessor browser probe | Not run this round (AC-012 `@` covered by LE-P1 and DA; rerun next round) |
| SC-004 live bring-in failure | Not run (LM Studio unavailable); repository tests cover it in three roots |

## Compatibility / Legacy Scope Check

- No compatibility wrappers or dual paths observed. The mention-note parser accepting the released guidance line is a history reader (C-06), not exercised as a write.
- Persisted data `Directly Usable — No Migration`: catalog copies' `source` persisted and read back unchanged across a full app restart; pre-change records without `source` keep working (predecessor live suite, restore of collaborator copies).

## Changed Boundary And Evidence Matrix

| Boundary / AC | Evidence | Result |
| --- | --- | --- |
| AC-001 opt-in tool (absent unless selected) | LE-A1 plain run on Claude, Codex, AGY: no successful `list_available_agents`; desktop tool picker shows it on the PM (`desktop/D0-tool-picker.png`) | Pass |
| AC-001 works per runtime | Claude, Codex (via `tool_search`, O-1), AGY (O-2) | Pass (Grok, AutoByteus blocked) |
| AC-002 shape, `@` parity, no in-run flag, in-run address | LE-A1: keys exactly `name/kind/address/description`; set equals `collaboratorMentionCandidates`; re-list after bring-in identical | Pass |
| AC-003 distinct hashed addresses; identical re-list; unknown → not found | LE-A1 twins `/<seg>_<sha256[:6]>`; probe `probes/list-tool-output-agy*.json` | Pass |
| AC-004 bring-in, same run IDs, failures create nothing, run ID unknown | LE-A1 (collaborator added by the PM with the run's settings, delivered, second message same run ID; unknown address/run ID create nothing, no package) | Pass |
| AC-004 concurrent first messages → one instance | repository tests (three roots) | Pass (repo only) |
| AC-005 catalog copies with `source`, no collaborator | LE-A2 (Claude, Codex), LE-T1, desktop DA/DT/DO | Pass |
| **AC-005/AC-007/UC-004/SC-002 copies follow their own handoffs** | `get_handoff_rules` in every catalog copy returns `{"handoffs":[]}` although `source.handoffs` has the rule | **Fail (F-01)** |
| AC-007 resolution inside the sender's instance; copies never cross | LE-O1 (Org copy of a mounted Team reaches its own mate, not the mounted one); AGY LE-A2 (copies that knew the address reached their own mate, no crossing) | Pass (partial in Agent/Team roots — the full no-crossing journeys stop at F-01) |
| AC-006 collaborator member / copy member bring in or delegate | LE-T1 steps after F-01 not reached | Not proven this round |
| AC-008 three roots; package on first bring-in/copy; list writes nothing | LE-A1/LE-A2 package checks; Team/Org bring-in and copies live and on desktop | Pass |
| AC-009 wording | repository pins/snapshots; models on four runtimes used the tools as described | Pass |
| AC-010 `@` and bring-in reuse one instance (both orders) | LE-A1; desktop DA (`@` no longer offers the brought-in team) | Pass |
| AC-011 UI rows / tabs / "From" | desktop: Agent root (rows, "From Project Manager:", Team tab), Org root (names, "Started by solution designer", "From Software Tutorial Video Maker:"); **Team root catalog copy shows raw address names** | **Fail (F-02)** |
| AC-012 preserved `@`, configured messaging, Org configured handoffs, history | LE-P1 2/2; LE-O1 mounted lead → mounted mate; desktop restart | Pass |
| Restore of catalog copies | desktop full restart: same collaborators, copies and `source`; a copy coordinator woke from its `source` and answered | Pass |

## Additional Repository Coverage Execution

| Command | Result | Evidence |
| --- | --- | --- |
| affected server suites (281 files) | 271 pass; 7 files / 23 tests fail — identical on base `84224a58d` | `repo-server-affected.clean.log` |
| web `services/collaborators stores components/workspace` | 1156 pass; 2 fail in `WorkspaceAgentRunsTreePanel.regressions.spec.ts` — identical on base | `repo-web-affected.log` |
| contracts ×3 | 7/7, 5/5, 5 pass + 7 fail (identical on base) | `repo-autobyteus-*.log` |

## Validation Confidence Scorecard (Mandatory)

| Category | Score | Basis |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | AC-005/007 (SC-002/UC-004) fail; AC-011 fails for Team root; AC-006 not reached |
| Changed-boundary execution directness | 90% | real runtimes, real MCP sessions, real persistence, desktop app |
| Cross-boundary integration realism | 90% | public package on desktop; three runtimes live |
| Environment, configuration, fixture fidelity | 80% | Grok quota and LM Studio outage block two runtimes |
| Failure, edge-case, lifecycle, recovery | 85% | failures create nothing; restart restore proven; live concurrency not forced |
| User-surface and desktop-shell | 80% | Agent and Org roots good; Team root raw names (F-02) |
| Durable regression coverage quality | 90% | new live file covers every AC per root; predecessor test updated |

- Overall: 84%. Critical acceptance criteria failing: SC-002 / AC-005 / AC-007 (F-01). Default target not met.

## Broader Validation Decision And Execution

- `Required` — executed: Live API (server E2E on Claude, Codex, AGY; Grok blocked by quota; AutoByteus blocked by LM Studio), Project Desktop Validation (isolated instance `iso-59571-7ba1`, public agent package, Claude `haiku`), probes.

## Desktop Application Validation

| Phase | Result | Evidence (`api-e2e-evidence/desktop/`) |
| --- | --- | --- |
| D0 import public package; PM with `list_available_agents`; tool picker | Pass | `D0-*.png` |
| DA Agent root: PM lists, brings in Software Engineering Team by message, delegates two Product Team copies | Pass (8 checks) | `DA-*.png` |
| DT Team root: solution designer brings in Product Prototyper and delegates a Marketing Team copy | server Pass; UI F-02 | `DT-01-team-rows.png`, `DT-04/05-team-copy-row*.png` |
| DO Org root (Software Development Department): solution designer brings in Software Tutorial Video Maker and delegates a Marketing Team copy | Pass (server + UI names) | `DO-03-org-run-tree.png`, `DO-04-org-new-rows.png`, `desktop-org-report.json` |
| Full restart (`isolated-app restart`) | Pass (6 checks) | `desktop-restart-state.json` |

Effect on the user's running AutoByteus: none.

## Platform / Runtime Targets

macOS 25.5 arm64; Node 22; Claude Agent SDK `haiku`, Codex CLI 0.159.3 `gpt-5.5`, AGY 1.2.14 `gemini-3.8-flash-low`, Grok 1.0.46 (quota-blocked), LM Studio (unreachable during the session).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Full desktop restart with agent-initiated collaborators and catalog copies: unchanged trees and `source`; wake from `source` works.
- LE-A2's server-side restore step is not reached because F-01 fails first.

## Durable Coverage Changed In The Codebase

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Added (LE-A1, LE-A2, LE-T1, LE-O1; gated per runtime; root cases for `AIC_ROOT_RUNTIMES`) | AC-001–012 | A1 Pass ×3 runtimes; A2/T1/O1 fail on F-01 |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Updated: first-turn `delegate_task` to an unknown address (REQ-005 makes a listed catalog address start a copy) | AC-014 (predecessor), REQ-003/005 | Pass (Claude) |

## Other Execution Artifacts

| Artifact | Purpose |
| --- | --- |
| `api-e2e-evidence/le-*.log` | live runs per runtime |
| `api-e2e-evidence/probes/*` | Codex tool visibility, AGY list output |
| `api-e2e-evidence/desktop/*` | desktop drivers, screenshots, reports |

## Temporary Execution Methods / Scaffolding

| Method | Why | Cleanup |
| --- | --- | --- |
| `/tmp/aic-base` (detached base worktree) | baseline comparison | removed |
| probes on the isolated instance | runtime behavior questions | definitions deleted; temp workspaces removed |
| desktop drivers | UI journeys and restart | instance stopped (`isolated-app stop iso-59571-7ba1`) |

## Dependencies Mocked Or Emulated

None (all live).

## Result Summary

### Failures

- **F-01 (High) — catalog Team copies do not get their own handoff rules (all three roots).** A copy started by `delegate_task(<catalog team address>)` persists `source.handoffs` correctly, but its members' `get_handoff_rules` returns `{"handoffs":[]}`. Copies therefore cannot "work through their own handoffs" (SC-002, UC-004, AC-005/007). Real impact: the public package's Product Team copy (handoffs product_prototyper ↔ prototype_bootstrapper) would not follow its handoffs either.
  - Evidence: `le-claude-3.log` (Agent root LE-A2, Team root LE-T1, Org root LE-O1 catalog copy: all `{"handoffs":[]}` while `source.handoffs` = `[{"from":"/aic_squad_…/lead","to":"/aic_squad_…/mate",…}]`); `le-codex-2.log` (same on Codex); `le-claude-2.log` (lead tool calls: `get_handoff_rules` → `[]`, then straight to the PM); `le-agy.log` (one copy skipped its mate).
  - Where (code reading): member-context scope is derived only from configured placements or a **collaborator** entry, never from a catalog copy's `source`: Agent root `agent-run-collaboration/services/agent-run-collaboration-root-builder.ts` `buildChildContext`/`collaboratorOf`; Team root `agent-team-execution/services/member-team-context-builder.ts` `collaboratorMemberScope`; Org root `agent-org-execution/services/agent-org-execution-scope-builder.ts` `agentOrgHandoffs`. The authored team instruction (`authoredEnclosingScopeInstruction`) is likely missing for the same reason (not separately verified).
  - Address resolution itself works (Org copy reaches its own mate; AGY copies that knew the address stayed inside).
- **F-02 (Medium, UI) — Team-root catalog copy rows show raw address names.** In a Team run, the catalog copy row reads `marketing_team` with members `marketing_content_creator`, `computer_use_operator`, while the same tree shows agent-initiated collaborators by name ("product prototyper") and the Agent and Org roots show catalog copies by name ("product team", "marketing team", "marketing content creator"). AC-011 / predecessor VIS conventions (the predecessor fixed the same symptom for collaborators as F-03).
  - Evidence: `desktop/DT-04-team-copy-row.png`, `desktop/DT-05-team-copy-row-clicked.png` (aria-label "Temporary task team, marketing_team, level 1, offline, Started by solution_designer, /marketing_team"); compare `desktop/DO-04-org-new-rows.png`.

### Observations (not failures)

- O-1 Codex CLI 0.159 defers MCP tools behind `tool_search`; none of the Agent Tools is listed up front, with or without `list_available_agents` (`probes/codex-tool-visibility.out`). A model that does not search reports "delegate_task isn't available". Pre-existing runtime behavior; the live test tells Codex to use `tool_search`.
- O-2 AGY saves large MCP results to a file; the stream event then has `output: null` (the tool card shows no output) and the model reads the file with `view_file` (`probes/list-tool-output-agy-exact-args.json`). Pre-existing AGY behavior.
- O-3 The new-chat `@` target list offers agents and teams but not Orgs (Orgs start from the Orgs page). Pre-existing, out of scope.
- O-4 In an Org that mounts a team containing Product Prototyper, `/product_prototyper` is not a catalog address (the definition is in the run; AR-002 lists it at its in-run address). As designed.

### Blocked / Not Tested

- Grok/ACP: `429 subscription:free-usage-exhausted` (`le-grok.log`).
- AutoByteus/LM Studio: LM Studio at `127.0.0.1:1234` stopped answering during the session (`le-lmstudio.log`); not restarted (user's app).
- SC-004 live failure, BR-P1 browser probe, live forced concurrency: next round.

## Cleanup Performed

| Resource | Action |
| --- | --- |
| isolated instance `iso-59571-7ba1` and data root | `isolated-app stop` (no instance of this worktree left running) |
| `/tmp/aic-base` worktree | `git worktree remove --force` |
| untracked shared `dist/` from `pnpm prepare:shared` | removed |
| probe temp workspaces (`aic-probe-ws-*`, `aic-desktop-org-ws-*`) | removed |
| live-test servers and data dirs | removed by the tests' `afterAll` |

## Preliminary Classification

- F-01: `Local Fix` (implementation) — the design already specifies preparing a catalog copy from its `source` (including handoffs, DS-003); the member-context scope builders in the three roots omit it. Recommended owner: implementation engineer, via Code Reviewer failure-origin review.
- F-02: `Local Fix` (implementation, web Team-root tree selectors for catalog copies).

## Round 1 Result (superseded)

- Result: `Fail`
- Confidence: 84%
- Failing cases / AC: LE-A2, LE-T1, LE-O1 (catalog copy) — SC-002, UC-004, AC-005, AC-007 (F-01); DT — AC-011 (F-02)
- Broader validation: `Required` — executed (Grok, AutoByteus blocked by environment)
- Next recipient: `/software_engineering_team/code_reviewer` (failure-origin review)
