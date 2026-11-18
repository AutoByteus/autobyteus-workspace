# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3, rerun by impact after delivery's merge `7c1117e209` (origin/personal `d6bcff577b`) and the DEL-02 fix reviewed in CRR-005 (head `a9d85c0e2d`); round 2 was TR-001 (CRR-003); round 1 followed CRR-002
- Prior round reviewed: round 1 (API-REV-001, Pass). Round 2 plan: TR-001 changes only `deepseek-harness-standalone-host.e2e.test.ts` assertions; `git diff --name-only fddcff0f13 HEAD -- autobyteus-server-ts/src autobyteus-ts/src` is empty, so every other case stays valid and only API-25 reran
- Deviations from the investigation's plan, and why:
  - API-08 added: every earlier run found dsh through `DEEPSEEK_HARNESS_COMMAND`; a user's install puts `dsh` on PATH,
    so the PATH lookup was checked (closes an environment-fidelity gap).
  - API-35's last step (Electron packaging) was rerun with `GITHUB_REPOSITORY` set: the local clone's `origin` is a
    folder, while the runner's checkout has the GitHub origin and Actions sets `GITHUB_REPOSITORY`.
  - API-06 found one failing web test not related to this ticket; its cause was found and fixed as a baseline fix
    (TESTING.md Rule 9), see API-06 Notes.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation/tickets/in-progress/deepseek-dsh-runtime-investigation/evidence/api-e2e/`
  (the handoff message gives the commit that holds it). Implementation evidence stays in `evidence/implementation/`.

## Round 3 Rerun Plan (rerun by impact)

- Validated before: `1eb5ac6723` (product code `fddcff0f13`). Now: `a9d85c0e2d`.
- `git diff --name-only 1eb5ac6723 a9d85c0e2d`, outside tickets: from the merge, server run-history read side (`run-history/services/*`, `run-last-activity-reader.ts`, GraphQL run-history types: `lastActivityAt`, list limits), `workspace-removal-guard.ts` (refusal text), about 100 web files (Runs view, stores, composables, localization), `autobyteus-web/package.json` (version, probe scripts), `generated/graphql.ts`, TESTING.md, RELEASE.md, GLOSSARY.md; from the DEL-02 fix, `tests/architecture/agent-provider-composition-boundaries.test.ts`. No lockfile, schema, `autobyteus-ts`, contract package, harness or dsh/ACP/credential-proxy source change; no `autobyteus-web/electron/` or settings/Agent Runtimes change.

| Case | Decision | Reason |
| --- | --- | --- |
| API-01, API-02, API-03 (server typecheck, unit incl. architecture tests) | Covered by IMP-10 at `ee6739fe7f` (merged state) | `Test Files  932 passed \| 5 skipped (937)`, `[typecheck] PASS` (`evidence/implementation/IMP-10-del-02-unit-typecheck.log`); later commits are docs only |
| API-09 (new): web typecheck | Rerun | Required after a merge (TESTING.md step 5) |
| API-06 full web suite | Rerun | Code it exercises changed in the merge |
| API-07 Electron main suite | Still valid | No `electron/` change |
| API-04, API-05, API-08, API-10…API-16, API-20…API-22, API-25 | Still valid | They drive run creation, turns, restore, Team/Org runs, the relay and the standalone host; none calls the changed run-history listing or workspace removal, and no code they exercise changed. Delivery reruns the scripted-provider suite on its integrated state |
| API-30 rendered row | Still valid | No settings/Agent Runtimes web change |
| API-35 fresh-start build | Still valid for this ticket's build inputs | The merge's own build inputs (web scripts, merged codegen) are delivery's integrated-state proof; codegen currency is checked by `web-generated-graphql-current.test.ts` in IMP-10 |

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-003 Pass, CRR-002 Pass)
- Successful-output route: `Code Review` (proportional test-code review of the added durable tests)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `fddcff0f13` + the new test files (committed as `145ae81d06`; no source change) | macOS 26 arm64 | Node 22.23.1, pnpm 10.28.2, vitest | repository suites; server suites in their own isolated environment |
| ENV-2 | as ENV-1 | macOS arm64 | in-process Studio E2E server, own temp data root and own vault (synthetic DeepSeek keys saved through `saveProviderApiKey`); real dsh 0.2.2-rc.1 on Node 25.2.1 (`/tmp/ab387-dsh-bin/dsh`); the relay's upstream replaced by a scripted Anthropic Messages endpoint in the test | `env -i PATH HOME=<temp> TMPDIR`; no `AUTOBYTEUS_TEST_VAULT`; idle timeout 6 s for API-14/15 only; dsh `--patch` threshold for API-12/13 only |
| ENV-3 | as ENV-1 | macOS arm64 | in-process Studio E2E server, real dsh 0.2.2-rc.1, REAL DeepSeek API through the product relay, `deepseek-v4-flash`, effort `low`; scripted Antigravity CLI for the switch | test vault (read-only), `env -i PATH HOME=<temp> TMPDIR` |
| ENV-4 | `dist/` built from `fddcff0f13` (`pnpm -C autobyteus-server-ts build`) | macOS arm64 | real standalone application host (fixture spawns `dist/index.js`), recording `dsh` stand-in | own temp root; no credential proxy (by design) |
| ENV-5 | `145ae81d06`, clean clone | macOS arm64 | release job commands, unsigned | frozen install only; no prior build outputs |
| ENV-6 | `145ae81d06` fresh-clone `AutoByteus.app` (ENV-5) | macOS arm64 | isolated desktop instance (`pnpm isolated-app start --app … --data-root …`), driven over its control port | own data roots; `server-data/.env` with `DEEPSEEK_HARNESS_COMMAND`; state A with the test vault, B and C with the instance's own empty vault |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all (gate) | server `src` + tests incl. the new suites | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-01-server-typecheck.log` | `test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `[typecheck] PASS` | The three new suites add no errors |
| API-02 | all; AC-016/017 | server unit suite | Reused: IMP-02 (+ IMP-09) | — | Pass | (implementation) | (implementation) | Ran at `9dd599dfe3`; since then only the supervisor input move `cb132711f6` (IMP-09 reran its tests) and docs |
| API-03 | AC-009, AC-017, QR-002 | server integration suite | Reused: IMP-03 | — | Pass | (implementation) | (implementation) | Ran at `3514947952`; later source changes are the dsh launch profile discovery (`9dd599dfe3`, not exercised by integration tests; covered by IMP-02/08 and API-08) and the supervisor move (IMP-09) |
| API-04 | AC-016, AC-017 | scripted Grok E2Es, integrations GraphQL E2E | Reused: IMP-04 + IMP-09 | — | Pass | (implementation) | (implementation) | IMP-09 reran them at `cb132711f6`; nothing after it but docs |
| API-05 | AC-001…AC-009, AC-011, AC-013…AC-015, QR-001, DEC-020 (studio scope) | live dsh suite | Reused: IMP-08 | — | Pass | (implementation) | (implementation) | Ran at `9dd599dfe3`; only the supervisor input move since (construction-time, IMP-09) |
| API-06 | AC-013, all web | full web unit/component suite | `pnpm -C autobyteus-web test:nuxt`; then the failing file alone; baseline fix; that file again | ENV-1 (round 3: `a9d85c0e2d`) | Pass | round 3: `API-06-web-test-nuxt-r3.log` (`Test Files  703 passed (703)`, `Tests  5164 passed \| 2 skipped (5166)`); round 1: `API-06-web-test-nuxt.log` (full), `API-06-web-test-nuxt-excerpt.log`, `API-06b-voice-input-rerun.log`, `API-06c-voice-input-after-baseline-fix.log` | `Tests  1 failed \| 5085 passed \| 2 skipped (5088)`; the failure `Error: Test timed out in 5000ms.` in `voice-input-extension.integration.test.ts`; alone `installs, enables, and inserts transcript text into the draft  2178ms`; after the fix `Tests  2 passed (2)` | Cause: that test extracts a real tar archive and starts two real worker processes (bash, then node; `voiceInputRuntimeService.ts:71,164`) under vitest's 5 s default; ~2 s alone, over 5 s beside the full suite's parallel workers. No file it exercises is touched by this ticket. Baseline fix `e3870adf3d` (30 s timeout for that case) |
| API-09 | round 3: merged state | web typecheck | `pnpm -C autobyteus-web typecheck` | ENV-1 at `a9d85c0e2d` | Pass | `API-09-web-typecheck-r3.log` | `test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS` | |
| API-07 | regression | Electron main-process suite | `pnpm -C autobyteus-web test:electron` | ENV-1 | Pass | `API-07-web-test-electron.log` | `Tests  407 passed \| 1 skipped (408)` | |
| API-08 | AC-005, AC-013, ASM-001 | dsh found as `dsh` on PATH (no `DEEPSEEK_HARNESS_COMMAND`) | `env -i PATH=/tmp/ab387-dsh-bin:$PATH … RUN_DEEPSEEK_HARNESS_E2E=1 … vitest run tests/e2e/runtime/deepseek-harness-live.e2e.test.ts -t 'is available'` | ENV-3 | Pass | `API-08-dsh-on-path.log` | `DSH_LIVE MODELS ["deepseek-v4-flash","deepseek-v4-pro","deepseek-flash"]`, `DSH_LIVE ROW {…"installed":true,…"account":{"state":"SIGNED_IN"}}` | No model call (discovery placeholder) |
| API-10 | AC-009 (key missing) | GraphQL `createAgentRun` → launcher → relay access, real dsh installed | scripted-provider suite (command in the file header) | ENV-2 | Pass | `API-10-16-scripted-provider-rerun-api10-api16.log` | `DSH_SCRIPTED NO_KEY {"success":false,"message":"AgentCreationError: RELAY_KEY_NOT_SET: The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.","runId":null}`; `✓ refuses a dsh run…` | No upstream call and no dsh run process (checked by `DSH_HOME` + run instructions variable). First runs' process check was vacuous (pgrep pattern); rerun after the fix |
| API-11 | AC-009 (key changed / removed mid-run; restore without key), REQ-009 | real dsh → relay → scripted endpoint | scripted-provider suite | ENV-2 | Pass | `API-10-16-scripted-provider.log` | `DSH_SCRIPTED KEY_REMOVED_TURN {"terminal":"ERROR",…"Internal error: turn failed: The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys."…}`; `DSH_SCRIPTED RESTORE_NO_KEY {"success":false,…RELAY_KEY_NOT_SET…}`; `✓ uses the key the vault holds at each call…` | Key A used by turn 1; key B (saved mid-run in Settings' mutation) by the next call; the endpoint saw only A/B/C, never a pass; removal (vault service, no product surface removes a built-in key) → no upstream call, dsh shows the relay's text; key C saved → same run restores and continues |
| API-12 | AC-010, AC-011 | real dsh compaction (lowered threshold via `--patch`) → relay (`x-deepseek-harness-compact`) → session → `COMPACTION_STATUS` → raw-trace rotation | scripted-provider suite | ENV-2 | Pass | `API-10-16-scripted-provider.log` | `DSH_SCRIPTED COMPACTION {"calls":[…{"n":6,"compaction":true…},{"n":7,"compaction":true…},…{"n":9,"compaction":true…},{"n":10,"compaction":true…}…],"statuses":[["compacting","deepseek_harness.relay_compaction_started",false],["compacted","deepseek_harness.relay_compaction_completed",true],…`; `✓ records each dsh compaction…` | 4 compaction calls → 4 `compacting` + 4 `compacted` (rotation-eligible); ≥1 archived raw-trace segment; one `TOKEN_USAGE_UPDATED` per call (8 calls); a later turn request carried dsh's summary text; all 4 turns completed |
| API-13 | AC-010 (failed compaction) | same, endpoint refuses compaction calls with 400 | scripted-provider suite | ENV-2 | Pass | `API-10-16-scripted-provider.log` | `DSH_SCRIPTED COMPACTION_REFUSED {"calls":1,"statuses":[["compacting",null],["failed","DeepSeek did not complete the compaction call (HTTP 400)."]],…}` | No `compacted`, no archived segment; turns still completed |
| API-14 | AC-012 (streaming keeps alive) | real dsh ↔ relay activity ↔ session idle timer (6 s) | scripted-provider suite; endpoint sends only `ping` events for 15 s, then the answer | ENV-2 | Pass | `API-10-16-scripted-provider.log` | `DSH_SCRIPTED KEEPALIVE {"terminal":"TURN_COMPLETED","ms":15160,"text":"KEPT-ALIVE-16",…}` | No ACP content during the 15 s (events list shows only status/usage before the text); no `ERROR` |
| API-15 | AC-012 (stall fails) | same; endpoint sends headers then nothing | scripted-provider suite | ENV-2 | Pass | `API-10-16-scripted-provider.log` | `DSH_SCRIPTED STALL {"terminal":"TURN_INTERRUPTED","ms":6054,"failure":"{\"code\":\"ACP_TURN_IDLE_TIMEOUT\",\"message\":\"DeepSeek Harness sent no turn activity for 6 seconds.\",\"error_scope\":\"runtime\",…}"}` | The idle failure ends the open turn, then fails the session (`acp-agent-session.ts:325-336`). First run's assertion took the first terminal event (test bug, fixed) |
| API-16 | RSK-004 | three concurrent dsh runs | scripted-provider suite | ENV-2 | Pass | `API-10-16-scripted-provider-rerun-api10-api16.log` | `DSH_SCRIPTED MEMORY {"processes":3,"rssMb":[330,350,351],"totalMb":1031}` | Measurement (no threshold): ~330–350 MB RSS per dsh process after one turn; every process ended with its run. Earlier run matched no process (pgrep pattern parsed as an option; test bug, fixed) |
| API-20 | REQ-001 (Teams), AC-004, AC-008 | Team of two dsh members; `send_message_to`; stop and restore | collaboration live suite (command in the file header) | ENV-3 | Pass | `API-20-22-collaboration-live-rerun-api20-api22.log` (first run: `API-20-22-collaboration-live.log`) | `DSH_COLLAB TEAM_RELAY {…"tool":"send_message_to"}`; `DSH_COLLAB TEAM_RESTORE {"sessionsBefore":[["ping","7b50b212…"],["pong","464dafc0…"]],"sessionsAfter":[["ping","7b50b212…"],["pong","464dafc0…"]],"reply":"PING-TO-PONG-8a5530ac"}` | Same dsh sessions resumed; pong recalls the message after the restore. First run: relay and restore worked, but the reply reader missed `SEGMENT_CONTENT_BATCH` frames (test bug, fixed) |
| API-21 | REQ-001 (Orgs) | Org: direct dsh member + nested Team's dsh member; relay | collaboration live suite | ENV-3 | Pass | `API-20-22-collaboration-live.log` | `DSH_COLLAB ORG {…"workerHasRelay":true}`; `✓ runs an Org with a direct dsh member…` | Both members answered attributed turns; communication event director → `/team/worker` |
| API-22 | AC-014 (switch), REQ-014 | one run: dsh → scripted Antigravity CLI → dsh | collaboration live suite | ENV-3 | Pass | `API-20-22-collaboration-live-rerun-api20-api22.log` | `DSH_COLLAB SWITCH {"segments":[["raw_traces_000001.jsonl","deepseek_harness"],["raw_traces_000002.jsonl","antigravity_cli"]],"journals":["deepseek_harness","antigravity_cli","deepseek_harness"]}`; `SWITCH_TURN {"label":"dsh continues",…"created-by-dsh-f3b52647.txt\n\nDONE"}` | Segment 1 = exactly dsh's records; hand-over marker "Agent runtime changed from DeepSeek Harness (…) to Antigravity CLI (…)."; back on dsh, the agent opened the journal and named the first agent's file. First run used the real `agy` (the capability reads its command at import; test bug, fixed; the real `agy` only listed models under a throwaway HOME) |
| API-25 | DEC-020, REQ-009 | real standalone application host (`dist/`) | `pnpm -C autobyteus-server-ts build`; `RUN_DEEPSEEK_HARNESS_STANDALONE_E2E=1 … vitest run tests/e2e/runtime/deepseek-harness-standalone-host.e2e.test.ts` (round 2: the test now asserts the `PROVIDER_RELAY_UNAVAILABLE` refusal and empty `dshDataFiles`, TR-001) | ENV-4 | Pass | round 2: `API-25-standalone-host-r2.log`, `API-25-host-r2/deepseek-harness-standalone-host.log`; round 1: `API-25-server-build.log`, `API-25-standalone-host.log`, `API-25-host/deepseek-harness-standalone-host.log` | `"availability":{"runtimeKind":"deepseek_harness","enabled":false,"reason":"DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run."}`, `"launch":{"started":false,"error":"PROVIDER_RELAY_UNAVAILABLE: …"}`, `"dshStarts":[]`, `"dshDataFiles":[]` | The refusal came from the launcher before `runLaunch` (no dsh home written); the stand-in `dsh` was never started for a run |
| API-30 | AC-013 | Settings → Agent Runtimes, rendered in an isolated desktop instance of the fresh-clone build | 3 instances (`API-30-instance-*-start.json`), each: open `#/settings`, click "Agent Runtimes", read `li[data-testid="runtime-deepseek_harness"]`, screenshot, GraphQL `agentRuntimes`; stop | ENV-6 | Pass | `API-30-state-a-row.json`, `API-30-state-a-dom.json`, `API-30-state-a-installed-key-set.png`; `API-30-state-b-row.json`, `API-30-state-b-graphql.json`, `API-30-state-b-installed-key-not-set.png`; `API-30-state-c-row.json`, `API-30-state-c-graphql.json`, `API-30-state-c-not-installed.png`; `API-30-instance-*-stop.json` | A: `"signin":"API key set","hint":null`; B: `"signin":"API key not set","hint":"Save its API key in Settings → API Keys."`, `"buttons":[]`, GraphQL `"state":"SIGNED_OUT"`; C: `"notInstalled":"Not installed","installLink":"https://github.com/deepseek-ai/deepseek-harness","restartHint":"After installing, restart AutoByteus."`, availability `"enabled": False` with the install reason | Row matches the other runtimes' layout (screenshots). The version reads `0.2.2` for `0.2.2-rc.1`: shared pre-existing reader, recorded as FU-002 |
| API-35 | DESIGN.md rule 12 (build inputs: contract `dist/`, generated GraphQL, new tests) | release build from a clean clone | clean clone at `145ae81d06`; `pnpm install --frozen-lockfile`; hygiene; licensing; `pnpm build:electron:mac -- --arm64`; packaging step again with `GITHUB_REPOSITORY` | ENV-5 | Pass | `API-35-fresh-start-build.log`, `API-35-fresh-start-build-packaging.log` | `dist present before install: autobyteus-agent-presentation-contracts/dist autobyteus-collaboration-stream-contracts/dist autobyteus-team-stream-contracts/dist` (tracked only); `[typecheck] PASS`; `Build completed: [ …AutoByteus_personal_macos-arm64-1.5.12-beta.1.dmg …zip ]` | Unsigned; x64 and signing/notarization need the runner (not proven locally). The first packaging attempt stopped at `Unable to resolve GitHub updater repository` because the local clone's origin is a folder; the runner has the GitHub origin and `GITHUB_REPOSITORY` |
| API-KEYSCAN | QR-001 | this round's evidence | value-free scan of `evidence/api-e2e/` for the test-vault DeepSeek key | ENV-1 | Pass | `API-KEYSCAN-evidence-folder.log` | `{"keyLength":35,"files":32,"hits":[]}` | Live suites never print the key; scripted suites use synthetic keys only |

## Acceptance-Criteria Proof

| AC | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (IMP-08) | Proven | — |
| AC-002 | Yes | API-05 (IMP-08), API-02 | Proven | — |
| AC-003 | Yes | API-05 (IMP-08) | Proven | — |
| AC-004 | Yes | API-05 (IMP-08), API-20 (Team restore), API-02 | Proven | — |
| AC-005 | Yes | API-05, API-08, API-02 | Proven | — |
| AC-006 | Yes | API-05 (IMP-08: rule token and literal `{probe}` followed after create, reopen and restore), API-02 | Proven for instructions the product can produce | — (the `{{name}}` precondition is not producible: the shared composer refuses `{{…}}` for every runtime, `carpenter-prompt-composer.ts:26-30`; code-review Residual Risks; AC wording for the Solution Designer) |
| AC-007 | Yes | API-05 (IMP-08) | Proven | — |
| AC-008 | Yes | API-05 (IMP-08), API-20/21 (`send_message_to` from dsh members) | Proven | — |
| AC-009 | Yes | API-05 (IMP-08: pass in env, refusal after release, key scan), API-03, API-10 (no key at create), API-11 (key changed, removed mid-run, restore without key) | Proven | — |
| AC-010 | Yes | API-12 (completed + rotation + continues), API-13 (failed, no rotation), API-02 | Proven (real dsh and relay, scripted DeepSeek endpoint; no live-model compaction per TESTING.md) | — |
| AC-011 | Yes | API-05 (IMP-08), API-12 (one usage event per call incl. compaction calls) | Proven | — |
| AC-012 | Yes | API-14, API-15, API-02 | Proven (real dsh and relay, 6 s idle timeout) | — |
| AC-013 | Yes | API-05, API-08, API-30 (three rendered states), IMP-05 | Proven | — |
| AC-014 | No (Should) | API-05 (journal), API-22 (switch both ways) | Proven | — |
| AC-015 | Yes | API-05 (IMP-08) | Proven | — |
| AC-016 | Yes | API-02, API-04 | Proven | — |
| AC-017 | Yes | API-02, API-03, API-04 | Proven | — |
| DEC-020 | Yes | API-05 (studio application scope), API-25 (standalone host) | Proven | — |
| QR-001 | Yes | API-05 (IMP-08 key scan), API-11 (endpoint never saw a pass), API-KEYSCAN | Proven | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | every AC above; API-10…API-30 closed AC-009 alternates, AC-010, AC-012, Teams/Orgs, switch, DEC-020 standalone, rendered AC-013 | AC-006's `{{name}}` wording (not producible) | Solution Designer settles the AC wording |
| Changed-boundary execution directness | 85% | 95% | real dsh, real relay, real servers, real host, real desktop build | compaction and liveness driven by a scripted endpoint, not the model | a live compaction run, only on the user's request (TESTING.md) |
| Cross-boundary integration realism and mock gap | 80% | 95% | API-11…API-16 cross dsh ↔ relay ↔ session ↔ memory for real; live Team/Org/switch | the scripted endpoint's usage numbers approximate DeepSeek's (RT-014 already showed real compactions) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | test vault, own vaults, clean `env -i` environments, fresh-clone build, isolated instances, dsh on PATH (API-08) | dsh on Node 25 through a wrapper (users need Node ≥ 24.9, ASM-001) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 96% | key missing/changed/removed, restore without key, refused compaction, stall, stop, restore of agent/Team, standalone refusal, process end | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-30 three states rendered in the real desktop build; API-06/07 | the remote-node hint variant not rendered; version shown without prerelease suffix (FU-002, shared) | — |
| Durable regression coverage quality and relevance | 85% | 95% | three new gated suites at the right layers; unit/integration coverage reused | the dsh suites run only behind their gates (the project's rule for real runtimes) | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 95% (simple average 95.3%)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-006 wording; RSK-004 is a measurement (≈330–350 MB RSS per dsh process); FU-002 version display.

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Live API`, `Lifecycle`, `Project Desktop Validation`
- Confidence gap it addressed: after repository checks, AC-010/AC-012 had unit proof only; Teams/Orgs/switch and the standalone host had none with dsh; AC-013 only a mounted component.
- Browser validation: the real desktop app (isolated instance) instead of a browser probe, because the row depends on the embedded server's environment and the desktop build.
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: isolated instances of the fresh-clone `AutoByteus.app` (API-35 → API-30), one per row state, each with its own data root.
- Cases: API-30 (renderer + embedded server); API-07 (Electron main suite).
- Effect on any already-running desktop application: `None` (the user's app and two other isolated instances were left alone).
- Behavior not directly proven: the remote-node hint variant ("…of that node"), covered by the component spec only.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-scripted-provider.e2e.test.ts` | Added | API-10…API-16 | — |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-collaboration-live.e2e.test.ts` | Added | API-20…API-22 | — |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-standalone-host.e2e.test.ts` | Added | API-25 | — |
| `autobyteus-server-ts/tests/e2e/runtime/fixtures/deepseek-harness-standalone-host-fixture.mjs` | Added | API-25 | — |
| `autobyteus-web/tests/integration/voice-input-extension.integration.test.ts` | Updated (baseline fix: 30 s timeout on one case) | API-06 | — |
| `TESTING.md` (Fresh-start build section) | Updated (`docs(testing)`) | API-35 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| DeepSeek Messages API (API-10…API-16) | scripted Anthropic Messages SSE endpoint as the relay's origin (`vi.mock` of `ProviderRelays`) | deterministic compaction, pacing, refusals and key changes; no paid inference; the test vault is read-only | usage numbers approximate DeepSeek's |
| Turn idle timeout (API-14/15) | 6 s instead of 300 s (`vi.mock` of `AcpAgentSession`) | the AC says "test with a shortened timeout" | — |
| dsh compaction threshold (API-12/13) | dsh's own `--patch` (`compaction-basic.thresholdRatio: 0.007`) on the dsh command | force compaction early (TESTING.md) | — |
| Antigravity CLI (API-22) | scripted CLI `tests/fixtures/agy-failure-cli.mjs` | the other side of the switch only needs to answer | — |
| dsh in the standalone host (API-25) | recording stand-in | must never start; proves it is not started | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup Action | Result |
| --- | --- | --- | --- |
| Suite data roots, servers, dsh processes (API-10…22) | Yes | suites' `afterAll` (terminate runs, close server, remove data root); `dshProcesses()` empty | Done; `pgrep -fl "profile acp"` empty afterwards |
| Standalone host temp root (API-25) | Yes | fixture removes it | `"rootRemoved":true` |
| Fresh clone `/tmp/ab387-api35-fresh` | Yes | removed | Done |
| Isolated instances `iso-62971-e666`, `iso-63921-c48d`, `iso-64080-b4de` and data roots `/tmp/ab387-api30/{a,b,c}` | Yes | `isolated-app stop`, roots removed | Done; `list` shows only two instances of others |
| Key-scan script (outside the repo) | Yes | removed | Done |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None` (AC-006's `{{name}}` precondition is not producible; recorded, wording for the Solution Designer)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review of the added durable tests)
- Notes: round 2 resolved TR-001 (CRR-003) by rerunning API-25 only. As for AC-006, AC-009's "key removed later" alternate has no product surface that removes a built-in provider key (`saveProviderApiKey` only saves; `removeForConsumer` has no GraphQL caller); API-11 removes it through the vault service (CRR-003 note, for the Solution Designer). Follow-up FU-002 recorded in `follow-ups.md` (prerelease version display, shared reader, not urgent). RSK-004 measured: about 330–350 MB RSS per dsh process.
