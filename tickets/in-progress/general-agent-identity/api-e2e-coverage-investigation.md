# API/E2E Coverage Investigation — General Agent

## Baseline and authority
API-REV-001 planned; initial round, prior result N/A. SR-002 / IR-001, commit
8a4177f5b686bbaa9ce62448196c8948cded5e03. Small / Low, Direct Low-Risk.
All cumulative requirements, investigation, design, solution/history, exact prompt,
implementation/history and preview artifacts read. Independent architecture/source
review and Product supplements N/A — not applicable. Full paths are rooted at
/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/.
Implementation legacy/data checks agree: one stable selector, no compatibility
wrapper; platform definition Discard or Rebuild, history Directly Usable — No Migration.

## Discovery and surfaces
Read root TESTING.md (only applicable guideline), server/web AGENTS.md, package.json
at root/server/web, server/web README testing sections, server vitest.config.ts and
prisma-{env,global-setup,test-config}.ts, docs/isolated-app-instances.md and
skills/autobyteus-isolated-app/SKILL.md. No root AGENTS.md. Read production bootstrap,
provider, history index reader, discovery adapters/exposure and standalone host builder.
Vitest uses worktree tests/.tmp SQLite with explicit reset; never production DB.
Web checks require Nuxt prepare and --run. Live probe owns free ports, sanitized
backend/frontend and temp SQLite; it cleans only owned children/state. Full user
journey requires isolated worktree build and reported ports, not installed app.
Environment available: pnpm 10.28.2, Node, Chrome, codex CLI 0.160.0. Provider keys
will not be copied/read from user data. CLI authentication availability not yet proven.
Affected surfaces: authored content/config, startup/file persistence, GraphQL payload,
default Chat renderer-to-backend launch, existing native/MCP discovery. Shell source
unchanged; packaged startup/content is relevant for the full user journey.

## Scenario and evidence map
| Cases | Scope | Planned evidence |
| --- | --- | --- |
| R01 | SCN-001/003, AC-001–004/006 | focused bootstrap/default Chat tests, exact hash/config against base |
| R02 | SCN-002, AC-005 | discovery/exposure plus real existing root/admission/catalog coverage; empty/no-context and Agent/Team contract |
| R03 | SCN-001, AC-001–006 | add in-process GraphQL coverage for actual bootstrap fresh/existing, reader-valid historical row; unaffected broader definition API suite |
| B01 | SCN-001, AC-001–004/006 | live probe C01/C02/C13 actual process restart/HTTP API/full installed file |
| D01 | SCN-001, AC-001/004/006 | isolated packaged desktop fresh Chat → same-ID launch/new displayed name; backend metadata and DOM |
| D02 | SCN-001, AC-006 | isolated restart with resulting stored history/reference usable, no rename/reset |

SCN-003 is an exact authored-policy/config requirement, not a guaranteed model
choice; no deterministic delegation/skill-use benchmark is authorized. No contrived
race or public-repository synchronization testing. No production source edits planned.

## Existing durable coverage validity
| Path / coverage | Decision | Reason |
| --- | --- | --- |
| server tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts | Still Valid | exact approved hash, complete config, current identity and same-ID refresh; strengthen historical proof via ordinary reader in R03 |
| server tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts and tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts | Still Valid | actual config and bindings, controlled lister; mock gap closed with existing root/candidate coverage |
| server tests/unit/agent-run-collaboration and tests/unit/agent-collaboration/collaborators | Still Valid | runtime contracts/eligibility unchanged |
| web focused chatDraftStore/chatLaunchService/AgentWorkspaceView/ExistingRunConfigEditor/AgentDefinitionForm tests | Still Valid | current name with stable default selector |
| web tests/e2e/chat-entry-live-probe.mjs C01/C02 | Needs Update (C01) / Still Valid (C02) | strengthen C01 full payload/template/config proof |
| same probe C13 | Needs Update | obsolete edit-survives-restart premise contradicts approved design AE-001/011 and platform-owned replacement test; replace assertions with exact shipped overwrite and missing-config restoration |
| other live-probe cases | Out Of Scope | unrelated Chat/skills runtime journeys; no whole-probe pass claimed |
| server package typecheck | Known baseline limitation | TS6059 rootDir/src includes tests unchanged at base; production build remains required |

## Durable coverage changes / removals
Add server tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts for R03.
Update C01/C13 in existing live probe. No files/cases removed. C13 obsolete assertions
are replaced, not used to alter correct production lifecycle. Approved exact-prompt
supplement is the independent content authority. No blocker/ambiguity from upstream.

## Execution plan
1. R01 narrow bootstrap/web checks and hash/base-config comparison.
2. R02 discovery/exposure/root/catalog/admission checks.
3. R03 added API coverage and affected definition API directory.
4. Complete seven-category post-repository scorecard before broader execution.
5. B01 targeted live-process probe; D01/D02 worktree desktop build/start/control/restart.
Record exact commands/logs and events in api-e2e-test-case-ledger.md.
Ledger required: multiple independent cases and long build/journey/interruption risk.

## Broader validation plan
Decision: Required (initial). Repository tests bypass actual packaged renderer and
process startup; selected Live API/Lifecycle plus Project Desktop Validation closes
those gaps. Expected target >=95%, every category >=90%, all critical AC proven.
Owned free ports and roots only; no service keys import absent supplied source.
Start desktop via pnpm --silent isolated-app start --build; preserve its instanceId,
controlPort, backendUrl/dataRoot/logPath. Read readiness and DOM; launch ordinary
Chat with installed eligible runtime if available, otherwise evaluate safe emulation
or report exact missing dependency. Control using project's attach-only browser CLI.
Capture semantic DOM/API plus supporting screenshots; stop only owned instance and
verify list. Live probe gets --cases C01,C02,C13, owned output directory.
Temporary desktop observations retained in ticket; existing CLI covers lifecycle,
so no new parallel desktop harness. No material shell feature changes to test beyond
packaged startup/default journey. No user application/data effect intended.

## Not tested / exclusions
Forced model collaboration decisions, public package, migration, unrelated shell
features and exhaustive provider matrix: out of approved scope, not confidence gaps.
Investigate execution failures against current assertions before assigning origin.
Post-repository scorecard/results: pending execution (no confidence/pass inferred).

## Repository execution checkpoint (2026-10-03)
R01: 9 server bootstrap + 30 focused web tests pass; exact approved bytes/hash and
base config equality pass. R02: 54 tests / 7 files pass (discovery/exposure plus
root/admission/catalog); real policy/root used, execution/model selection doubles.
R03 narrow: new 2 API tests pass. Broader `pnpm -C autobyteus-server-ts exec vitest
run tests/e2e/agent-definitions --no-watch`: 19 pass / 3 fail, 5 files. Failures:
agent-packages-graphql two cases cannot list teams; json-file-persistence-contract
queries removed TeamMember.refType. Tests and production API schema are unchanged
from base; no task-content/bootstrap dependency in those failing paths. Underlying
team listing error and baseline provenance need failure-origin review if unresolved.
No whole API suite pass claimed. Logs: api-r01-server.log, api-r01-web.log,
api-r02.log, api-r03-{narrow,}.log at canonical ticket. Narrow R03 briefly overlapped
R02 process tail; authoritative broader R03 ran afterward sequentially, using
worktree-owned reset DB. This overlap is not relied upon as sole evidence.

## Post-repository mandatory confidence scorecard
| Category | Score | Evidence / remaining gap / improvement |
| --- | --- | --- |
| Requirement / AC proof | 90% | exact content/config/default selection and API proven; actual desktop launched identity outstanding |
| Changed-boundary directness | 95% | real bootstrap/file/provider/GraphQL, direct configured adapters; process and package still pending |
| Cross-boundary realism / mock gap | 90% | GraphQL and actual root policy, execution doubled; live packaged launch closes gap |
| Environment/config/identity fidelity | 95% | isolated roots, real templates/config and same stable selector; package not yet checked |
| Edge/lifecycle/recovery | 90% | bootstrap overwrite/missing-file and valid historical reader; process restart pending |
| User/browser/desktop | 75% | unit/implementation preview only; actual worktree desktop required |
| Durable coverage quality | 90% | added linked API tests, stale C13 corrected; 3 broader unrelated failures unresolved |
Overall: 89.29% (simple mean). Critical AC-001 launched product proof still missing.
Clean target not met. Broader Required: B01 + D01/D02 as planned. Failures do not
justify changing production contract or silently deleting unrelated coverage.
Selected browser CLI skill located at
/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/SKILL.md;
the testing-doc mcps copy has no SKILL.md/launcher (documentation locator discrepancy).

## Execution correction checkpoint
B01 first attempt: C02/C13 pass; C01 ENOENT reading dist template during concurrent
D01 prepare-server build's clean-build-output. This is API/E2E-owned execution setup,
not production behavior. Re-run B01 sequentially after desktop build completes; first
attempt stays recorded, not an authoritative C01 proof. No production change needed.
Broader unrelated team failures explicitly originate in stale fixture helper:
definitionAdmissionService.scan/requireAvailable overrides missing; JSON persistence
case requests removed TeamMember.refType. Those files/schema/helper unchanged at
base. They remain unresolved, not task implementation defects and not clean-suite evidence.

Desktop build resolved default enterprise artifact flavor on task branch; inspected
build/scripts/build.ts confirms this only selects artifactBaseName, not renderer/server
behavior. App content matches this worktree; no signing/release/publish invoked.
Build output remains validation-local, not a public release artifact.
B01 sequential retry: exact installed bytes/hash passed; new API-body assertion
failed because test trimmed trailing newline while production parser intentionally
preserves it. Confirmed parser agent-md-parser.ts and C13 full payload. API/E2E Local
Fix: strip only frontmatter (retain body bytes), then rerun. No production defect.
D01: actual desktop launch produced General Agent and stable definition ID in
GraphQL resume config; Codex gpt-5.5 replied GENERAL-IDENTITY-OK, Idle. Installed
prompt equals approved bytes. CLI auth supplied by existing runtime normally; no key
source/vault import or user application data used/changed.

## Completed execution decision
Final B01 C01/C02/C13 all pass after own setup/assertion corrections. D01/D02 packaged
launch/config/reply/history/restart/reopen all pass; owned instance/root/ports cleaned.
Current authoritative report: api-e2e-execution-coverage-report.md, API-REV-001.
Final 94.29%: six categories 95%, durable regression 90%; broader adjacent API-F001/002
stale-test/setup failures remain unresolved. All critical General Agent AC directly
proven; result Fail requests focused origin/validity review rather than altering production
contract or silently excluding failed broader guard. No durable files removed.
