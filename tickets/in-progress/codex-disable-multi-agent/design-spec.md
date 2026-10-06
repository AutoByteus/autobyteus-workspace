# Design Spec — Correct Codex Native Multi-Agent Suppression

## Solution And Approval Basis
- Package: `codex-disable-multi-agent-20261006`; current solution revision: **SR-005**.
- Approved requirements: SR-004 / REQ-006–009 / AC-006–009, approval **SD-AP-001**: user, “Perfect. Since you found the correct arguments then, work on the tickets now. Let's go.” Approval follows the three actual-model inventory results. No intended-behavior change in this design.
- Behavior-defining supplements: None; diagnostics are evidence only. Product/UI: N/A.
- Design status: **Ready**; result classification: **Architecture Design Complete**. Source implementation/validation are not complete.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/investigation-notes.md`.
- Authorities read in full, 2026-10-06: solution-designer architecture-design.md and design-principles.md; root `DESIGN.md`; server `docs/design/startup_initialization_and_lazy_services.md`; design-spec template; repository/package AGENTS.md and root TESTING.md. Requirements-phase gates previously read in this conversation. Skill paths reside under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/`; project authorities are in the isolated worktree. design-examples.md: not used, no new structure needs it.
- Project/general design conflicts: None found.

## Current-State Read
The default Codex client manager already calls one launch-config owner, and all supported Codex create/restore paths acquire its workspace-scoped clients. That composer appends feature-disable flags after the existing environment-selected base args. Actual upstream definitions and model answers show those flags do not remove native collaboration; `agents.enabled=false` does. Existing per-thread product config adds AutoByteus MCP only, not a competing agents setting. Client lease/lifecycle, public run APIs, user auth/config and data ownership remain healthy and untouched. AE-001–010 in investigation-notes own the supporting observations.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Small**. One production policy constant/comment/composition naming correction in the current launch owner, focused tests and one documentation section. Durable runtime test evidence is additional coverage, not another runtime subsystem.
- `architectural_risk`: **Low**. Existing suppression policy is implemented with a verified external setting; no new API, persistence, security/auth, concurrency, deployment or ownership boundary. Nine controlled cases, three actual-model turns on 0.160.1 and one 0.160.0 capture bound external-control uncertainty. AE-002–005 trace existing consumers and unchanged thread config.
- Payload-versus-structure: many copied JSON/Markdown evidence files are payload. In-scope runtime structure is the existing launch-config file; no manager/thread/MCP/runtime architecture redesign. Content volume does not raise classification.
- Escalate before broadening: supported product path explicitly reenables agents per thread; installed supported dependency requires version gates/dual-policy handling; external MCP fails because the new control affects its boundary; restore requires identity/lifecycle changes; config/auth/store mutation becomes necessary. Return Design Impact or Requirement Gap and reclassify, not an opportunistic refactor.

## Architecture Investigation Evidence
| Evidence | Observation | Decision | Remaining uncertainty |
| --- | --- | --- | --- |
| AE-001/002 | Shared launch composition, final suffix and exact client lease/start owner | Correct policy locally; preserve environment/lease/command parsing | Changed-source execution not yet run |
| AE-003–005 | Supported create/restore path and MCP-only thread config | No second policy owner or generic per-thread enforcement | Actual restored tool surface/MCP callable preservation needs validation |
| AE-006/007 | Old scalar/suffix oracle; stale skipped integration manager API | Update unit oracle; add actual request-definition coverage using current API/composition | Binary availability/gating must be truthful |
| AE-008 | Current stale integration docs/lazy services | Narrow docs correction, preserve startup/auth ownership | No GitHub-live status claim |
| AE-009/010 | Effective new setting removes native tools; prior flags don't; older local binary also accepts it | Clean-cut replacement, no old-feature fallbacks | Other models/earlier versions/spawn enforcement not certified |

## Intended Change
Replace the old four-argument native-feature suffix with exactly `['-c', 'agents.enabled=false']`, still appended last by `parseArgs()`. Rename the private constant to `AUTOBYTEUS_CONFIG_OVERRIDES` (or equally precise native-agent policy name) and correct its comments. Preserve parseBaseArgs, command/timeout resolvers, fresh arrays and all other process/thread settings. Do not edit personal Codex config, models cache, app-server manager or MCP implementation. No additional feature flags, toggles, prompts, interceptors or compatibility/version branches.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Kind | Approved basis | Supported trigger / evidence | Target / preserved outcome | Production path / lifecycle |
| --- | --- | --- | --- | --- | --- |
| BEH-002 | System/Operational | REQ-006/007/009; AC-006/007/009 | SCN-002 ordinary run/member/copy create or restore; SCN-003 configured command/args; AE-001–004 | New process has effective native disable, including conflicting base/config settings | DS-001 + DS-003, at ordinary new client generation before thread/start/resume |
| BEH-003 | Contract | REQ-008; AC-008 | Same supported scenarios; AE-002–005/008 | Personal auth/config, external scoped MCP, native ordinary tools, model/thread identity/reuse and other runtimes unchanged | DS-001/002; existing bootstrap, lease, event, MCP authorities |
| BEH-001 | Operational evidence | REQ-009; AC-006/009 | Historical inventory diagnosis, AE-009/010 | Source-based executable oracle distinguishes actual tools from false scalar flags | Test-only observation of DS-001/003; not a new product spine |

## Relevant Supplemental Task Artifacts
Relative paths below are under the canonical ticket. Inventory/ownership lives in investigation-notes.
| Artifact | Purpose / related IDs | Relationship / status / approval |
| --- | --- | --- |
| evidence/diagnostic/ including manifest.json, scripts, summaries, assertions and raw evidence/live-evidence | Nine wire captures + three completed model inventories; REQ-006–009 | Completed feasibility evidence only; no normative approval required; cannot replace changed-source checks |
| evidence/version-01600/ | Prior binary control feasibility; REQ-006/009 | Completed no-auth capture, intentional failed inference; no broader-version certification |
| solution-history/sr-003-diagnostic/ | Previous diagnostic-only basis/result | Historical, not current requirements authority |
| tickets/done/project-task-manager-linked-delegation/ (repository-relative) | Existing intent and prior product failure | Historical read-only; no receipt/AC rewriting |
| Product / independent reviews | N/A | No Product work; independent review route determined after classification/rules lookup |

## Task Design Health Assessment (Mandatory)
- Change posture: **Bug Fix**.
- Current design issue: **No structural issue found**; behavior defect is evidenced.
- Root cause: **Local Implementation Defect** — ineffective config control at the correct owner, plus tests proving flags instead of outcome.
- Structural trigger check: duplicated policy/coordination ruled out by single ordinary composer AE-001/002; boundary bypass ruled out by create/restore lease path AE-003/004; placement/responsibility drift ruled out by runtime-management client launch config; shared-model looseness/persistence drift ruled out because no type/store changes; legacy pressure addressed by removing old suffix rather than keeping dual controls.
- Refactor needed now: **No**. Owner, API and fresh-array structure already fit the correction. Changing manager/thread/MCP would add unjustified blast radius.
- Design response: clean local replacement and actual upstream tool-surface regression. No structural deferral. Residual risk is untested dependency/model variants and changed-product validation still pending, not a known required refactor.

## Terminology
**Native collaboration** means Codex's `collaboration.*` tools and accompanying native multi-agent role/mode instructions, not AutoByteus tools supplied through MCP. **Launch policy** is the final config suffix on an AutoByteus-owned new process. It is not a runtime toggle or retroactive restart.

## Section Fill Order
Current-state/evidence/behavior informed removal and state decisions, then spines/ownership, reuse/files and sequencing. Classification was completed after the design. No invented subsystem or migration needed.

## Legacy Removal Policy (Mandatory)
**No backward compatibility; remove legacy code paths.** Remove the old feature-disable suffix and its misleading guarantee/comment and unit/doc expectations. No dual old/new flags, version detector, fallback or prompt-only wrapper. Historical evidence stays unchanged as evidence, not runnable production policy.

## Persisted Data / State Transition Decision
**Not Affected.** Only newly spawned process arguments change. No config/auth file writes, schemas, serializers, store readers/writers, cache/rollout rewrites, ID resets or disposal. Existing histories and exact thread IDs continue through unchanged start/resume. No migration plan or startup admission gate applicable. Supports REQ-008/AC-008; finding otherwise escalates before any data action.

## Data-Flow Spine Inventory
| Spine | Scope | Behavior | Start → end | Governing owners / importance |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002/003 | Supported Codex run request → model turn with correct native/external tools | Existing run manager → Codex runtime/thread → client launch; demonstrates real product reachability |
| DS-002 | Return-Event | BEH-003 | Codex notification/tool result → run/UI or collaboration consumer | Existing client/router/backend event pipeline; preserved, no new event design |
| DS-003 | Bounded Local | BEH-002/003 | Base args selection → final process args | launch-config composer; enforces precedence once per new process |

## Primary Execution Spine(s)
DS-001: `Supported Agent/member/copy create or continue request → Run service/manager (select Codex) → Codex backend bootstrap/thread owner → Workspace client owner (policy composition + spawn/initialize) → Codex thread/model turn (native definitions + granted AutoByteus MCP)`.

## Spine Narratives (Mandatory)
| Spine | Narrative | Main subjects / owner | Off-spine concerns |
| --- | --- | --- | --- |
| DS-001 | Ordinary run creation or restore selects the existing Codex backend. Bootstrap prepares workspace/model/prompt and scoped MCP; thread manager acquires the workspace client and starts/resumes the exact thread. At a new client generation the same composer supplies the final native-disable setting. Codex—not AutoByteus prompt text—omits native collaboration definitions; granted external MCP remains independently available. | Run, Codex thread, workspace client, model turn; existing run/thread/client owners | Settings, auth environment, MCP grants, skills |
| DS-002 | Existing RPC notifications and tool events are routed to the registered thread/backend event pipeline and its normal consumers. An AutoByteus send_message_to call remains an MCP/AutoByteus collaboration operation, not native send_message. | Notification, thread event, run output; existing router/backend | Event normalization, observers, scoped tool dispatcher |
| DS-003 | Existing JSON/string/default parser chooses base args. parseArgs copies those args and appends the authoritative agents.enabled=false pair. Default manager passes the array to its owned child process. | Base argv, final argv; launch-config owner | Env input, timeout, logging invalid JSON |

## Spine Actors / Main-Line Nodes
No new actors. Run service/manager selects runtime; Codex backend/thread manages context and exact create/restore; workspace client manager initializes owned processes; app-server/provider builds and uses tools. Public transport is an entry boundary, not the launch-policy authority.

## Ownership Map
- Run manager: run/backend selection and normal lifecycle; no native-tool policy duplication.
- Codex bootstrap/thread: model/workspace/MCP context, thread identity, router/lease association and thread start/resume.
- Client manager/client: exact workspace process generations, leases, handshake/RPC/process close. Must continue using launch-config for ordinary default creation.
- Launch-config: command/base-argument parsing and AutoByteus native-disable suffix; no auth/session/tool grant ownership.
- Existing MCP materializer/dispatcher: external tool grants/exposure/execution, independent of Codex native agent switch.

## Thin Entry Facades / Public Wrappers
GraphQL run creation and backend factory are existing entry/preparation boundaries over run/thread ownership. They must not acquire a new agents policy or bypass client leasing. No new public facade.

## Removal / Decommission Plan (Mandatory)
| Remove in this change | Why | Replacement owner |
| --- | --- | --- |
| AUTOBYTEUS_FEATURE_OVERRIDES old keys and feature-centric wording | Verified ineffective native-disable control | Existing launch-config with agents.enabled=false |
| Unit suffix expectations / conflict only for old key | Could pass while native tools remain present | Updated config-key precedence unit oracle plus API-owned upstream surface regression |
| Docs “real control still to be found” / old delivered guarantee | Diagnosis now found and measured effective setting | Same integration-doc section, retaining historical FAPI-013 and truthful limits |
No production files/subsystems deleted. Historical finalized ticket/evidence is not decommissioned or rewritten.

## Return Or Event Spine(s)
DS-002: `Codex notification/tool result → Existing client/thread router → Backend event pipeline → Run consumers/UI`, unchanged. External MCP tool calls continue through the existing scoped AutoByteus dispatcher to collaboration, not a replacement native namespace.

## Bounded Local / Internal Spines
DS-003 parent owner launch-config: `Choose JSON/string/default base args → Fresh array + final disable pair → Default client factory → Owned spawn`. Matters because config/auth and custom base arguments may enable agents but the final process override must win. No new event loop/state machine.

## Off-Spine Concerns Around The Spine
| Concern | Spine / owner served | Responsibility / reason | Avoided misplaced authority |
| --- | --- | --- | --- |
| User/provider auth and inherited env | DS-001 client | Existing external Codex auth/config authority | No AutoByteus auth vault remap or user-file writes |
| Model/workspace/skills | DS-001 bootstrap | Existing run context and resources | No tool-policy prompts/catalog rewriting |
| MCP tool grants/materialization | DS-001/002 bootstrap + dispatcher | Existing external collaboration exposure/callability | Do not strip mcp_servers or hide AutoByteus tools |
| Diagnostics/regression | DS-001/003 test owners | Observe real upstream definitions with positive control | Do not turn test provider/interceptor into production behavior |
| Invalid-JSON warning/timeout | DS-003 config/client | Preserve operational parser/deadline behavior | No parser redesign |

## Ownership Boundaries
Public run/backend entrypoints stay authoritative for run/thread acquisition; callers do not spawn ad-hoc Codex children. Launch-config is the existing internal process policy boundary. User Codex files remain external authority and read-only; inherited auth behavior is unchanged. Native upstream tool control does not authorize changing AutoByteus's MCP grants.

## Boundary Encapsulation Map
| Boundary | Internal mechanism | Caller / forbidden bypass | Correction needed |
| --- | --- | --- | --- |
| Client-manager beginAcquire | Exact generation, default args/handshake/close | Thread manager; don't replace with per-task direct child spawn | None |
| parseArgs / resolveLaunchCommand | Existing env selection + authoritative suffix | Default client factory; don't duplicate new switch in bootstrap/prompt | Local suffix change only |
| Existing MCP session/materializer | URL/grants/allowed tools | Bootstrap; don't conflate native switch with external tool removal | None |

## Dependency Rules
Preserve existing direction run → backend/thread → client manager → launch-config/client → Codex. No reverse imports from launch-config into domain/MCP, no task-specific agents policy and no process-env/config rewriting. Test adapters may observe actual upstream requests but must use changed production composition for treatment, not hardcode its correct suffix.

## Interface Boundary Mapping
| Interface | Single owned subject / responsibility | Identity shape |
| --- | --- | --- |
| parseArgs(): string[] | New launch argv, existing selection + policy | No selector; fresh argument vector |
| resolveLaunchCommand(): string | Launch executable selection | Existing command string |
| beginAcquire(cwd): lease | One workspace-generation acquisition/release | Canonical resolved workspace path; existing exact lease |
| thread/start or thread/resume | Create or resume thread | Existing cwd/model/context; exact stored ID on resume |
All signatures unchanged. No generic ambiguous run/thread/recipient selector added.

## Interface Boundary Check
All listed interfaces remain singular with explicit subjects/identities; ambiguous-selector risk Low. No corrective interface work warranted.

## Main Domain Subject Naming Check
Run, Codex thread, workspace client and launch args remain natural subject names. Rename private feature-specific constant/comment to configuration/native-agent wording because agents.enabled is not a features key; no external naming change.

## Existing Capability / Subsystem Reuse Check
Reuse runtime-management/codex/client launch composition and leasing; reuse bootstrap/MCP materializer unchanged. Extend existing unit and integration testing locations. Create no runtime helper/subsystem.

## Subsystem / Capability-Area Allocation
Runtime-management client capability owns the corrected process policy; agent-execution Codex/MCP capabilities continue owning thread context and external tool exposure without edits. Implementation owns source/unit self-checks, API/E2E owns durable upstream/system coverage, Delivery owns documentation sync and finalization/verification gates.

## Draft File Responsibility Mapping
Existing launch-config file is sufficient for the policy, its unit file for parser/order checks, current integration folder for upstream transport/tool oracle, and integration module docs for operational guidance. No mixed ownership discovered in this first pass.

## Reusable Owned Structures Check
N/A — no repeated new converter/schema/type/logic. Retain one private suffix constant in its existing owner. Test helpers are test-owned; no extraction into a production “compatibility” utility.

## Shared Structure / Data Model Tightness Check
Existing string[] argv has one explicit meaning. No new shared data model or redundant parallel flag representation; remove old suffix, keep only the effective pair. No type extraction needed.

## Final File Responsibility Mapping
All paths below relative to `autobyteus-server-ts/`.
| File | Owner / concrete responsibility | Change |
| --- | --- | --- |
| src/runtime-management/codex/client/codex-app-server-launch-config.ts | Existing process launch composition | Replace suffix, rename private constant/correct comment, retain parser/command/timeout |
| tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts | Implementation self-checks | New suffix + conflicts; preserve base/JSON/fallback/fresh-array checks |
| tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts (suggested new file; API/E2E-owned) | Actual real-binary model request definitions using production argv | Positive unsuppressed baseline, production treatment, conflicting file/custom config, preserved ordinary/MCP surface and cleanup where appropriate |
| docs/modules/codex_integration.md existing override section | Delivery-owned documentation sync | Effective command, precedence, separate external MCP, historical failure + measured limits |
No production manager/thread/MCP changes planned. Validation may reuse existing appropriate tests rather than edit those owners. Any additional source impact requires evidence and scoped recovery.

## Applied Patterns
Existing configuration composition and exact resource leases are reused; no new pattern/framework.

## Target Subsystem / Folder / File Mapping
Use the existing `runtime-management/codex/client/` production owner and mirrored `tests/unit/` / `tests/integration/` client folders. The policy stays beside client launch, not frontend/task/MCP. Docs stay in the module doc. No moved folders or structure depth changes.

## Folder Boundary Check
Existing client folder is clearly transport/process-control, mirrored tests are test-only and docs are off-spine operational guidance. Mixed-layer/over-split risk Low; no extra one-function folder/module necessary.

## Concrete Examples / Shape Guidance
Good: base args `['app-server','-c','agents.enabled=true']` become `['app-server','-c','agents.enabled=true','-c','agents.enabled=false']`; private config enabled=true likewise loses to CLI. JSON selection still precedes string fallback; custom executable remains selected separately.
Avoid: new policy inserted before conflicting custom args, keeping both old/new disable strategies, adding a “don't spawn agents” prompt, or asserting config.enabled=false alone without observing definitions.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Why considered | Decision / clean-cut action |
| --- | --- | --- |
| Keep old feature flags alongside new control | Speculative older-install support | Rejected; tested current/prior binary control sufficient for bounded scope, no approved compatibility framework |
| Version/catalog gate or unknown-key fallback | Unmeasured releases | Rejected; no automatic minimum-version/legacy branch; report limits and escalate evidence of incompatibility |
| Prompt-only or tool interceptor fallback | Prior native misuse symptom | Rejected; use effective upstream control at the existing owner |

## Derived Layering
N/A — no new layer. Existing run/thread/client/provider layering absorbs the delta.

## Change / Refactor Sequence
1. Implement local suffix replacement and updated focused unit cases in the isolated worktree; remove obsolete constant/comment/oracles, no temporary dual policy.
2. Run relevant implementation-scoped checks using current source/build under TESTING.md; inspect unexpected failures instead of silently broadening scope.
3. API/E2E adds/runs durable no-auth local-provider native-surface regression through changed production composition, positive control and isolated resources; then bounded authenticated inventory and scoped MCP/lifecycle/create/restore checks.
4. Delivery syncs the module docs to actual validated behavior, obtains explicit user verification and completes configured finalization/cleanup. No automatic release/deploy authorized by this design.
No migration or forced existing-server restart. New policy becomes effective through ordinary new process lifecycle.

## Key Tradeoffs
Small correct-owner change avoids unnecessary runtime/MCP/auth coupling. Raw request definitions provide a stronger oracle than feature scalars; completed live answers corroborate but do not prove actual spawn enforcement. Keep binary-dependent tests honestly gated and retain exact source/version/model/cleanup evidence. Broad dependency guarantees are outside this corrective package.

## Risks
- Current diagnostics predate changed source; passing prior captures cannot certify implementation.
- Existing running shared app-server won't retroactively change; verify a test-owned new generation, never kill user's app.
- Raw upstream thread overrides can reenable agents, but current supported product config does not; source discovery otherwise escalates.
- Other dependency versions/models and actual spawn enforcement remain untested unless downstream validation adds bounded evidence. Do not claim GitHub issue closure/version fix.
- Existing gated manager integration test is stale (AE-007); a skipped/invalid API test isn't a pass. Use current lease API without broad unrelated cleanup.

## Guidance For Implementation
Read approved requirements and this spec first. Work only in the recorded worktree/branch. Keep production patch confined to launch composition; preserve exact custom parsing, independent arrays and unmodified provider env. Unit cases should include `agents.enabled=true` in custom string/JSON and prove authoritative suffix/order; retain old-feature custom args unchanged if supplied by user, but do not append them as AutoByteus policy.

Implementation self-checks should target launch-config and relevant current client-manager/client/bootstrap/thread/MCP unit tests; use documented package commands with `vitest run --no-watch` and actual task source. Do not rely on stale integration getClient/acquireClient/releaseClient or test skipped blocks as success. Produce implementation-owned handoff with changed files/checks, approved basis, classification and truthful limits; downstream executable tests belong to API/E2E.

API/E2E guidance: use retained diagnostic harness as evidence/method, not copied standalone hardcoded treatment proof. A durable request-capture probe must launch real Codex with args from changed production parseArgs/default manager, test private enabled=true config and conflicting custom args, extract `input[].type=additional_tools` namespace declarations as well as ordinary tools, assert positive baseline has native collaboration and treatment has none/native role tags absent, preserve core tools and applicable AutoByteus MCP under existing grants. Deliberate HTTP 400 after capture is transport/tool-surface evidence, not a completed-model turn. Check ordinary restore identity/new generation and exact cleanup through current API/system path. Bounded real inventory smoke must complete with treatment args from changed source and preserve personal auth/config; no actual native spawning needed. Use test-owned HOME/CODEX_HOME/workspace/provider/MCP/system data; protected temporary external auth copy only if needed, delete it and don't retain secrets/raw env. Follow full TESTING.md. Retain evidence source commit/diff, exact binary/model, assertions, gating/exclusions and cleanup. Return genuine requirement/design findings to Solution Designer.
