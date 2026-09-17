# API/E2E execution coverage report — ORG-STOPPED-CONFIG-20260917-001

## Latest authoritative result
**Fail — API-REV-001, round1, 2026-09-17; confidence83.6%, not a pass rate.** F-001 / B03 / SCN-002 / AC-004: actual Plus from either stopped Org member opens an unseeded new-run form instead of inheriting the existing run configuration as explicitly clarified by the user. No completion/delivery pass. Settings successes do not override this critical failure. External-runtime and live standalone/task preservation journeys remain incomplete.

## Authority / routing
Canonical directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions/tickets/in-progress/stopped-org-member-header-actions` (T). Workspace is T/../../..; branch codex/stopped-org-member-header-actions; HEAD36c149b26c429a0ca6689442fe2aea067533a638 plus uncommitted working files. All23 IR manifest hashes independently exact before/after.

- Requirements `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`: Approved SR-001/SR-002.
- Design `design-spec.md`, SR-003/DS-001; `solution-handoff.md`, `personal-stopped-config-comparison.md`, `bootstrap-handoff.md`.
- `design-review-report.md`, `architecture-review-revision-record.md`: ARCH-REV-001.
- `implementation-handoff.md`, `implementation-revision-record.md`: IR-001.
- `code-review-report.md`, `code-review-revision-record.md`: CRR-001 source Pass (not API acceptance).
- `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`: current API baseline; prior result/confidence N/A.
- Delivery revision/report and successful API test-review report: N/A, not reached.
- **Medium / High, Reviewed route.** On this Fail: Code Reviewer focused failure-origin review. Successful proportional test-code review is not requested. No durable API test-code edits; on a later actual Pass, separate reviewed-route test review can record Not Applicable if still none.

User clarification during actual execution: Plus creates a new Team/Org run taking the existing run configuration and allowing adjustments. Current written REQ-005/AC-004 and DS-004 only preserve ordinary definition-based navigation. This discrepancy is explicitly recorded, not silently treated as a source-contract violation already proven by CRR-001. Preliminary **Requirement Gap / Design Impact**; Code Reviewer confirms origin/owner before revised authority and implementation.

## Investigation / coverage decisions
Full upstream package and repository instructions examined before checks; ledger initialized before multi-case execution. Existing owner, query, form, retained-state, standalone model and guard tests remain valid for their asserted boundaries. Actual Org header source tests only assert navigation; they do not cover clarified inheritance. No tests deleted/rewritten to force a result. No production or durable test change by API engineer. Temporary real application journeys close transport/provider gaps; new inheritance regression should follow revised authoritative seed semantics.

Post-repository broader validation **Required**, executed actual listening server + real Nuxt app + real OpenAI provider, not synthetic renderer. No manual GraphQL mutation substituted for frontend Save/Create/Stop/Send. User interruption paused external model selection; resumed with focused Plus reproduction after clarification. B03 earlier narrow route-only partial Pass was explicitly superseded to Fail. Case checkpoints recorded; report reconciles all cases.

## Execution / ledger reconciliation
|Case / scenario|Result|Direct evidence / limit|
|---|---|---|
|R01|Pass|Narrow server26/2, frontend27/2. api-server-narrow.log / api-web-narrow.log|
|R02|Pass|Adjacent server107/20, frontend152/16. api-server-adjacent.log / api-web-adjacent.log; narrow suites overlap, not additive unique totals|
|R03|Pass|Production server build, sanitized bootstrap; isolated backend/frontend health200; official import only exact test DB|
|B01 / SCN-001 / AC001–003|Pass for native tested journeys|Direct and mounted real baseline messages, Stop, actual gear, reasoning low Save, Back/reopen. Exact two-leaf parameter deltas, untouched peers/defaults/IDs; only tree file changed during edits. Drafts/history/Activity retained; mounted native-picker attachment retained. No additional inference on inspect/Save. parameter-proof.json, tree snapshots and app AX|
|B02 / SCN-001 / AC002–003|Pass for native tested journeys|Both mini400k→gpt5.4 capacity1M, same runtime, low reasoning. Actual UI Save then ordinary Send: outbound OpenAI model gpt-5.4/reasoning low, status200 for both. Exact prior tokens recalled; same root/Agent IDs, no duplicate user inputs; mounted attachment persists. Four total provider requests (two baseline, two continuation). provider-native-continuation.jsonl / native-continuation-proof.json|
|B03 / SCN-002 / AC004|**Fail F-001**|Both actual Plus open blank Select a model; direct override Global Default with no seeded model; Run disabled. Detailed f001-plus-inheritance.md and f001-*.txt/json|
|B03 / SCN-003 / AC005|Supporting Pass, not overall B03 Pass|Live active-root/offline-leaf read-only. Controlled response loss: real Save committed, proxy delays then503; pending controls disabled, uncertain Save disabled, explicit Retry reads canonical medium. Exactly5 total UI Saves, no replay. Invalid/stale/activation ordering/pre/post-write filesystem faults covered by real-owner tests, not all reproduced live|
|B04 / SCN-004 / AC006|Not Tested to completion|Actual runtime menu and Claude model catalog loaded; no external run Create/Send or continuation. No private CLI auth borrowed. Standalone/task preserved by passing durable suites and bounded Team source comparison, not current live parity certification. Deferred after confirmed F-001|
|C01|Pass|Source23/23 and authored14/14 unchanged; one stopped root; owned tab/processes cleaned, portsclosed; cleanup.json / f001-preservation.json|

## Exact commands / environment
Run from assigned workspace unless cwd specified. Logs under T/validation.
- `pnpm -C autobyteus-server-ts build` → `api-build.log`, exit0.
- cwd server: `pnpm exec vitest run tests/unit/agent-org-execution/agent-org-member-model-config.test.ts tests/unit/api/graphql/types/agent-org-member-model-config.test.ts --no-watch` → `api-server-narrow.log`.
- cwd web: `pnpm test:nuxt components/workspace/org/__tests__/AgentOrgMemberRunConfigPanel.spec.ts components/workspace/org/__tests__/AgentOrgWorkspaceView.spec.ts --run` → `api-web-narrow.log`.
- cwd server: `pnpm exec vitest run tests/unit/agent-org-execution tests/unit/llm-management/run-model-selection-service.test.ts tests/unit/api/graphql/types/agent-org-member-model-config.test.ts tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/agent-team-execution/team-run-model-config-mutator.test.ts tests/unit/run-history/services/studio-run-model-config-service.test.ts --no-watch` → `api-server-adjacent.log`.
- cwd web: `pnpm test:nuxt components/workspace/org/__tests__ components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts services/agentOrgExecution/__tests__ stores/__tests__/agentOrgContextsStore.spec.ts stores/__tests__/agentOrgRetainedRecovery.spec.ts stores/__tests__/retainedOrgActivityTermination.spec.ts stores/__tests__/existingRunModelConfigStore.spec.ts components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts --run` → `api-web-adjacent.log`.
- User-authorized documented `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<W>/.local/api-stopped-config/data/db/production.db --dry-run`, then same without dry-run in direct TTY, confirmed IMPORT. Nine configured, zero replaced; no secret values recorded. Initial redirected attempt rejected confirmation with no writes. Fresh test DB initialization only; no user database migration/reset.
- `python3 T/validation/api-live/launch.py proxy|frontend|backend` (relative path from workspace). Minimal env/test HOME, .local/api-stopped-config/data; server51081, observer51082, Nuxt51083; both health200. Production readers/real persisted tree/real provider; no fixture transport substitution in normal journeys.
- CUA native Chrome accessibility controls because browser connector reported no available browser. Same real web app, actual native file picker; no Electron shell interaction. macOS, Node22.23.1, pnpm10.28.2, application zh-CN / OS German, Europe/Berlin. Exact Chrome version not captured; no cross-browser claim.

No fresh full frontend production build/strict typecheck claimed by API. Carried upstream web build and missing vue-tsc/default server test-root TS6059 qualifications remain. Production server full build passed; no strict/global-clean or paired-baseline claim.

## F-001 expected versus observed / source attribution
Existing root default model gpt-5.4-mini, direct member gpt-5.4/medium, mounted member gpt-5.4/low. Plus should initialize an adjustable NEW run from this configuration, without cloning history/runtime identity or altering source. Actual source settings are visible and durable, yet both Plus forms have no selected model. Direct override is also unseeded. This disproves inheritance without dictating whether revised design represents it as root defaults/overrides/resolved member configs.

Read-only source attribution: `AgentOrgWorkspaceView.openNewOrgRun` passes only definitionId in new-config route. `AgentOrgRunConfigPanel` begins draft from definition defaultLaunchConfig; `agentOrgRunConfigStore.begin` clears overrides. Team comparison: `TeamWorkspaceView.createNewTeamRun` seeds via `buildEditableTeamRunSeed(source.view.getConfigurationView())`. This is source comparison, not proof of actual standalone Team current browser behavior. Current route-only tests do not cover the missing acceptance premise.

Old root remains stopped/unchanged by Plus; only1 root exists. Thus failure is missing draft inheritance, not old-run mutation, a server persistence defect, missing key, or provider issue. Recommended focused upstream reconciliation, not a blind copy of Team internals or API-owned production fix.

## Confidence scorecard
Percentages measure validation confidence, not fraction of tests passed.
|Category|Post-repository|Final|Evidence / remaining gap|
|---|---:|---:|---|
|Requirement/AC proof|75|50|Critical clarified Plus fails; external/control incomplete|
|Changed-boundary directness|75|95|Actual header/form/API/canonical owner exercised; inheritance defect directly observed|
|Cross-boundary realism/mock gap|75|95|Real app/backend/OpenAI; only explicit fault scenario alters transport delivery|
|Environment/config/identity/fixture fidelity|75|95|Owned real tree/keys/providers, exact IDs/configs; synthetic definitions intentional|
|Failure/edge/lifecycle/recovery|90|90|Live active guard/response loss plus durable ordering/faults; not every fault live|
|User surface/browser/shell|50|75|Native browser paths exercised but Plus fails and external/control journey incomplete; shell unchanged/N/A|
|Durable regression relevance|95|85|Owner/editor controls strong; clarified inheritance has no adequate regression yet|

Overall post-repository76.4%; final **83.6%** (simple mean585/7). Critical proof incomplete; categories below90: requirement, user surface, durable relevance. Clean95% gate not met. Broader validation required and materially improved evidence, but found real failure. Not Blocked on missing environment; Fail origin review required.

## Persistence / compatibility / safety / artifacts
Directly Usable—No Migration: native retained schemaVersion1 tree used by normal stopped read/save/restore/Send; no ticket migration/schema shim. No compatibility-only runtime path or test retained. Fresh isolated DB normal bootstrap is environment creation, not user data migration. No production source edits or durable API test changes. Temporary launch.py/proxy.mjs/provider-observer.mjs retained with rationale/replay README. Provider observer passes through original fetch, logs only model/config/origin/status, never auth/prompt. Controlled503 occurred only after one real UI Save backend response; canonical reply not fabricated. No API approval/replay probe.

Evidence under validation/api-live: parameter-proof, tree-before/both-parameters/both-replacements, native-continuation-proof, provider-final, config-transport, uncertainty-proof, active-offline-settings, retained/continuation UI, f001 source/draft evidence, intake/final preservation, cleanup. Runtime worktree data and private credential DB remain ignored under .local for safe rerun, never attached. Captured AX files trimmed to test application where full browser chrome existed. No user conversation or server action performed.

## Cleanup / remaining work / route
Owned root stopped via actual UI before Plus reproduction. Closed only owned51083 tab. Terminated matched owned backend40161, proxy38907, Nuxt39214 and known Nuxt descendants39524/39525. Ports51081–51083 verifiedclosed. Removed only two generated untracked SDK dist trees absent at intake; all23 supplied source hashes preserved,14 synthetic authored hashes preserved. Existing unrelated user apps/servers/tabs untouched; no Git stage/commit/push/merge/release.

Next: Code Reviewer focused failure-origin review of F-001, likely Designer requirement/design revision to explicit inherited new-run seed. Preserve B01/B02/uncertainty successes. Rerun F-001 first, then finish B04 and remaining proportionate live controls. Eventual integration target origin/requirements/flat-agent-organization-model, NOT personal. No successful-test review/delivery readiness asserted.

## User-requested reporting addendum — F-002
Separate issue: empty Org model selection is reported as selected model unavailable. User Team screenshot actually shows `Team / needs a model before launch.` (accurate missing-selection hint), not absence of all messaging. Actual Org empty-state message and disappearance after model choice were observed in this round; persisted blank-form AX corroborates. See validation/api-live/f002-empty-model-diagnostic.md for exact text, reference image, expected distinction and test suggestions. Local Fix candidate pending Code Reviewer origin confirmation; no weakened launch validation requested. Not a new executable round; API-REV-001 remains Fail83.6%, F-001 unresolved. No standalone Team live retest or fix claimed.
