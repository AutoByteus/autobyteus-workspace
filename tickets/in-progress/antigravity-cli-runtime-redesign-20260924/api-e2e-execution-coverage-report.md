# API/E2E Execution Coverage Report — AGY runtime

## Round metadata and authority
- **API-REV-001**, round 1, 2026-09-24; triggered by Code Reviewer CRR-002 Pass at reviewed worktree commit `575520264`. Prior API/E2E result/confidence: **N/A**. Latest authoritative result: **Fail**.
- Cumulative input paths in this ticket directory: `requirements-doc.md` (approved SR-021; REQ-001–011, AC-001–010), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (DS-001–004), `investigation-result.md`, `design-review-report.md` (ARCH-REV-003 Pass), `architecture-review-revision-record.md`, `implementation-handoff.md` (IR-003), `implementation-revision-record.md`, `code-review-report.md` (CRR-002 Pass), `code-review-revision-record.md`; supplements AGY CLI experiment/tool capture/command matrix and implementation-local live reports. Delivery revision: N/A.
- API/E2E authority: `api-e2e-coverage-investigation.md`; checkpoint: `api-e2e-test-case-ledger.md`; history: `api-e2e-revision-record.md`.
- Classification: **Large / High**, Reviewed route. On Fail, Code Reviewer owns focused failure-origin review; no proportional successful test-code review yet. Investigation was written before durable test edits and execution; plan followed with fixture updates and additional live browser/CLI checks recorded there.

## Result and critical failure
**Fail — AC-002 / SCN-002, real Team inter-agent parity gate.** The new opt-in durable GraphQL/WebSocket test creates two AGY Agent definitions and a real Team definition, then calls `createAgentTeamRun` with AGY root/member configs. GraphQL returns `success=false`, message `rootTeam.defaultLaunchConfiguration.runtimeKind is unsupported.` No AGY member process or delivery starts. The current production validator `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts:77` hardcodes only `autobyteus`, `claude_agent_sdk`, `codex_app_server`; it omits `antigravity_cli`. Both current Team and Org run-tree validators call this shared launch-config validator. This is a **preliminary Local Fix, implementation-owned**, not a requirement or design ambiguity. Code Reviewer must confirm origin. Do not work around the validator in tests or silently classify the stubbed-MCP test as real Team parity.

The first attempted test copied a now-obsolete Codex fixture field, `TeamMemberInput.refType`, which current GraphQL rejects; that test-only issue was corrected before the substantive rerun. The final AGY test also matches real AGY `call_mcp_tool` with nested `Arguments` rather than Codex's direct `send_message_to`/tool segment shape. Final corrected command and failure: `RUN_AGY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch`, `/tmp/agy-api-02-team-final.log` (1 failed). This durable E2E must remain and be rerun after source repair.

## Ledger reconciliation
| Case | Result | Evidence and boundary |
| --- | --- | --- |
| AGY-01 | Pass | Focused converter/capsule 13 passed, AGY live E2E correctly skipped without opt-in; web Org editor/tool card/hydration 42 passed. Logs `/tmp/agy-api-01-server-rerun.log`, `/tmp/agy-api-01-web.log`. |
| AGY-02 | **Fail** | Real Team GraphQL creation rejected before member activation; no WebSocket delivery/trace assertion reached. `/tmp/agy-api-02-team-final.log`. |
| AGY-03 | Pass, bounded | `AGY_LIVE=1` production capsule/restore suites 3/3 passed: custom identity, selected real workspace file/shell targets, configured skill, exact ID/identity restoration, changed workspace and nonexistent-ID rejection. `/tmp/agy-api-03-live.log`, `api-e2e-standalone-workspace-live.json`, `api-e2e-skill-live.json`. This is below GraphQL Team/Org. |
| AGY-04 | Pass | Fresh final-code browser/live API: explicit-off denial **DENIED** live and after reload; three AGY DONE command controls **SUCCESS** green live/reloaded; raw traces preserve DONE/ERROR and exposed output without shell exit field; no segment lifecycle banner. `api-e2e-browser-live-evidence.json`, `/tmp/agy-api-04-dev.log`. |
| AGY-05 | Fail as full scope; bounded checks pass | Real AGY scoped MCP calls with stub delivery 2/2 Team/Org pass; Org store/editor policy and capsule NONE/collision pass. **Real Org launch not executed**; shared production whitelist rejects AGY launch at the same validation boundary. `/tmp/agy-api-05-mcp-live.log`, `api-e2e-mcp-team-stub-live.json`, `api-e2e-mcp-org-stub-live.json`. |
| AGY-06 | Pass, bounded | Runtime capability/current GraphQL 2 pass; 21 opt-in agent tests skipped. Focused Codex/Claude/manager/trace units 73 pass, web non-AGY launch/store/form 55 pass. Logs `/tmp/agy-api-06-server.log`, `/tmp/agy-api-06-server-focused.log`, `/tmp/agy-api-06-web.log`. No claim of real non-AGY provider Team restore. |

All completed cases and their fixture-repair checkpoints are in the ledger. No case remains running. Team inter-agent roundtrip, Team restore/continuation, and real Org execution are unproven because Team creation fails; none is inferred from stub delivery.

## Changed-boundary and acceptance matrix
| AC / boundary | Executed direct evidence | Result |
| --- | --- | --- |
| AC-001 availability/model | GraphQL capability test; browser selectable AGY model Gemini 3.8 Flash Low; actual CLI 1.2.10 | Pass for tested host/version; unavailability error negative control not re-executed. |
| AC-002 Team/Org identity and real member delivery | Team create rejected before process; AGY standalone identity and stubbed member MCP are lower boundaries | **Fail critical**. |
| AC-003 exact binding/restore | Live backend process create/exact restore, immutable identity and conflict/moved workspace rejection | Pass below GraphQL; Team continuation not tested. |
| AC-004 shared workspace isolation | Capsule unit tests two run-specific paths and no user `.agents` mutation; live selected workspace file/shell targets | Pass bounded; concurrent provider turns not re-executed independently. |
| AC-005 existing runtimes | Focused manager/Codex/Claude/trace and web regression pass; current GraphQL contract pass | Pass bounded; real non-AGY provider runs not rerun. |
| AC-006/007 high-trust and explicit-off denial | Fresh browser default-on/explicit-off AGY runs; denied `TOOL_DENIED` despite turn completion; no actionable approval card | Pass. |
| AC-008 canonical chat/trace reload | Fresh live/reloaded tool cards and normalized raw-trace extraction; assistant text visible | Pass for tested standalone run; Team stream/trace blocked. |
| AC-009 draft policy | Web focused store/editor suites and fresh standalone browser selection on; explicit-off persists for tested run | Pass for drafts/standalone; real Team/Org launch fails. |
| AC-010 DONE/error convention | Fresh exit0/exit8/not-found DONE→SUCCESS green; denied ERROR→DENIED; output retained; no exit code in trace | Pass. |

## Broader validation and platform
- Decision: **Required and executed**. MacOS 26.5.2; Node v22.23.1; pnpm 10.28.1; AGY CLI 1.2.10; Chrome browser at `http://127.0.0.1:3000/workspace`. The documented `pnpm dev` stack reported `DEV_SERVER_READY` 8000 and `DEV_WEB_READY` 3000. Browser inspected web-equivalent Nuxt renderer, not Electron shell; no shell-specific code changed and actual desktop app was not touched.
- Fresh denial run `daily_assistant_a3279e4f5e1247ffb181647c5891eeb7`: AGY new draft selected default on, explicit switch off, harmless `printf AGY-API-DENIED-924`; live Activity showed one `DENIED` non-green card; after browser reload/reopen still `DENIED` with Error and chat `Tool execution denied.` Trace sequence 3: `TOOL_DENIED`, `provider_state=ERROR`, status denied, no shell exit. This closes the previous pre-refinement FAILED-vs-DENIED reload uncertainty.
- Fresh default-on run `daily_assistant_9e802a3c056845b88c4a882b88f7494e`: exit0, exit8 and nonexistent-command controls all rendered green `SUCCESS` live and after reload. Trace sequences 3/5/7 each `TOOL_EXECUTION_SUCCEEDED`, `provider_state=DONE`; output respectively marker, null, visible `command not found`; **no shell exit code stored**. Assistant prose reported exit codes but is not treated as machine-readable trace status. No `AGENT_SEGMENT_LIFECYCLE_INVALID` observed in browser or dev log.
- `api-e2e-browser-live-evidence.json` stores concise run IDs, UI observations and extracted trace fields. The two test-only runs were terminated in the UI; retained historical traces under this worktree's development data root for audit, not production data.
- Real AGY scoped Team/Org MCP opt-in tests invoke `send_message_to` from AGY but inject `deliverLogicalMessage` stub; they prove provider-to-AutoByteus MCP, **not** recipient activation/response. The durable new E2E is designed for actual GraphQL/WebSocket Team delivery and exact member attribution after the implementation fix.

## Persisted data, legacy, and cleanup
- Approved transition: **Directly Usable — No Migration**. Existing generic raw-trace replay tests (8 in focused server suite) passed; fresh AGY normalized traces survived reload. No released old AGY data, no provider NDJSON archive, no version-specific shim, no compatibility-only test added. Neutral IR-001 event path not reintroduced.
- Owned Vitest servers/definitions/team fixtures/workspace roots were closed/removed by test teardown. Live standalone/MCP tests leave temporary dirs; identified current-run dirs were removed after evidence copy; upstream implementation-local JSON was backed up/restored so this run did not overwrite it. `pnpm dev` children stopped with Ctrl-C; ports 3000/8000 no longer listening; Chrome validation tab closed. Two terminated dev-test runs remain solely as evidence and are named above. CLI may retain its own provider-side conversation history; no global settings were changed. Validation-generated SDK `dist` folders were removed.
- Typecheck limitation: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` fails on pre-existing `rootDir=src` plus included `tests` TS6059; alternative `--rootDir .` exposes many unrelated existing errors, including legacy E2E test shapes. No typecheck pass claimed. Vitest transformed/imported new test successfully; full server build was an upstream implementation check, not rerun in this round.

## Durable coverage changes and validity
- **Added** `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` (opt-in `RUN_AGY_E2E=1`): real Team definition and member configs via GraphQL, actual Team WebSocket input, AGY `call_mcp_tool`→`send_message_to` lifecycle, real recipient communication/turn and exact sender/recipient run IDs, persisted member projections. Current execution fails at production Team-run creation. No source change; no durable test updated or removed.
- Existing Codex/Claude parity test fixture `refType` is stale relative to current `TeamMemberInput`; its behavioral assertion remains relevant, but it is not AGY evidence and was not altered here. The new test was corrected to current GraphQL. No obsolete test deleted.

## Confidence scorecard
| Category | Post-repository | Final | Final reason |
| --- | ---: | ---: | --- |
| Requirement/AC proof | 45% | 50% | Standalone/trace/UX direct proof, but critical Team/Org member path fails. |
| Changed-boundary execution directness | 65% | 75% | Browser/process/GraphQL direct on many seams; real Team stops at validator. |
| Cross-boundary realism/mock gap | 35% | 50% | Real standalone and MCP call, but Team recipient delivery still stub-only; real E2E blocked by defect. |
| Environment/config/identity/fixture fidelity | 75% | 95% | Actual AGY 1.2.10, isolated test runtime and documented dev preview; only version/environment portability remains. |
| Failure/edge/lifecycle/recovery | 50% | 75% | Direct denial/reload and exact standalone restore; Team continuation unavailable. |
| User-surface/browser/desktop shell | 75% | 95% | Fresh live/reloaded Nuxt rendered state; Electron shell N/A for web-equivalent change. |
| Durable regression relevance | 70% | 75% | New real Team E2E catches critical defect and existing suites pass; post-launch assertions await fix. |
- Overall: **59% post-repository → 74% final**, simple seven-category mean rounded. Applicable categories below 90%: requirement proof, directness, integration realism, lifecycle, durable regression. The 95% clean target is **not met** and critical AC-002 is **failed**; the average never overrides it.

## Preliminary classification and next route
- Preliminary finding **API-F-001 / Local Fix (implementation)**: current run-history shared launch-config validator excludes `RuntimeKind.ANTIGRAVITY_CLI`, blocking real Team and likely Org run creation. Expected `createAgentTeamRun.success=true` and two real member IDs; observed `success=false`, unsupported `rootTeam.defaultLaunchConfiguration.runtimeKind`. Review `src/run-history/store/run-execution-tree-shared-record-schemas.ts:77`, Team/Org current reader admission, and avoid touching historical migration schemas unless truly required. Code Reviewer should determine final failure origin/owner; implementation repair then API/E2E rerun of AGY-02 first, followed by Org launch, Team restore/continuation, full member attribution and remaining regression.
- Result **Fail**. Required recipient by reviewed-route failure rule: Code Reviewer, subject to `get_handoff_rules`. No delivery acceptance claimed.
