# API/E2E Coverage Investigation

## Meta and authorities
Round 1, initial IR-001 intake, 2026-10-13. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`, HEAD `cd685b6407cd847db52b4a2d7a45b486287fac52`. Read complete requirements SR-001, investigation E-01..13, design SR-002, solution revision record, architecture handoff, implementation handoff/revision/local evidence. Canonical package is this folder. Architecture/source review and revisions, Product supplements, prior API/DR: N/A — not applicable. User screenshots are context, not normative behavior. API revision will start at API-REV-001 after completed result.

Classification **Medium / Low**, Direct Low-Risk; successful output Delivery, test review **Not Required — direct low-risk route** (subject to configured routing). No source changes planned. Legacy removal and persisted data checks reviewed: stopped runtime-view fallback removed, active live authority intentionally retained; persisted formats Not Affected.

## Behavior / scenario map
SCN-001..004 all supported; none contrived added. BEH-001/REQ-001/002: stopped parent gear → Save → accepted canonical model/config remains in mounted summary/editor; repeat, reopen, Team followers/member overrides and unrelated instance. BEH-002/REQ-003: Cancel/no-write, refused write retains draft, committed read failure locks and read-only retry. BEH-003/REQ-004/005: preserve active restrictions, root kinds, runtime/conversation identity; actual source-current isolated desktop, zero quota, owned cleanup. AC-001..006 map to cases below.

## Changed boundaries
| Surface | Changed / evidence / remaining risk |
|---|---|
| Frontend component/state, desktop renderer | Yes: canonical stopped snapshot and save settlement; component/store tests direct local evidence, mocked transport leaves real API/publication gap. |
| API transport | Reused public reads, no wire change; real backend readback and actual renderer required. |
| Browser/user journey | Yes: still-open disclosure and summary; desktop mandatory AC-006. |
| Backend/domain, auth, native shell | No source changes; owned public API fixtures + actual Electron exercise integration, no new auth/shell claim. |
| Lifecycle/worker/external CLI | Preserved: restrictions/no starts on Save, next-message same conversation. Scripted AGY replaces only external runtime; no paid inference. |
| Persisted-data transition | Not Affected; no migration coverage needed. Read saved selection normally; never patch persisted trees. |

## Project execution discovery
Read task-worktree AGENTS.md, DESIGN.md, TESTING.md (242-line current guide; NOT older main-checkout guide), web/server AGENTS.md, README testing/dev/packaging sections, package scripts, web Vitest config, docs/isolated-app-instances.md and existing probe/fixture source. No closer TESTING found. No conflict. Build/test/dev serialized per worktree. No secrets required. Do not stage SDK dist. Current dependencies installed upstream.

| Component | Setup/readiness/cleanup |
|---|---|
| Web repository tests | `pnpm -C autobyteus-web test:nuxt ... --run`; Happy DOM/Nuxt; narrow first then affected suites. |
| Server build/API | `pnpm -C autobyteus-server-ts build` (prebuild shared outputs/Prisma), gated delegated-copy E2E in clean environment; test-owned HOME/database and public API fixtures. |
| Real backend | Existing delegated-launch-defaults probe starts dist/app.js on free loopback port, private HOME/data/SQLite, scripted AGY and Grok; health endpoint readiness; exact owned group cleanup. |
| Desktop | Project isolated-app CLI start --build, or verified current --from-worktree; free ports, isolated profile. Register owned backend through Node Manager UI, open its desktop window. Never use installed app or user data. Stop exact instance, verify port/root cleanup. |
| Fixtures | Existing GraphQL definition creation and actual UI/composer → real tool delegation. AGY CLI answers scripted calls and logs model/conversation argv. No secrets or provider inference. Remove only owned roots. |

## Coverage validity inventory
| Path/group | Decision | Action |
|---|---|---|
| ExistingRunConfigEditor.savedSnapshot/delegatedSave component specs | Still Valid | Rerun actual row/read failure/ownership/active tests; controlled network not real backend proof. |
| existingRunConfigStore/delegatedLaunchDraftStore specs; run-settings, runSettings utilities, collaboration service/store | Still Valid | Broader affected regression rerun. |
| server tests/e2e/projects/delegated-copy-model-change.e2e.test.ts | Still Valid | Real HTTP/WS/MCP restrictions, all roots, continuity, own choices. Gate on scripted AGY, no paid runtime. |
| delegated-launch-defaults-probe DCP-001..005 | Still Valid, insufficient stopped-parent proof | Retain; run active/Team/Org cases on desktop; extend harness with focused stopped-parent cases. |
| Historical shape DLP-006, fresh defaults DLP cases | Out Of Scope | No changes or execution required. |

## Durable coverage decisions / planned cases
Add focused cases module and desktop mode to existing probe, no stale-test removal. Package script makes focused journey discoverable; header describes prerequisites/limits (no ticket-specific TESTING edits).
- SSR-001: stopped Agent parent, Agent copy + collaborator; Save same mounted summary/editor, repeated model, Cancel, reopen, no extra runtime starts/identity drift (AC-001/004/005/006).
- SSR-002: stopped parent Team copy default + follower/member own choice/own default + neighboring copy isolation (AC-002/004/006).
- SSR-003: network/rejected Save and post-commit read failure; truthful error and read-only retry (AC-003/005/006).
- REP-001 narrow component/store; REP-002 broader web; API-001 eight backend continuity/restriction cases.
- DCP-001, DCP-002, DCP-003, DCP-004, DCP-005: active/Team/Org/rejection/resume regressions (AC-004/005).
Same-model thinking/fast settings-only applies where runtime provides settings; AGY fixture has none. Durable mounted component uses configurable schema and checks canonical settings labels (do not pretend AGY supports it).

Ledger required: multiple long-running cases; `api-e2e-test-case-ledger.md` initialized before execution. Each probe writes case evidence immediately and ledger checkpoints. Exact commands/results recorded as run.

## Repository plan / confidence gate
Narrow component/store → affected web suite → current server build + scripted API suite → confidence assessment → actual desktop. Initial confidence not scored as completed evidence. Broader validation **Required** irrespective of local pass: AC-006 mandatory, API publication/real desktop gap. Expected final >=95% only if critical criteria proven. No missing dependency or reroute now.

Temporary probes: none planned; safe fixture diagnostics retained if needed. Not tested by intent: paid providers, user's installed app/data, cross-platform native packaging (unchanged). Not user-only excuses for AC-006. Proceed Yes; durable changes Yes. Preserve failed attempts and classify harness vs product truthfully.

## Post-repository decision (before desktop)
REP-001 Pass 3 files/46 tests; REP-002 Pass 25 files/170 tests. Server build Pass. API-001 Pass 6 tests grouping DCM-001..008, actual HTTP/WS/MCP/scripted CLI; log `evidence/api-server-e2e.log`. Source current, no skip. Commands retained in execution logs and ledger.

| Confidence category | Score | Basis / remaining gap |
|---|---|---|
| Requirements/AC proof | 75% | Local and API assertions, AC-006 not executed. |
| Changed-boundary directness | 85% | Mounted component real stores; desktop pending. |
| Integration realism/mock gap | 85% | Real backend API separately, not yet combined renderer. |
| Environment/identity/fixtures | 90% | Owned real runtime fixtures; desktop build identity pending. |
| Failure/edge/lifecycle/recovery | 95% | Mounted failure/ownership + public backend restrictions/continuity. |
| User-surface/desktop | 50% | No desktop evidence yet. |
| Durable coverage | 90% | Valid local tests and new durable probe, not yet executed. |

Overall arithmetic mean **81.4%**; no Pass. Critical criteria directly proven No; categories below 90 Yes. Broader validation **Required**, project desktop + owned real backend registered via production Node Manager; closes real publication and no-navigation gap. Native desktop bundled renderer, remote node backend (not injected Apollo), scripted runtime only. No conflict with system environment isolation; embedded instance deliberately receives no fake runtime overrides. Start fresh build via isolated-app with NO_TIMESTAMP=1 and empty Apple notarization settings per web README; exact build/asar hash and cleanup receipts recorded by adapter.

## Desktop attempt 01 / harness finding
Fresh build launched `iso-59252-bcc2`; asar/source receipt in `evidence/desktop-01/desktop-identity.json`. DCP-001 and DCP-003 Pass. DCP-002 failed before editing: sidebar root disclosure was collapsed (failure screenshot), while Settings correctly showed live Team copy and Stop. Existing `openTeamRun` blindly clicks selected Team row, toggling previously expanded row shut; `expandWorkspaces` does not open Team-run hierarchy. API-owned baseline harness Local Fix: explicitly open collapsed Team-run disclosure after selecting. No product changes; preserve failed attempt and rerun DCP-002/005. This is not a failed Save assertion or product defect.
DCP-004 attempt 01 reached real refusal and subsequent successful Save (screenshots), then its backend-restart helper timed out waiting for chat: desktop hash-only `goto` retained open Settings whereas original HTTP browser goto reloads. Adapter correction: explicit renderer reload after the owned backend restart, before chat reopening. Not a same-view Save workaround; assertions already settled before this distinct restart step. DCP-005 has the same collapsed root harness issue as DCP-002. Both corrections require rerun, not inferred pass.
SSR-001 attempt 01 directly proved first/second same-view Save and Cancel plus collaborator DOM, but its new assertion helper searched only `startedAt` (copy shape); collaborator records use `addedAt`/`addedViaAgentRunId`. Retained wire explicitly contains collaborator accepted `dlc-alt-model`. Corrected the test selector to each existing public identity shape; no product edits or assertion weakening. Full SSR-001 rerun required for remaining isolation/reopen checks.

## Stronger settings-only coverage
Existing scripted Grok catalog exposes real reasoning-effort schema, unlike AGY. Add durable SSR-004 before further final execution: stopped parent → Team-copy engineer (Grok own default) → change thinking only low then xhigh → Save each time, unchanged model, real accepted llmConfig and still-mounted thinking control → reopen. This closes desktop settings-only evidence without any new fixture backend or quota. Fast is not offered by these scripted runtimes and remains mounted configurable-schema coverage. No intended behavior or production change.

Attempt desktop-02: SSR-001/002/003 + DCP-001/003/004 Pass; cleanup complete; zero page errors. Remaining baseline probe failures isolated to test assumptions: DCP-002 selected the last viewed copy lead then asked it to message itself, correctly refused as COLLABORATION_SELF_TARGET_REJECTED. Explicitly select the configured root `/manager` row before the delegated send. DCP-005 compared cold `grok-4.7` with hydrated `Grok 4.7` as though settings changed. Keep raw strings in evidence, compare known catalog-equivalent label AND exact public canonical engineer configuration unchanged; no relaxation of model/config/identity assertions. These are API-owned harness corrections; rerun both with SSR-004 on the unchanged desktop build. No product defect inferred from these failures.
Attempt desktop-03: DCP-002 Pass (root actor corrected); DCP-005 journey Pass, but report audit caught newly added engineer equality helper returned undefined: copy execution identity and launch source are separate records. Strengthen to require non-null execution plus source matched by address before/after, then rerun DCP-005. Existing stored-choice/no-other-overrides and resume checks had passed; do not count undefined equality as extra proof. SSR-004 reached real Grok Thinking menu, but generic reasoning schema uses `chat-thinking-option-reasoning_effort-*`, not `primary-*`, and displays `Xhigh`. Reuse established primary/generic menu selection from run-settings-live probe; assert actual current display and exact backend enum. Harness correction only; rerun.

Attempt desktop-04: DCP-005 Pass with present exact canonical execution/source unchanged; SSR-004 Pass with real Grok reasoning low then xhigh, model unchanged, same mounted editor, accepted llmConfig and reopen. All nine relevant desktop case IDs now have direct passing executions on the same source-current asar. Earlier harness failures preserved/resolved, zero page errors; all four exact instances and private node roots cleaned. No implementation failure or new product issue found.

Additional browser validation selected to exercise the same durable cases on original HTTP/Nuxt path and verify baseline helper corrections there: SSR-001..004 and DCP-002/005, same real backend/scripts/private roots, fresh sandboxed Chrome. It supplements (does not substitute for) desktop evidence. No durable production change since first desktop build.
SSR registration is explicit-case opt-in: preserve the preexisting default probe case inventory (some default DLP cases intentionally mutate definitions). The dedicated package script lists SSR and bounded DCP regressions. This avoids adding settings-only Grok assertions to an unrelated post-definition-edit fixture sequence.

## Final execution preparation / durable commits
Browser-01 Pass 6/6 (SSR-001..004, DCP-002/005), no page errors; original HTTP/Nuxt path verified with private real backend. Baseline probe corrections committed separately as `8126fa99b1` (Team disclosure, correct root message actor, canonical equality versus asynchronous friendly-name hydration). Focused settings cases/isolated-desktop adapter, opt-in package script and ledger wiring committed as `74889c1ed8`. No product/runtime source changed after implementation `cd685b6407`; all differences since that commit are test files and package script. All desktop runs reuse identical asar SHA-256 `55749a6189e5680f13bf5b2c254e50a6096a07ba1904dcc728055fab4116bc4b`, built fresh in desktop-01. Final consolidated nine-case desktop run uses this verified-current artifact and committed harness, not installed app.

## Final decision
Final consolidated desktop **9/9 Pass** on committed harness; browser **6/6 Pass**. All required cases resolved; zero page errors. Cleanup audit verifies all six owned node roots and every owned desktop removed, ports released, API fixture roots absent. See evidence/api-cleanup-and-identity.json and report Acceptance-Criteria Proof. Final scorecard: all seven categories **95%**, mean **95%** (post-repository 81.4%). Every critical AC proven; none below 90%; no user-only gap. Broader validation Required and completed. Result **Pass**. No requirement/design or product-failure reroute. Current report/revision API-REV-001; no prior completed result. Iterative harness attempts remain preserved within this baseline.
