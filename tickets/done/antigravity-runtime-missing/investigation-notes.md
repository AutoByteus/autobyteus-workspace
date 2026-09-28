# Investigation Notes

## Bootstrap
- Package: antigravity-runtime-missing
- Date: 2026-09-27
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing
- Branch: codex/antigravity-runtime-missing
- Base: freshly fetched origin/personal, 82f3359cb9b98f0a5caa0dad79e24e9a58801a46
- Finalization target: origin/personal (delivery-owned; not yet authorized).
- Shared checkout on personal at a35060c58 is behind remote by 7 commits with unrelated dirty artifacts; untouched.
- Repository tracked AGENTS.md inventory: none.
- Initial evidence: user screenshot shows AutoByteus, Codex App Server, Claude Agent SDK in team runtime selector, no Antigravity.
- Screenshot: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_5db2271058a24af4927f118496b67e57/solution_designer_d718c89262ff46f383e7dbd230b0bd6d/context_files/ctx_3589e816952a__image.png
- Investigation in progress. Approval not captured; no architecture spec yet.

## Bootstrap Correction / Instructions
The initial tracked AGENTS.md note above was erroneous before worktree checkout finished: actual tracked instructions are `autobyteus-web/AGENTS.md` and `autobyteus-server-ts/AGENTS.md`; both read. Never stage all files, use nonwatch tests, delivery owns release tagging/version alignment. No source edited.

## Findings And Source Log
- E-001: `command -v agy; agy --version` -> `/Users/normy/.local/bin/agy`, **1.2.12**. Installed app Info.plist -> **1.4.89**.
- E-002: existing Electron server PID 4605 runs `/Applications/AutoByteus.app/Contents/Resources/server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data`. Read-only POST GraphQL `query { runtimeAvailabilities { runtimeKind enabled reason } }` returned three enabled runtimes and `antigravity_cli enabled=false` with unsupported-version/features reason. Saved `evidence/desktop-runtime-availabilities.json`. No server restarted and no run mutated.
- E-003: `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts`, lines 87-110: both `probeAntigravityCli` and `discoverAntigravityRuntime` require exactly 1.2.11. Installed packaged JS contains the same gates at lines 75/93. Rejection occurs before model discovery. `runtime-availability-service.ts` lines 99-104 converts discovery rejection to disabled availability.
- E-004: `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` lines 160-200 enumerates backend rows, then filters to enabled or selected only. Therefore unselected disabled AGY disappears. `stores/runtimeAvailabilityStore.ts` preserves backend diagnostic, but `selectedRuntimeUnavailableReason` only surfaces it for selected runtime. Component consumers include shared `RuntimeModelConfigFields.vue`, member overrides and application launch selectors.
- E-005: `agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` independently pins 1.2.11 and explicitly prohibits reusing the profile without validation. Merely lifting discovery gate would leave launches rejected or bypass required compatibility assurances.
- E-006: `agy models` succeeded and returned 14 models; required CLI flags present in 1.2.12 help. Captured version/help/catalog. Authentication/model availability in shell is not the immediate issue. Changelog reports 1.2.12 scrolling/quota/resume/UI fixes; not proof of full compatibility.
- E-007: Disposable `evidence/compatibility-probe.py` constructed a custom main agent with the exact eight existing native-tool names, launched the same NDJSON flags without auto-approval, and asked only for COMPAT-OK. CLI exited 0 with init/step_update/result and SUCCESS, exact COMPAT-OK response. This validates basic custom-agent construction and stream transport, NOT execution permissions, actual model-visible tool filtering, full identity, MCP or resume. `init.tools` lists a broad provider registry beyond allowlist; do not interpret this alone as a security regression (prior CLI may do the same).
- E-008: Prior approved requirements `tickets/done/antigravity-cli-runtime-redesign-20260924/requirements-doc.md` supports standalone/team/org usage, preserved other runtimes, clear unavailable errors and tool isolation. Existing capability unit test uses a fake 1.2.11 CLI; new version regression lacks coverage.

## Reproduction Attempt
- Installed worktree dependencies with `pnpm install --offline --frozen-lockfile --ignore-scripts`; success (two unrelated devkit missing-dist bin warnings). No tracked dependency modifications.
- Started task frontend: `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm -C autobyteus-web dev --port 3007`, log `evidence/frontend-dev.log`.
- Chrome tab at `http://localhost:3007/agents` loaded existing workspace/agent surfaces against actual Electron backend. Clicking Agent Teams timed out and reset browser automation; reconnect reported browser unavailable. Selector was not freshly captured. User screenshot + API response + exact UI filter establish causal chain; full rendered replay remains unverified.
- Production app/backend untouched. Probe used disposable temporary workspace; provider may retain generated project/conversation metadata. Only synthetic COMPAT-OK task sent.

## Supported Behaviors And Structural Inventory
BEH-001: user opens runtime selector / runs AGY (prior AGY supported scenario plus current request). BEH-002: CLI unavailable diagnostic is existing supported alternate; keeping unavailable option visible is proposed behavior, not previously approved. BEH-003: preserve other runtimes and persisted runs.
Payload surfaces: runtime availability `{runtimeKind,enabled,reason}`, dynamic model rows; CLI version/help/model text; stream init/result. Readers: availability store/shared selection composable; writers: backend discovery/provider.
Structural surfaces: backend compatibility admission and native-tool profile; shared selection and diagnostic presentation; existing tests. No evidence of needed persistence/API schema change. Future-version wildcard admission is outside proposed scope. Architecture decisions deferred until approval.

## Supplemental Inventory
All paths below relative to this canonical ticket directory; owned by Solution Designer, factual evidence only, no approval authority:
- `evidence/desktop-runtime-availabilities.json`: real installed backend failure, REQ-001/002.
- `evidence/agy-version.txt`, `agy-1.2.12-help.txt`, `agy-1.2.12-models.txt`, `agy-changelog.txt`: installed capability facts, REQ-001/003.
- `evidence/compatibility-probe.py`, `compatibility-1212.stdout.jsonl`, `compatibility-1212.stderr.txt`, `compatibility-1212-summary.json`: bounded feasibility probe, REQ-001/003; limitations above.
- `evidence/frontend-dev.log`: local frontend startup evidence, not proof of selector rendering.
- User screenshot absolute path in Bootstrap: problem evidence, not a normative new visual design.

## Product / State / Risk
Product Design requested: not stated; Product artifacts N/A. No new persistence obligations, no user-data loss authorized. Root cause confidence high; complete 1.2.12 compatibility not yet established. Approval question presented through asynchronous user input for full proposed scope versus compatibility-only correction. Current revision SR-001, Ready for Approval. No implementation, no design or downstream handoff yet.

Investigation frontend PID 16367 stopped after reproduction attempt; production Electron server untouched. Handoff lookup found no matching rule for pending requirements approval; no handoff sent. All authored changes are ticket artifacts/evidence only.

## E-009 — User Comparison With Codex/Claude (2026-09-27)
User challenged exact-version admission and noted Codex/Claude do not hard-code runtime versions. Re-read `runtime-availability-service.ts`, `codex/client/codex-app-server-launch-config.ts`, and `claude/client/claude-sdk-executable-path.ts`: these availability paths discover/probe executables, and where `--version` is run they use exit status rather than comparing the returned version string. This verifies the comparison for availability, not a claim about every SDK dependency or all source paths.
The earlier suggestion to admit only an additional 1.2.12 is inadequate for the user's concern. Revised direction under discussion: no exact-version runtime admission gate; validate required capabilities and preserve tool restrictions, reporting actual incompatibility. No explicit revised requirements approval captured. SR-001 is historical proposed scope, not approved and not forward-ready; it must be revised before any design. UI visibility change remains a separate unapproved proposal.

## Current Authority — SR-003 Approved (supersedes earlier scope/status notes)
The user explicitly ordered complete removal of hard-coded Antigravity versions, followed by “simpolify the code”. Approved requirements now use version-independent actual capability checks, not an expanded whitelist; frontend visibility changes are excluded. Earlier SR-001 scope/approval holds are historical and superseded. No implementation source edits by Solution Designer.

## Post-Approval Architecture Investigation — E-010–014
- E-010: Reconfirmed isolated branch/worktree and clean production source with `git status --short`; only this ticket untracked. No bootstrap actions from interrupted turn left source changes.
- E-011: Repository-wide symbol search (excluding historical tickets/build output) finds `discoverAntigravityRuntime` production callers only in `listAntigravityModels` and `AgyAgentRunBackendFactory.createBackend`; `probeAntigravityCli` only called by tests. `runtime.version` solely feeds `resolveAgyNativeToolProfile`. These are removable machinery, not externally exposed APIs.
- E-012: `AgyNativeToolProfile.cliVersion` is not consumed by capsule generation and never serialized. `agy-run-capsule.ts` consumes only its tool-name array for generated Markdown. Manifest fields are schema version 1, runId, agentName, workspacePath, agentMarkdownHash, skillAccessMode and skills. Restore reads existing Markdown/hash and does not regenerate it. Thus deleting CLI-version DTO plumbing does not migrate persisted data; schema version 1 is unrelated and remains.
- E-013: `AgyAgentRunBackendFactory` new path discovers models, selects by id, resolves profile, composes identity/capsule, launches. Restore already calls `listAntigravityModels` via `assertAvailable`, restores capsule and launches. Launch retains exact conversation, agent, model, realpath/cwd and auto-approval mode checks. Existing eight tools: view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image. No tool change needed.
- E-014: Current docs `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` lines 18/117 claim version-pinned policy; update current docs, not historical evidence. Unit native-tool policy asserts rejection of 1.2.12; capability fake CLI asserts old version rejection. Capsule/skill/live tests inject redundant profile objects. E2E native-image test hard-codes reported CLI version; report actual observed version or omit rather than assert 1.2.11. Live tests contain old ticket-specific artifact output paths; validation must use current ticket evidence or explicit supported output paths, not overwrite completed ticket artifacts.

## Architecture Evidence Status
Production code read, symbol consumers and persistence boundary verified. Existing live basic 1.2.12 probe succeeded with same declared native tools and NDJSON protocol, but broader run/restore validation remains downstream. No new policy framework, security grant, persistence schema, API payload or ownership boundary required. Frontend/backend wire shape remains `{runtimeKind,enabled,reason}`. No release/reinstallation performed.

## E-015 — API-ENV-001 Returned Incident / User Disposition Pending
Read API/E2E `incident-disposition-request.md` first, followed by environment incident, CRR-001 review, API-REV-002 execution report and prelaunch checklist at HEAD 84fe8318e. Findings below are attributed to those retained reports, not independent production inspection by Solution Designer.
The feature implementation adds no migration and retains its Not Affected design. A separate validation setup error launched branch backend with an inherited production DATABASE_URL despite temporary data-dir. It reached normal write-capable startup before owned process was stopped. Existing startup can conditionally upsert coverage, initialize vault metadata/DB-associated key or run pending app-data work. No-pending-Prisma-schema message does not establish absence of these effects. Retained evidence cannot prove actual writes, loss or zero impact. The installed app/backend was not patched/restarted, but this does not mean production data was untouched.
Corrected isolated functional checks (installed 1.2.12 new/restore, tools/skill, API and unchanged rendered team selector) passed per API-REV-002; overall validation remains Fail, not release-ready. CRR-001 settled API-owned Local Fix origin; do not repeat origin review or alter approved preservation intent. Additional successful-test review remains pending. No production inspection/copy, secret access, new process, recovery, rollback or migration has been performed/authorized in this Solution Designer round.
Next: present known/unknown effects to user; hold progression pending explicit informed disposition. Options are hold for separately scoped/authorized non-destructive assessment, or accept this specific prior-impact uncertainty for subsequent validation/review (not release approval, not proof of non-impact). User silence and original approval are not acceptance.

## E-016 — Explicit Fresh Browser Test Request
User requested API/E2E start backend + frontend and use browser tool to test. Recorded in browser-retest-request.md (SR-005). This changes the prior no-duplicate-rerun assumption: perform requested focused retest with pre-spawn isolation. It does not accept prior-impact uncertainty or authorize production inspection/repair/release. Approved product behavior remains SR-003.

## E-017 — Requested Browser Retest Returned Pass (API-REV-003)
Read browser-retest-request.md, API execution/revision report, retest/result.json, cleanup.json and preflight.json from af8946824. API/E2E records dedicated checked environment/owned targets before spawn, actual mounted browser interaction, Antigravity enabled/selected, 14 models, a real synthetic team launch and exact assistant RETEST-AGY-OK with Idle state. Solution Designer inspected retained response screenshot; no independent rerun performed. Owned test processes/tab/data cleanup recorded. Nonfatal MCP discovery warnings are not MCP-operation coverage. No source/durable-test changes this round. Functional retest request satisfied; overall technical Fail and API-ENV-001 prior-impact uncertainty remain, no user risk acceptance or Delivery receipt. No intended-behavior/design change.

## E-018 — Informed Continuation Disposition
Following incident disclosure and successful browser result, user explicitly ordered continuation and messaging API/E2E; exact directives/context in user-continuation-disposition.md. Record acceptance for progression, not evidence of zero impact. No new inspection/tests/source changes performed by Solution Designer. Remaining review/delivery gates and prelaunch isolation still apply.
