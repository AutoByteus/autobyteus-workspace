# API/E2E Execution Coverage Report — `agent-package-auto-refresh`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-008)
- Supplemental Task Artifacts: `probes/`, `implementation-evidence/` (evidence only)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md` (CRR-004 Pass, round 4)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-004 Pass (IR-003 `bd4c63796`: SR-008/DSN-004 resolves CR-004 = APE-001); the review flagged that the durable E2E was stale after the `catalogIssues` contract change
- Prior Round Reviewed: 1 (API-REV-001, Fail — APE-001)
- Latest Authoritative Round: 2
- Code under test: branch `codex/agent-package-auto-refresh`. Round 2: product at `214836c83` (IR-003 `bd4c63796`); test commits `6b3a10822` (baseline fix), `a28465175` (new E2E + fixture route) and round 2's `33d290187` (SR-008 contract update + DCF-E2E-009). No product source changed by API/E2E.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`, requested now (round 2 passes) for `6b3a10822`, `a28465175` and `33d290187`.

## Round 2 (API-REV-002) Summary

- **Prior failure first:** APE-001 was rechecked live and is **resolved**. On the desktop, the broken team-local `validator` showed "Using last working version (1)" on the owning Team card at 1,344 ms, with the name, file and reason; it cleared 1,046 ms after the fix. The org-owned case (new DESK-006) showed the Org card listing the org-owned agent → org-owned Team → its local agent in path order at 983–1,302 ms, cleared after restore at 1,088 ms, and the Org never became unavailable.
- **Durable E2E updated** (`33d290187`, stale after the SR-008 contract per CRR-004):
  - Teams and Orgs are now queried with `catalogIssues`.
  - DCF-E2E-002 asserts the nested Team issue.
  - New DCF-E2E-009 covers the org-owned kinds.
  - DCF-E2E-007: AC-016 is asserted on the first-written agent, and the Team must be listed within 5 s.
- **Result:** 9/9 in 3 consecutive gated runs; ungated 7 pass, 2 skipped.
- **DCF-E2E-007 run-1 miss, investigated:** right after the 300 ms pause the tool listed the new agent but not the new Team, and nothing had been published. `settle()` flushes every pending unit (code read), so the Team folder had not been detected yet.
  - 11/11 reruns of the full suite then passed with the probe active and never hitting the condition.
  - The built-monitor probe measured Team-folder detection at 5–23 ms over 40 trials, none above 300 ms.
  - Conclusion: a rare slow detection under machine load. That is outside REQ-018 (which covers detected changes) and inside the QR-003 5 s bound.
- **Baselines (product changed in IR-003):**
  - server typecheck: clean;
  - server unit: 674 files;
  - integration: 72 files, with only the 2 documented `agent-status-websocket` cases failing;
  - web `test:nuxt`: 600 files / 4157 tests.
- **Desktop regressions:**
  - shared agent badge "(1)" with file and reason, visible at 865 ms and cleared after the fix;
  - "Some members couldn't be loaded (1) · No working version" for a new invalid team-local folder, also in the list notice, cleared after removal;
  - live Team add at 1,010 ms and removal at 1,119 ms;
  - no renderer reload throughout.
- **Not rerun in round 2** (IR-003 touches only the Team/Org issue projection, cards, badge and store issue mapping): the real-model SCN-012 journey, reconnect, the Settings row, the second client and idle CPU. Their round-1 evidence stands.

| Case ID | Round-2 Result | Evidence |
| --- | --- | --- |
| DCF-E2E-001…009 | Pass ×3 | `api-e2e-evidence/round2/dcf-e2e-final-{1,2,3}.log`, `round2/dcf-final-*/definition-catalog-live-refresh.json`, `round2/dcf-e2e-ungated.log` |
| REPO-002…005 | Pass (baseline) | `api-e2e-evidence/round2/{typecheck,server-unit,server-integration,web-nuxt}.log` |
| DESK-002 (nested, APE-001) | Pass | `round2/desktop/desktop-round2-receipt.json`, `r2-d01-team-card-nested-badge.png` |
| DESK-006 (org-owned, new) | Pass | receipt, `r2-d02-org-card-nested-badge.png` |
| DESK-007 (unusable nested member, new), DESK-002 shared, DESK-001 live Team list | Pass | receipt, `r2-d03-team-card-unusable-member.png` |

Round-1 sections below are carried forward. Where they say `Fail` or APE-001 is open, round 2 supersedes them; see the Latest Authoritative Result.

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. One material deviation: the planned DESK-002 "badge on a broken nested agent" check found the gap reported as APE-001.
- Existing coverage decisions revised during execution: `agent-packages-graphql.e2e` moved from "Out Of Scope (pre-existing)" to "Needs Update". The cause was a test-side wiring gap on the package surfaces this ticket changed, and it was fixed as a baseline commit under TESTING.md Rule 9.
- Reroute required before or during execution: `Yes`, after execution (APE-001).

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (DCF-E2E-007 probe; desktop journey)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 22 (cleanup)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-001 | Pass | 1 | console | — |
| REPO-002 | Pass | 2 | console | — |
| REPO-003 | Pass | 4 | `api-e2e-evidence/server-unit.log` | 673 files pass |
| REPO-004 | Pass (baseline) | 11 | `api-e2e-evidence/server-integration.log` | only the 2 documented `agent-status-websocket` cases fail |
| REPO-005 | Pass | 12 | `api-e2e-evidence/web-nuxt.log` | 599 files / 4149 tests |
| DCF-E2E-001…008 | Pass | 8 | `api-e2e-evidence/dcf-e2e-gated-final-{1,2,3}.log`, `dcf-gated-final-*/definition-catalog-live-refresh.json` | 3 consecutive runs, 8/8 |
| REG-001 | Pass (no regression) | 13 | `api-e2e-evidence/reg-sibling-e2e.log`, `reg-agent-packages-graphql-fixed.log` | 1 base failure fixed; 2 base failures reported to owners |
| REG-002 | Pass | 14 | `api-e2e-evidence/reg-agy-fixture-coexistence.log` | — |
| MEAS-001 | Pass | 10, 20 | `api-e2e-evidence/apar-macos-watch-probe-output.json`; desktop receipt | — |
| DESK-001 | Pass | 17 | `api-e2e-evidence/desktop/desktop-journey-receipt.json` | — |
| DESK-002 | **Fail** (nested part); Pass (shared agent badge) | 16 | receipt; `desktop/d02-*.png`, `d03-*.png` | APE-001 |
| DESK-003 | Pass | 19 | receipt | — |
| DESK-004 | Pass | 18 | receipt | — |
| DESK-005 | Pass | 18 | receipt; `desktop/d07-folder-not-found.png` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the fresh path, cache providers and `definitionAdmissionDiagnostics` are gone. DCF-E2E-006 also shows that admission and the catalog agree on duplicates.)
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`. An imported real package and existing runs work through the current readers.)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used for compatibility: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | AC-001…007, 011, 012, 015, 016; DSN-003; CR-001 | catalog, sync, readers, monitor (in-process) | Vitest | Durable | Pass | console |
| DCF-E2E-001 | QR-006, REQ-005 | `/ws/definition-catalog` + remote-access auth | real Studio HTTP/WS; real pairing REST | Durable | Pass | loopback `connected`, no replay, broadcast; invalid `mra_` → 4401 identical to `/ws/projects`; paired phone receives frames; revoked → 4403 `REMOTE_ACCESS_DEVICE_REVOKED` |
| DCF-E2E-002 | AC-001…005, AC-007, REQ-009, REQ-014, DSN-003 | GraphQL lists, `catalogIssue`, `definitionDiagnostics`, feed | real Studio + real `importAgentPackage` | Durable | Pass | create visible 77 ms, edit 8 ms, fix 59 ms, delete 9 ms; nested issue `usingLastGood` via GraphQL; skill edits → 0 frames |
| DCF-E2E-003 | AC-011, AC-012, REQ-015 | monitor root state via `AgentPackage.autoRefresh` | real Studio | Durable | Pass | ROOT_MISSING 26 ms, WATCHING 64 ms; removal → no frames |
| DCF-E2E-004 | AC-013, REQ-017 | refresh mutations → other client | real Studio | Durable | Pass | four Reload paths publish all four subjects |
| DCF-E2E-005 | AC-009, REQ-013, DSN-001 | GitHub Check/Update → other client; re-arm | real Studio + controlled GitHub HTTP | Durable | Pass | Check: `UPDATE_AVAILABLE`, no download; Update: frame on the other client, list updated, WATCHING |
| DCF-E2E-006 | DSN-002 | readers/admission duplicate rule | real Studio (+ tool in 007) | Durable | Pass | `DEFINITION_IDENTITY_DUPLICATED` lists both paths; not in Team list nor `list_available_agents` |
| DCF-E2E-007 | SCN-012, AC-015, AC-016, REQ-018 | real `list_available_agents` / `delegate_task` → spawned copies | real HTTP/WS/scoped MCP; scripted AGY | Durable | Pass | inside the settle window (no frame yet) the tool lists the new agent and Team; copies receive current prompts; Team copy members lead/mate → chief/scout; earlier copy keeps V1; deleted → `delegated:false` |
| DCF-E2E-008 | AC-008, REQ-012, DEC-003 | run continuity | real HTTP/WS; scripted AGY | Durable | Pass | active run keeps V1 after edit, no relaunch (6 = 6); new run V2; active run answers after removal; restore → `AGY_AGENT_DEFINITION_MISSING: apar-steady` (base error) |
| REG-001/002 | regression | sibling definition/package/skills E2E; AGY fixture routes | Vitest E2E | Durable | Pass | see Result Summary |
| MEAS-001 | AC-014, QR-001, QR-002 | watch set, idle CPU | built monitor probe (macOS); desktop embedded server | Temporary + Desktop | Pass | 604 handles (Linux: 603 inotify), 0 under skills/.git/node_modules; probe idle 0.079 %; desktop server 0.05 % over 60 s |
| DESK-001 | SCN-012, AC-001, 002, 003, 015; REQ-005 | full product: Project Task Manager → Agent Package Creator (real Codex) → files → catalog → UI, `@`, delegation, Codex launch | isolated desktop instance | Desktop | Pass | card visible 1.13 s after the creator's write; deleted card gone 1.29 s; `@` menus current; Codex copies V1 → V2; Team copy members poet/researcher → lead/analyst; deleted agent refused |
| DESK-002 | AC-004, REQ-007, REQ-009, DSN-003 | badge rendering | isolated desktop | Desktop | **Fail** (nested) / Pass (shared) | shared: badge 691 ms with file and reason, cleared 683 ms; **nested team-local: no indicator anywhere in the UI** (APE-001) |
| DESK-003 | AC-009/AC-013 (second client), REQ-005 | frame → renderer store reload | isolated desktop + second GraphQL client | Desktop | Pass | another client's new agent visible in 449 ms, no reload |
| DESK-004 | AC-010, REQ-006 | reconnect → `connected` → re-read | isolated desktop, real "Restart server" button | Desktop | Pass | agent written while the backend was down is shown after reconnect (the store never refetches on mount) |
| DESK-005 | AC-012, REQ-015, DEC-005 | Settings package row | isolated desktop | Desktop | Pass | "Folder not found — Its definitions keep their last loaded version…" 818 ms; 37 definitions kept with `DEFINITION_SOURCE_MISSING`; "Auto-refreshing" 717 ms after restore |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts --no-watch` (×3) | worktree root | DCF-E2E-001…008 | Pass | `api-e2e-evidence/dcf-e2e-gated-final-{1,2,3}.log` |
| 2 | `env -u … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions tests/e2e/agent-team-definitions tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts --no-watch` | worktree root | REG-001 | Pass (no regression) | `api-e2e-evidence/reg-sibling-e2e.log` |
| 3 | `env -u … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts --no-watch` | after baseline fix | Update/rollback semantics preserved | Pass 8/8 | `api-e2e-evidence/reg-agent-packages-graphql-fixed.log` |
| 4 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | worktree root | fixture coexistence | Pass 24/24 | `api-e2e-evidence/reg-agy-fixture-coexistence.log` |

## Validation Confidence Scorecard (Mandatory)

### Round 2 (authoritative)

| Confidence Category | Post-Repository Score (round 2) | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | +4 | every AC directly proven; REQ-009 now rendered for shared, team-local and org-owned nodes (DESK-002/006/007) plus API (DCF-E2E-002/009) | — |
| Changed-boundary execution directness | 94% | 96% | +2 | real `catalogIssues` resolvers and live cards | — |
| Cross-boundary integration realism and mock gap | 93% | 95% | +2 | round-1 real-model journey plus round-2 live rechecks | GitHub Update only against controlled HTTP |
| Environment, configuration, identity, and fixture fidelity | 94% | 95% | +1 | packaged worktree builds; copies of the user's real packages and org | Linux evidence comes from the container probe only |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 94% | +1 | nested and org-owned break/fix, unusable member, missing root, restart | unreadable root not run on Linux |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | +15 | all badge variants and live lists rendered in the packaged app | second physical window not used (frame broadcast proven at the wire) |
| Durable regression coverage quality and relevance | 94% | 95% | +1 | 9-case wire E2E stable ×3 (+11 probe reruns); baseline fix | no durable desktop/browser probe for live lists |

- Overall round-2 post-repository confidence: 91%
- Overall final confidence (round 2): **95%** (simple average 95.1%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Linux runs only by probe; GitHub Update against controlled HTTP; rare slow folder detection under load (REQ-018 scope, QR-003 bound).

### Round 1 (superseded)


| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 85% | −3 | All AC-001…016 exercised. Every other AC is directly proven at the wire and on the desktop. | REQ-009 is not met for nested definitions (APE-001), and nested definitions are most of the user's agents |
| Changed-boundary execution directness | 92% | 96% | +4 | real websocket/auth, real tools and runtimes (AGY scripted, Codex real), real renderer | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | +7 | real model-driven Agent Package Creator writing files; real Codex launches; real restart | GitHub Update only against controlled HTTP |
| Environment, configuration, identity, and fixture fidelity | 90% | 94% | +4 | copies of the user's two real packages; packaged worktree build; real pairing credential | Linux evidence comes only from the container probe; skill sources were not registered in the instance (not watched by construction) |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 93% | +3 | broken/fix, missing/restored root, removal, restart/reconnect, watch failure, unreadable root (integration), Update rollback (baseline-fixed suite) | unreadable root on Linux not run |
| User-surface, browser, and desktop-shell confidence | 70% | 72% | +2 | live lists, badge, `@`, Settings row, reconnect proven on desktop | no web surface shows a nested definition's last-good issue (APE-001) |
| Durable regression coverage quality and relevance | 88% | 93% | +5 | new 8-case wire E2E (stable ×3); baseline fix restores Update/rollback coverage | no durable browser/desktop probe for live lists (manual desktop journey only) |

- Overall post-repository confidence: 87%
- Overall final confidence: 90% (simple average 89.7%)
- Calculation method: simple average of the seven categories, with every category reported separately
- Confidence change produced by broader validation: +3 overall. The desktop journey closed SCN-012, AC-009/010/013/014 and the Settings states, and surfaced APE-001.
- Every critical acceptance criterion directly proven: `No`. REQ-009 (High) is unmet for nested definitions; the critical AC-004 passes for shared definitions.
- Any final applicable category below `90%`: `Yes` — Requirement and AC proof (85%), User-surface (72%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: APE-001; Linux runs only by probe.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — `Project Desktop Validation` (isolated instance from a worktree build), plus a second client on the same node.
- Material deviation from the planned mode or rationale: the second client was a GraphQL client on the node, not a second browser window. The server E2E already proves cross-client frame broadcast (DCF-E2E-001/004/005), and the desktop proves frame → renderer reload. The GitHub Update ran only in the server E2E with controlled GitHub HTTP; there is no public test repository.
- Confidence gap actually addressed: the real SCN-012 journey with the real Project Task Manager and Agent Package Creator on Codex; live renderer lists; `@` menus; badge; Settings row; reconnect after a real server restart; idle CPU.
- Startup order and commands: `pnpm --silent isolated-app start --build` (instance `iso-53228-c43b`, backend 53229, control 53228), driven with browser-automation in attach-only mode; packages imported through Settings → Agent Packages.
- Environment choices that materially affected the run: the user's `autobyteus-agents` and `autobyteus-private-agents` were copied to `/tmp/apar-desk/run-9dys/` (without `.git`, tickets and task-plans); Codex App Server with GPT-6.1-Sol (low), using the local logged-in Codex CLI.
- Seed data and fixtures: the package copies only; all agents and Teams created during the run were written by the real Agent Package Creator or by me on disk (editor scenario).

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Import two packages via Settings | rows show watch state | both "Auto-refreshing" | receipt | Pass |
| Editor writes a new agent while the Agents page is open | card appears ≤ 5 s, no reload | 1,048 ms; marker kept | receipt | Pass |
| Broken `agent-config.json` → fix | badge with file and reason; clears | 691 ms; "Invalid JSON: Unexpected end of JSON input"; cleared 683 ms | `d02-agent-badge*.png` | Pass |
| Broken team-local agent `evidence-driven-delivery-team/validator` | Team usable; visible badge naming file and reason | Team listed and usable; backend diagnostic `usingLastGood:true`; **no indicator on the Agents page, Teams list or Team detail** | `d03-nested-*.png`; receipt | **Fail** |
| Project Task Manager → Agent Package Creator creates an agent and a Team | listed live; delegable; Codex copy uses its instructions | card 1.13 s after the write; Teams page lists it; `list_available_agents` lists both; Codex copy's system instruction `MARK_POET_V1`, reply signed V1; Team copy members poet/researcher | receipt | Pass |
| Creator edits the agent (V2) and the Team (lead/analyst + handoff) and deletes an agent | next delegation uses current definitions; deleted is gone | deleted card gone in 1.29 s; list without it; refusal `delegated:false`; new copies V2; Team copy lead/analyst; old copy keeps V1 | receipt | Pass |
| `@` in the live run and in a new chat | current candidates | both show Poet and Duo; the deleted agent is absent | `d06-at-menu.png` | Pass |
| Restart server (real button) and write while down | after reconnect, loaded lists current | new agent shown; the store does not refetch on mount, so the reload came from the reconnect | receipt | Pass |
| Rename package away / back | Settings row error and recovery; definitions kept | 818 ms / 717 ms; 37 kept with issue, 0 after restore | `d07-folder-not-found.png` | Pass |
| Another client creates an agent | desktop list updates | 449 ms | receipt | Pass |
| Idle | near-zero CPU | 0.05 % over 60 s | receipt | Pass |

## Desktop Application Validation

- Validation approach executed: as planned (isolated instance, owned data root, never the user's app or data).
- Web-equivalent behavior and evidence: renderer stores, feed, badge, notice, Settings row, `@`, all in the packaged renderer.
- Shell-specific or lifecycle behavior and evidence: the embedded server started with the monitor and was restarted by the shell's Restart control; the feed reconnected.
- Effect on any already-running desktop application: `None`. Another engineer's isolated instance (`iso-63369-6c20`) was left untouched.
- Behavior not directly proven: GitHub Update against the real GitHub (controlled in E2E); two physical windows (second client was GraphQL).

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5, arm64); Linux evidence from the implementer's container probe only.
- Runtime and framework versions: Node v22.21/22.23; Electron packaged build AutoByteus_enterprise 1.5.1-beta.1 from this worktree; Codex CLI 0.162.1.
- Browser / engine: Electron Chromium (packaged).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: copies of the user's real packages (461 definition-tree dirs, nested Teams/Orgs) through the normal current readers.
- Direct-use result and evidence: imported and listed with correct counts; catalog rebuilt from disk after the server restart.
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` | Added (commit `a28465175`) | DCF-E2E-001…008: QR-006, AC-001…009, 011…013, 015, 016, DSN-002/003, REQ-012/014/015/017/018 | 8/8 pass ×3 (gated); 6/6 ungated |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (commit `a28465175`): read-only `READ_AGENT_PROMPT` route | supports DCF-E2E-007/008 | coexistence suites 24/24 |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Updated — **baseline fix** (commit `6b3a10822`): service `githubClient` uses the same controlled upstream as the installer | REQ-013 / preserved Update and rollback semantics (failed base since c6c4afbf4: live GitHub reached) | 8/8 pass (3 previously failing) |
| `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` | Updated round 2 (commit `33d290187`): `catalogIssues` for Teams/Orgs (SR-008), nested Team assertion, new DCF-E2E-009 (org-owned), robust AC-016/AC-015 step | SR-008, DSN-003/004, REQ-007/009, REQ-018, AC-015/016 | 9/9 pass ×3 gated; ungated 7 pass, 2 skipped |

- Added or updated paths attached for proportional test-code review: `Yes` (attached; the main request this round is failure-origin review)
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/*.log` | command outputs | Retained | — |
| `api-e2e-evidence/dcf-gated-final-*/definition-catalog-live-refresh.json` | E2E receipts | Retained | frames strict-schema check, cleanup |
| `api-e2e-evidence/desktop/desktop-journey-receipt.json`, `*.png`, `msg*.json` | desktop journey receipt, screenshots, the exact messages sent | Retained | — |
| `api-e2e-evidence/apar-macos-watch-probe.mjs`, `…-output.json` | AC-014 macOS probe | Retained (evidence) | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Timing probe inside DCF-E2E-007 | separate a detection race from a stale reader | detection 4–28 ms; tool sees detected changes first | removed before commit |
| `api-e2e-evidence/apar-macos-watch-probe.mjs` | macOS watch count + idle CPU | 604 handles, 0.079 % | probe kept as evidence; its watchers closed (0 after close) |
| `api-e2e-evidence/round2/apar-detection-tail-probe.mjs` (round 2) | rule out a slow-detection tail for new Team folders | agent 4–23 ms, Team 5–23 ms, 0 over 300 ms (40 trials) | probe kept as evidence; its temp root was removed |
| Timing probe inside DCF-E2E-007 (round 2) | catch the intermittent Team miss | 11/11 passes, never triggered | removed before commit `33d290187` |
| Isolated instance `iso-58692-7f20` (round 2) | APE-001 and org-owned rechecks | see the round-2 receipt | stopped; ports released; data root removed |
| Isolated desktop instance `iso-53228-c43b` | full product journey | see receipt | stopped; ports released; data root removed |
| `/tmp/apar-desk/**` (package copies, wrapper) | desktop fixtures | — | removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub API/archive (DCF-E2E-005, baseline-fixed suite) | controlled `fetch` | no public test repository; deterministic revisions | real-network transport not re-proven (unchanged code) |
| Model actor (DCF-E2E-007/008) | scripted AGY CLI | deterministic tool calls | covered with a real Codex model on the desktop |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Fail | DESK-002 (nested), APE-001 | A team-local agent's broken edit keeps its last good version (backend correct), but the web shows the issue nowhere. The Agents page filters out `TEAM_LOCAL` agents (`AgentList.vue:170`). The Team card and detail and `TeamLocalAgentMemberDetails.vue` render no member issue. `DefinitionDiagnosticsNotice.vue` hides `usingLastGood` entries. REQ-009 requires the error "on the affected card or row … naming the file and the reason. Logs alone are not enough". DSN-003 extends REQ-007/009 to nested definitions (111 of the user's 156 agents). By code, org-owned agents and Teams have the same gap (only `org.catalogIssue` renders); that was not separately executed. |
| Pass | REPO-001…005, DCF-E2E-001…008, REG-001, REG-002, MEAS-001, DESK-001, DESK-003, DESK-004, DESK-005, DESK-002 (shared agent) | as above |
| Out Of Scope (reported to owners, pre-existing on base `359d2c0ef`) | `agent-team-definitions-graphql.e2e` ×5; `agent-package-private-skills.e2e` ×2 | (a) uses `refType` and `buildTeamLocalTeamDefinitionId`, removed by `37d05c7f7` (flat agent organizations); a rewrite to the flat model is needed. (b) calls `CodexThreadBootstrapper.bootstrapForCreate` without its `ProviderPreparationGuard` (`028cca231`) and the now-private `createBackend` without its ownership hooks (`54eaac53a`); it needs to move onto the backend-preparation API |
| Observation (not this ticket) | — | `list_available_agents` lists a Team whose member was deleted (Teams GraphQL list and admission show it unavailable). Identical to base: the collaborator catalog lists `getAllDefinitions()` without admission. Codex runtime: one Project Task Manager turn stayed "generating" for ~11 min after its last tool call, with no trace; Stop + resend recovered. |
| Observation (REQ-018 scope) | DCF-E2E-007 | A lookup issued ~40 ms after the last write can precede the monitor's detection (detection is 4–28 ms on macOS). REQ-018 covers only detected changes, and real use always has a model turn in between. The test pauses 300 ms and asserts that nothing was published yet. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process Studio servers, temp data roots (E2E) | suite | `afterAll` | `baseRemoved: true`, `serverClosed: true`, no errors |
| Isolated instance `iso-53228-c43b` | mine | `pnpm --silent isolated-app stop iso-53228-c43b` | stopped, not forced; data root removed; both ports released |
| `/tmp/apar-desk` (package copies, wrapper) | mine | `rm -rf` | removed |
| Round 2: isolated instance `iso-58692-7f20` | mine | `pnpm --silent isolated-app stop iso-58692-7f20` | stopped, not forced; data root removed; both ports released |
| Round 2: `/tmp/apar-desk2` | mine | `rm -rf` | removed |
| Other instance `iso-63369-6c20` | not mine | none | untouched |

## Preliminary Classification

- Round 2: N/A (Pass). Round 1's APE-001 `Design Impact` was confirmed by CRR-003 (CR-004) and resolved by SR-008/IR-003.

### Round 1 (superseded)


- **APE-001 — `Design Impact` (preliminary), recommended owner Solution Designer, after failure-origin review.** The design's only nested example ("the Agents page card for `a` shows the badge", design-spec Concrete Examples, DSN-003/AR-004) assumes team-local agents have Agents-page cards. The product filters them out (filter present at base), and the File Responsibility Mapping assigns no surface for nested-node issues (Team card/detail members, org-owned nodes), nor for `usingLastGood` entries in the notices. Which surface should carry them is a design decision; the backend side (catalog issue, `definitionDiagnostics` with `usingLastGood`) is correct. If the reviewer judges the surface obvious, for example a Team or Org card badge aggregating its nested nodes' issues plus a member-row badge on the Team detail, this becomes a `Local Fix` for the implementation engineer.

## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002)
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed in both rounds (isolated desktop instances `iso-53228-c43b`, `iso-58692-7f20`)
- Critical acceptance criteria lacking direct proof: none
- Prior failure resolution: APE-001 (round 1) is resolved by IR-003 (SR-008/DSN-004) and verified live and durably
- Next recipient from `get_handoff_rules`: proportional test-code review (code reviewer) of `6b3a10822`, `a28465175`, `33d290187`
- Notes for delivery:
  - DSN-002 effect: a Team/Org duplicated across packages is no longer offered by `list_available_agents` or `@`.
  - SR-008: nested issues show on the owning Team/Org card.
  - TESTING.md should list the `definition-catalog-live-refresh.e2e.test.ts` command (gated cases need `RUN_AGY_FAILURE_E2E=1` and the AGY fixture).
  - Base failures reported to their owners: `agent-team-definitions-graphql` ×5, `agent-package-private-skills` ×2.
