# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/delegated-launch-config-defaults/requirements-doc.md` (approved SR-002; SR-004 editorial)
- Investigation Notes: `tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/delegated-launch-config-defaults/solution-revision-record.md`
- Design Spec: `tickets/in-progress/delegated-launch-config-defaults/design-spec.md` (SR-004)
- Supplemental Task Artifacts: N/A — not applicable
- Design Review Report: `tickets/in-progress/delegated-launch-config-defaults/design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `tickets/in-progress/delegated-launch-config-defaults/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/delegated-launch-config-defaults/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/delegated-launch-config-defaults/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/delegated-launch-config-defaults/code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `tickets/in-progress/delegated-launch-config-defaults/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Execution Round: 4 (reopened round IR-003; see "Round 4 (IR-003) Execution" below — it is authoritative for this round)
- Trigger: user request to cover every case through the real UI (round 2 was CRR-003 TR-001, Local Fix)
- Prior Round Reviewed: 2 (API-REV-002, `Pass`)
- Latest Authoritative Round: 3 (browser probe extended and rerun; all other evidence carries forward)

## Round 4 (IR-003) Execution — authoritative for the reopened round

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied`, branch `codex/delegated-launch-config-defaults-r2` (`0ac4e4b07` web; base `2756d7b29` = round 1 as released in `v1.5.3-beta.1`). Diff vs base: web + tickets only.
- Classification `task_size=Medium`, `architectural_risk=Low`; input route `Direct Low-Risk`; successful-output route `Delivery`; test-code review `Not Required — direct low-risk route`. Architecture review and code review this round: N/A — not applicable.
- Basis: SR-005 (switcher and carried starts seed members; "+" copies unseeded), SR-006 (collapsible read-only member rows for collaborators and copies, same look as Members). Investigation: `api-e2e-coverage-investigation.md` → Round 4.

### Round 4 evidence matrix

| Case ID | Requirement / AC | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| DLP-008 | SR-005, AC-011 (the user's journey) | Browser probe | Durable | Pass | plain New chat → "hell" → switcher → Build: engineer Grok and reviewer ALT seeded/customized, lead follows, unusable default noted; text and root kept |
| DLP-009 | SR-005, AC-011, AC-012 | Browser probe | Durable (added) | Pass | Team A → Team B: B's seeds only (no A rows); New chat → Org: writer and placed Pair seeded (ALT), Pair engineer Grok, unoffered noted, root carried; Run → readback equals the form; Org launch page → Build: seeded |
| DLP-010 | DS-006 preserved ("+" unseeded) | Browser probe | Durable (added) | Pass | "+" from the DLP-001 run: lead ALT (user's choice), engineer Grok, reviewer on the root model as launched (not re-seeded to ALT) |
| DLP-003/004/006/007 (SR-006) | AC-010 (REQ-007 as refined) | Browser probe | Durable (extended) | Pass | rows collapsed on open (running: DLP-003, DLP-007; stopped: DLP-007, same rows); collapsed Squad "Notes: 5"; opened Team shows its card then Members; Coordinator chip on the copy's lead only; summaries carry approval and end with the source label; Team note once (lead has none); all models locked, no reset/menu/input |
| DLP-001/002/005 | AC-011..AC-013, AC-006 | Browser probe | Durable | Pass | unchanged behavior rechecked |
| Bug check | SR-005 | Browser probe on the released stores | Temporary | Detects | released stores: DLP-008 and DLP-009 fail (no seeds after the switch), DLP-010 passes; Org store only: DLP-009 fails at New chat → Org after Team A → B passed; restored (no diff) |
| ISO-002 | SR-005 (user's journey), SR-006, AC-010, AC-011 | Isolated desktop instance (round-4 build), real Claude/Codex | Desktop / Live | Pass | Marketing Team after the switcher: "2 of 4 customized" (strategist Codex Luna, copywriter Claude haiku), analyst follows, auditor note; real delegation: strategist ran on `codex_app_server/gpt-5.6-luna`, manager on `claude-haiku-5-5` (~$0.006); Settings: one collapsed copy row "Notes: 1"; opened: card, MEMBERS, Coordinator chip on strategist, auditor's note on its row only; stopped run: same collapsed row |
| REPO-003 | all web | `test:nuxt --run`, guards | Durable | Pass | 610 files / 4243 tests; guards 0/0/0 |

### Round 4 repository and broader commands

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm -C autobyteus-web test:nuxt --run`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass | `api-e2e-evidence/r2-web-nuxt.log`, `r2-web-guards.log` |
| `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh>` (×2) | Pass 10/10 | `api-e2e-evidence/r2-browser-probe-run-1/`, `r2-browser-probe-run-2/` |
| Same with the released stores (`git show 2756d7b29:<store> > <store>`; restored with `git checkout`) | DLP-008/009 fail as expected | `api-e2e-evidence/r2-browser-probe-bug-check-round1-*/` |
| `pnpm --silent isolated-app start --build` → `iso-60438-de06`; `iso2-setup.mjs`; browser-automation attach-only (control port 60438); `isolated-app stop` | Pass | `api-e2e-evidence/r2-isolated-instance/` |
| Server suites | Not rerun | no server, contract or persistence change in `git diff 2756d7b29..HEAD`; round-1 evidence carries forward |

### Round 4 confidence scorecard

| Category | Score | Evidence | Residual |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | Every SR-005 start kind and the preserved "+" proven in the UI; SR-006 design points asserted; the user's journey reproduced in the packaged app | user's own verification |
| Changed-boundary execution directness | 97% | launch drawers, Org launch page, Settings rows read where the user sees them | — |
| Cross-boundary integration realism and mock gap | 95% | real catalogs and runtimes in the packaged app; scripted runtimes in the probe | — |
| Environment, configuration, identity, and fixture fidelity | 95% | worktree desktop build; probe-owned stack | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | bug reproduced on the released stores; stale-seed (A → B); running vs stopped Settings | quick Team → Agent switch race: store test only |
| User-surface, browser, and desktop-shell confidence | 93% | probe 10 cases ×2; desktop journey | 390 px clipping of opened copy member cards (O-6); Org "+" re-seed not distinguishable in UI fixtures (store test) |
| Durable regression coverage quality and relevance | 96% | probe DLP-008..010 detect the bug (verified on the released stores) | — |

- Overall final confidence (round 4): 95% — simple average (97+97+95+95+95+93+96)/7 = 95.4%
- Every critical acceptance criterion directly proven: `Yes`; no category below 90%; 95% target met.

### Round 4 observations (non-blocking)

- O-6: at 390 px, an opened Team copy's member cards (nesting depth 2) clip setting values (the model value disappears, "Auto-approve" is cut, names truncate to one letter). Same nested `RunMemberRow` layout as an Org placed team's members; saved-run Settings are specified at 880 px (no phone matrix), and at 880 px and in the desktop window (section 672 px wide) nothing clips. Follow-up candidate. Evidence: `r2-browser-probe-run-1/DLP-003-agent-run-settings-390.png`.
- O-1 (note only inside the collapsed tool Result), O-3 (raw address names) unchanged; O-2 resolved by SR-006 (Team note shown once).

### Round 4 result

- Result: `Pass`; final confidence 95%; broader validation `Required` — executed (browser probe; isolated desktop instance).
- Next recipient per `get_handoff_rules`: Delivery (direct route).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: as above
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two additions: MOB-001 (mobile seeding controller spec, because the mobile shell needs pairing and has no browser surface) and ISO-001 (isolated desktop instance with real runtimes, added at the user's direction with a user-provided key file).
- Existing coverage decisions revised during execution, with evidence:
  - `@` mention: the approved behavior is "`@` only resolves" (BEH-002 preserved); the E2E asserts that nothing is admitted on `@` instead of expecting a collaborator.
  - An extra copy at a collaborator address records no definition snapshot (reviewed residual C-004); its per-member values are proven at the runtime (Grok session, AGY `--model`) rather than in a recorded source.
  - A configured Team-root member's definition is not an available catalog agent (product rule); the agent-copy case uses a separate definition.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: as above
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Interruption note: a host power-off interrupted the first repository chain (during the web suite) and E2E run 3; both were rerun cleanly. One server unit failure in that first chain (`native-compaction-terminal-drain.test.ts`) ran under concurrent E2E load; it passed 3/3 alone and in the clean full run.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-001 | Pass | 12 | `api-e2e-evidence/server-unit.log`, `server-typecheck.log` | — |
| REPO-002 | Pass | 3 | `api-e2e-evidence/contracts.log` | — |
| REPO-003 | Pass | 10 | `api-e2e-evidence/web-nuxt.log`, `web-guards.log` | — |
| DLC-001..008 | Pass | 6 | `api-e2e-evidence/server-e2e/` | 3 consecutive passing runs |
| REG-001 | Pass | 7 | `api-e2e-evidence/server-e2e/*.log` | — |
| REG-002 | Pass (baseline) | 13 | `api-e2e-evidence/server-integration.log` | Only the TESTING.md known exception fails |
| DLP-001..007 | Pass | 22 | `api-e2e-evidence/browser-probe-run-8/`, `browser-probe-run-9/` | Round 3: 2 consecutive full passing runs (runs 2–3 were the round-1 four-case version; run 7 interrupted by a host restart) |
| MOB-001 | Pass | 19 | console (mutation verified, round 2) | Reworked for CRR-003 TR-001 |
| ISO-001 | Pass | 17 | `api-e2e-evidence/isolated-instance/` (screenshots, `iso-journey.mp4`) | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (pre-change tree restored through the normal readers; no version branch)
- Durable coverage added or retained only for compatibility-only behavior: `No` (DLC-008 proves the approved `Directly Usable` decision)

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| DLC-001 | BEH-001; REQ-001..003, REQ-008; AC-001, AC-002 (member layer), AC-005 (4 reasons + team layer), AC-015 shape | `delegate_task` → admission → resolver (real availability/catalog probes) → recorded source → strict `launch_notes` | Server E2E, Agent/Team/Org roots, scoped MCP | Durable | Pass | exact recorded launches/sources per member; exact five note strings |
| DLC-002 | AC-001 at runtime | Resolved launch → runtime node → process start | Server E2E | Durable | Pass | Grok replay answered for `engineer`, no AGY launch for it; AGY argv `--model` ALT for `reviewer`, root model for `unoffered` |
| DLC-003 | AC-003, AC-004, AC-005; DS-004 (a) in three `deliverToAddress` | Agent copy; agent bring-in note in `send_message_to` message | Server E2E, three roots | Durable | Pass | copy sources `agent_default` / `inherited`; note appended exactly; no note for usable default |
| DLC-004 | AC-002 (team layer), AC-004, AC-007 | Team bring-in with member fallback to team default; extra copy at its address | Server E2E | Durable | Pass | note "(its team default)"; Pair lead on ALT; extra copy engineer on Grok, unoffered on ALT; no `launch_notes` |
| DLC-005 | AC-007, AR-002; DS-004 (b) | Teammate delegation in a copy; task-owned helper bring-in | Server E2E | Durable | Pass | no `launch_notes`; teammate copies on recorded values; helper note once, none when reused |
| DLC-006 | AC-006, REQ-004; BEH-002 `@` preserved | Inherited layer unusable (root model retired) | Server E2E, Agent root | Durable | Pass | `<name> cannot be delegated to: The model '…' is not available on antigravity_cli.` (base wording); `COLLABORATOR_ADD_FAILED` same reason; tree unchanged; own usable default still delegates; `@` admits nothing |
| DLC-007 | AC-008, DEC-008 | Snapshot stability across definition edit and root stop/restore | Server E2E, Agent and Team roots | Durable | Pass | old copy engineer first-starts on Grok after restore; new copy engineer `agent_default` ALT |
| DLC-008 | AC-009, REQ-006, QR-002 | Pre-change saved tree (copy + collaborator Team) through real restore | Server E2E, Agent and Team roots | Durable | Pass | sources absent ("not recorded"), member launches absent; members start on the Team value (AGY argv) |
| REG-001 | AC-014, BEH-006 | Existing delegation journeys (configured placements, ad-hoc, existing copy) | Server E2E | Durable (existing) | Pass | logs |
| DLP-001 | AC-011, AC-013, DEC-009, AR-003 | New chat Team seeding, pins, member edit, reset → Run → server | Browser probe (real backend, scripted runtimes) | Durable | Pass | row states; created team run member configs equal what was shown |
| DLP-002 | AC-012 | Org launch page seeding → Run → server | Browser probe | Durable | Pass | writer ALT, placed Pair ALT, Pair engineer Grok, Pair unoffered (note) on team value |
| DLP-003 | AC-001, AC-003, AC-004, AC-005, AC-007, AC-010; DS-004 (b); AR-002 | Manager chat started from the UI; composer → tool → conversation; copy member conversation; Settings | Browser probe (every action through the UI) | Durable | Pass | five exact Squad notes and the Pair bring-in note shown in the conversation; Writer and extra copy carry none; from the copy lead: teammate delegation without note, helper note once then none, Grok engineer's reply rendered (no AGY launch); Settings rows for all four reasons, team default, collaborators, extra copy (as configured), teammate copy |
| DLP-004 | AC-004, AC-005, AC-010 | Team run (New chat) and Org run (Org launch page) driven from the composer; Settings | Browser probe | Durable | Pass | Squad notes and Pair bring-in note in the conversation (Org); Settings rows in both roots |
| DLP-005 | AC-006, REQ-004 | Root model retired mid-run (probe-owned `agy models` file) | Browser probe | Durable | Pass | conversation shows `<name> cannot be delegated to: The model 'dlc-retiring-model' is not available on antigravity_cli.` (agent and Team) and `COLLABORATOR_ADD_FAILED` with the same reason; tree unchanged; reviewer copy (own default) delegated; Settings lists only it |
| DLP-006 | AC-009, QR-002 | Pre-change saved Agent and Team runs after a backend restart | Browser probe | Durable | Pass | Settings: copy, collaborator and member rows "Source not recorded" with the Team value (Squad engineer on the root model, not Grok); the copy engineer then starts on AGY with the root model |
| DLP-007 | AC-008, DEC-008 | Agents editor edit; stop from Settings; reopen from the composer | Browser probe | Durable | Pass | Settings before and after reopen: copy A engineer Grok, copy B engineer ALT (agent default); copy A engineer's first start after reopen is on Grok (`list_dir` tool card and recorded listing; no AGY launch) |
| MOB-001 | AC-011 (mobile), DS-006 | Mobile setup controller seeding, held-then-released seed applied (control), stale seed dropped | Web component | Durable | Pass | M0 (seeding call removed) fails all 3; removing both stale-seed guards (controller selection check + store draft-ID check) fails the switch case; either guard alone still drops it |
| ISO-001 | AC-015 shape, AC-001, AC-005, AC-010, AC-011, AR-001 | Packaged desktop app, real runtimes, real catalogs | Isolated desktop instance (worktree build) | Desktop / Live | Pass | token ledger per run (runtime/model), recorded tree, tool Result `launch_notes`, Settings rows, "+" prefill; `isolated-instance/iso-0*.png`, `iso-journey.mp4` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | worktree | src types | Pass | `server-typecheck.log` |
| 2 | `pnpm -C autobyteus-server-ts test:unit` | worktree, serialized | server units (673 files / 5277 tests) | Pass | `server-unit.log` |
| 3 | `pnpm -C autobyteus-{team,collaboration}-stream-contracts test` | worktree | contracts | Pass | `contracts.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run`; three guards | worktree, serialized | web (604 files / 4193 tests) | Pass | `web-nuxt.log`, `web-guards.log` |
| 5 | `vitest run components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` (+ mutations M0–M3, round 2) | `autobyteus-web` | MOB-001 | Pass | console |
| 10 | `vitest run components/mobile composables/mobile stores/__tests__/teamRunConfigStore.spec.ts utils/runSettings/__tests__/memberLaunchDefaults.spec.ts` (round 2) | `autobyteus-web` | related mobile/seeding suites | Pass (16 files / 98 tests) | console |
| 6 | `env -i PATH HOME TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts --no-watch` (×3) | clean env | DLC-001..008 | Pass | `server-e2e/run-4.log`, `delegated-launch-config-defaults*.log` |
| 7 | same gate: `delegated-team-lazy-member-activation`, `ad-hoc-task-delegation`, `delegated-copy-member-contact-host`, `task-existing-copy-assignment` | clean env | REG-001 | Pass | `server-e2e/*.log` |
| 8 | `pnpm -C autobyteus-server-ts test:integration:prepare && test:integration` | worktree | REG-002 | Pass (baseline exception only) | `server-integration.log` |
| 9 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh>` (round 1 ×2; round 3 full ×2) | worktree | DLP-001..004 (round 1); DLP-001..007 (round 3) | Pass | `browser-probe-run-2/`, `-3/` (round 1); `-8/`, `-9/` (round 3) |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | AC-001..AC-014 proven through the real UI (DLP-001..007) in addition to the server E2E; AC-015 shape on real runtimes (ISO-001) | AC-015 with the user's own definitions is user verification |
| Changed-boundary execution directness | 90% | 97% | +7 | Every user-visible result read where the user sees it: conversation, sidebar, member conversation, Settings, launch forms | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | +10 | Real Claude/Codex/native in the packaged app (ISO-001); scripted runtimes elsewhere | Fallback reasons other than "model not offered" proven with scripted runtimes only |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Packaged worktree build; probe-owned stack with a backend restart as after an upgrade | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | +1 | AC-006, AC-008, AC-009 now also through the UI (retired model, stop/reopen, pre-change run after restart) | UNK-001 out of scope |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | Probe 7 cases ×2 full runs; desktop app journey | Mobile shell not rendered (pairing); its change is draft-only and covered by MOB-001 |
| Durable regression coverage quality and relevance | 90% | 96% | +6 | Durable E2E, durable UI probe (7 cases), mobile spec (mutation-verified) | Probe and E2E are gated/manual like their siblings |

- Overall post-repository confidence: 85%
- Overall final confidence: 96%
- Calculation method: simple average (97+97+95+95+96+95+96)/7 = 95.9% ≈ 96%
- Confidence change produced by broader validation: +11 points
- Every critical acceptance criterion directly proven: `Yes` (AC-015 user verification remains with delivery by definition)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: mobile shell not rendered; UNK-001 (out of scope); AC-015 user verification.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Browser probe; added at the user's direction: Project Desktop Validation (isolated instance) with real runtimes.
- Material deviation from the planned mode or rationale: the isolated desktop instance was added (the user pointed to it and named a key file for a test vault); it closes the scripted-runtime gap for the main path.
- Confidence gap or residual risk actually addressed: rendered Settings and launch forms with real DTOs and Run readback; real-runtime mixed copy; tool-card visibility of `launch_notes`; member conversation context (AR-001).
- Startup order, commands, and readiness results:
  - Probe: `pnpm -C autobyteus-server-ts build` → `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh>` (probe-owned prisma migrate, backend health, Nuxt dev, Chrome).
  - Desktop: `pnpm --silent isolated-app start --build` → `iso-49330-a48e` ready (control 49330, backend 49331) → `script -q /dev/null pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url <instance databaseUrl>` (typed `IMPORT`) → `isolated-app restart iso-49330-a48e` → `iso-setup.mjs` → browser-automation `CHROME_REMOTE_DEBUGGING_PORT=49330 BROWSER_AUTOMATION_ATTACH_ONLY=1`.
- Environment choices that materially affected the run: probe — scripted AGY, fake Grok, missing Codex command, temp HOME; desktop — the instance's own data root and DB, credentials only in that DB, real installed CLIs (codex, claude), cheapest offered models.
- Seed data: definitions via GraphQL (both); runs via the UI (desktop) or GraphQL + scripted WS messages (probe).

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| ISO: Agent Teams → Run "ISO SE Team" → member drawer | Lead/engineer seeded from defaults; reviewer follows root; auditor note | "2 of 4 customized"; lead "GPT-5.6-Luna · Codex", engineer "deepseek-v4-flash · AutoByteus" customized; auditor note "Its default (Codex · iso-no-such-model) can't be used: the model is not offered." | `iso-01-new-chat-drawer-seeded.png` | Pass |
| ISO: ISO Manager on Claude haiku asked to delegate `/iso_se_team` | Copy members resolved per agent | Recorded: lead codex/gpt-5.6-luna agent_default; engineer autobyteus/deepseek-v4-flash agent_default; reviewer inherited; auditor inherited + model_unavailable | GraphQL `agentRunCollaboration` | Pass |
| ISO: copy works | Lead starts on Codex, engineer on native when messaged; reviewer never started | Token ledger: manager claude_agent_sdk/claude-haiku-5-5; lead codex_app_server/gpt-5.6-luna (Codex thread bound); engineer autobyteus/deepseek-v4-flash (native AgentRuntime); reviewer no run | instance DB `token_usage_run_records` (read-only), instance log | Pass |
| ISO: delegating conversation | Delegation result carries the note | Activity → `delegate_task` → Result shows `launch_notes: ["auditor: its agent default codex_app_server / iso-no-such-model could not be used (…); it runs on claude_agent_sdk / haiku (inherited from the run)."]` | `iso-03-delegate-task-result-launch-notes.png` | Pass |
| ISO: Settings | Read-only rows with runtime, model, source, note | Copy row Claude haiku "Inherited from the run"; lead Codex "Agent default"; engineer native "Agent default"; reviewer inherited; auditor inherited + note | `iso-04-settings-delegated-rows.png` | Pass |
| ISO: "+" from copy members (AR-001) | Prefill with the member's own runtime/model | lead → "GPT-5.6-Luna · Codex"; engineer → "deepseek-v4-flash · AutoByteus" | `iso-05-plus-from-engineer-prefill.png` | Pass |
| DLP-001..007 | See matrix | All pass, two full runs | `browser-probe-run-8/`, `browser-probe-run-9/` | Pass |

## Desktop Application Validation

- Validation approach executed: isolated instance of this worktree's packaged build, driven through its CDP control port with the browser-automation launcher (attach-only), recorded to MP4.
- Web-equivalent behavior, surface used, and evidence: launch drawer, conversation tool card, Settings, "+" prefill — in the packaged renderer.
- Shell-specific or lifecycle behavior and evidence: not changed by this ticket; the packaged app started, restarted after the credential import and stopped cleanly.
- Effect on any already-running desktop application: `None` (the user's AutoByteus and other agents' isolated instances were not touched).
- Behavior not directly proven and confidence consequence: mobile shell (pairing) — covered by MOB-001.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Node v22.23.1, pnpm workspace; vitest 4.0.18 (server), 3.2.4 (web)
- Google Chrome (headless, playwright-core) for the probe; viewports 1512×952, 1280, 880, 390; locale en-US

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: a saved Agent-root (`collaboration_tree.json`) and Team-root (`team_run_execution_tree.json`) tree with a catalog Team copy and a collaborator Team stripped of `launchSource`, `defaultLaunchSource` and member `launchConfiguration`/`launchSource` (the shape every pre-change run has).
- Direct-use result and evidence: the stopped roots restored through the normal readers; GraphQL trees parse; sources read null ("not recorded"); never-started members start on the Team value (AGY argv `--model` = Team value) — DLC-008.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: records written by older releases with other unrelated shape differences are outside this change (readers unchanged except optional fields).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | Added | DLC-001..008 (AC-001..AC-009, AC-015 shape); gated `RUN_AGY_FAILURE_E2E` | 3/3 cases, 3 consecutive runs, ~20 s |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Added (extended in round 3) | DLP-001..007 (AC-001, AC-003..AC-013 through the UI) | 7/7, 2 consecutive full runs (~3.6 min each) |
| `autobyteus-web/package.json` (`test:e2e:delegated-launch-defaults`) | Updated | Probe script entry | — |
| `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` | Added (updated in round 2 for TR-001) | MOB-001 (AC-011 mobile, DS-006) | 3/3; mutation-verified (M0–M3) |

- Added or updated paths attached for proportional test-code review: `Yes`
- Removed paths: None

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/server-e2e/delegated-launch-config-defaults.json` | E2E receipt (records, results, cleanup) | Retained | — |
| `api-e2e-evidence/browser-probe-run-{1..9}/` | Probe evidence JSON, screenshots, logs | Retained | runs 1, 4, 5 were test-assumption iterations; run 7 interrupted by a host restart; 8–9 are authoritative |
| `api-e2e-evidence/isolated-instance/` | Desktop journey screenshots, `iso-journey.mp4` (5.8 min), start/restart/stop receipts, definitions | Retained | MP4 is large (~7 MB); delivery decides whether to commit it |
| `api-e2e-evidence/*.log` | Repository suite logs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Mutations of `useMobileRunSetupController.ts` (seeding call; selection guard) and `teamRunConfigStore.ts` (draft-ID check) | Prove MOB-001 is not vacuous (round 2: M0–M3) | M0 fails all; M3 fails the switch case | Restored with `git checkout`; no diff |
| `api-e2e-evidence/isolated-instance/iso-setup.mjs` | ISO-001 definitions through public GraphQL | Created the five agents and the team; chose models from the instance's catalogs | Ticket evidence only |
| Isolated instance `iso-49330-a48e` and its test vault | ISO-001 | Pass | `isolated-app stop`: data root (with the imported vault) removed, ports released |
| Temporary launcher wrapper (`b.sh`) and `/tmp` notes | ISO-001 browser calls pinned to port 49330 | — | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | Scripted `agy-failure-cli.mjs` (TESTING.md); in the probe through a probe-owned wrapper that answers `agy models` from a file (to retire a model mid-run) | No inference; deterministic tool calls; the user types the tool instruction a model would issue | Proves transport and UI, not paid inference (real runtimes: ISO-001) |
| Grok Build CLI | Recorded-fixture fake | Second runtime without credentials | Same |
| Codex | Missing command path | Deterministic "runtime unavailable" | Real Codex covered by ISO-001 |
| (ISO-001) none | Real Claude, Codex and native runtimes with imported credentials | — | About $0.01 of provider usage (token ledger estimate) |
| Start catalog (MOB-001) | Module mock | Component-level spec | Mobile UI not rendered (pairing) |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-001..003, DLC-001..008, REG-001, REG-002 (baseline exception only), DLP-001..007, MOB-001, ISO-001 | All acceptance criteria AC-001..AC-014 proven directly, and through the real UI; AC-015 shape proven on real runtimes |
| Not Tested | AC-015 with the user's own definitions; UNK-001 | User verification (delivery); out of scope |

Non-blocking observations (not failures; for Solution Designer / delivery as follow-up candidates):

- O-1: In the delegating conversation the note is visible only inside the `delegate_task` tool's raw JSON Result (collapsed by default in Activity). REQ-008 is met literally; the Claude delegator did not repeat the note in its reply.
- O-2: Settings repeats the Team-level fallback note on each member without its own default (DS-005 by design: such a member shows its Team's source). Truthful, but repetitive in larger teams.
- O-3: Settings row names show the raw address segment (`iso_se_team`, `pair_team_5ce2`), while the sidebar shows "iso se team".
- O-4: `TESTING.md` says SDK `dist/` outputs are untracked; the two stream-contract packages' `dist/` is tracked (already recorded upstream; docs follow-up).
- O-5: Reviewed residuals confirmed as designed: an extra copy at a collaborator address shows "As configured in this run" (its member rows show the correct runtime/model); a saved Org run's Settings reads the tree loaded with the editor.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E data dirs, temp HOME, fake Grok dir, in-process servers | This run | Test teardown | Receipt: all removed, no leftover processes |
| Interrupted E2E temp HOME `dlc-e2e-home-cmPX7t` (power-off) | This run | `rm -rf` | Removed |
| Probe backends, Nuxt dev servers, Chrome, temp roots | This run | Probe teardown | Receipts: SIGTERM, roots removed |
| Isolated instance `iso-49330-a48e` (+ data root, imported vault) | This run | `pnpm --silent isolated-app stop iso-49330-a48e` | `wasRunning: true`, `dataRootRemoved: true`, both ports released |
| Built `autobyteus-web/electron-dist/` | This run (build output, untracked) | Left in place | Untracked build output |

## Preliminary Classification

N/A — no failure.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (browser probe; isolated desktop instance with real runtimes)
- Critical acceptance criteria lacking direct proof: None (AC-015 user verification stays with delivery)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff message
- Notes: round 3 (API-REV-003) extended the browser probe so every case runs through the real UI (DLP-005..007 added; DLP-003/004 UI-driven); round 2 (API-REV-002) fixed CRR-003 TR-001 in the mobile spec. Durable coverage added — `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts`, `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (+ `test:e2e:delegated-launch-defaults` in `autobyteus-web/package.json`), `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts`. Targeted proportional test-code review of the mobile spec (round 2) and the extended probe (round 3) requested (Large / High route). Not committed.
