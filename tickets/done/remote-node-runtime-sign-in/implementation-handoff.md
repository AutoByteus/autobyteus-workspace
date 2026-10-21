# Implementation Handoff — remote-node-runtime-sign-in

Ticket folder: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in/tickets/in-progress/remote-node-runtime-sign-in/`
Worktree / branch: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`, `feature/remote-node-runtime-sign-in`.
Implementation commit: `c0b385524`, on base `origin/personal` `a22394f0c` plus the ticket commits up to SR-004 `2232dd788`. The ticket documents and evidence are committed after it.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / Low → direct implementation, no independent architecture review (`handoff.md`, 2026-10-21)
- Requirements doc: `requirements-doc.md` (SR-001 baseline; SR-003/SR-004 add the user's confirmation of the scope, with no REQ/AC change)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (current SR-004)
- Design spec: `design-spec.md` (SR-002)
- Supplemental task artifacts: `evidence/SD-probe-remote-signin.sh`
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

The node's server reports `agentRuntimeSignInBrowserAvailable: Boolean!`, which `AgentRuntimeStatusService` decides once from the platform and environment. The web reads it in the same `AgentRuntimes` query. The manager derives `nodeAccess` (`own` / `remoteDesktop` / `remoteStatusOnly`), and the row renders through `canSignInHere` / `canUpdateHere`. A remote node whose server can open a browser now offers Sign in for Codex and Grok, uses the remote wording (VNC Viewer), and shows the command-line hint "on that node". Update stays own-node only. The own node is unchanged.

- Implementation cycle: Initial
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: IR-001
- Related solution revision IDs: SR-002 (design), SR-003/SR-004 (scope confirmations, no design change)
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: Medium
- Architecture risk: Low
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: Confirmed
- Evidence and rationale: 5 server source/test files plus 1 new rule file; 9 web files; 2 docs; all within the existing owners. There is one additive read-only GraphQL field; the mutations, Docker image, persistence and remote-access policy are unchanged. The escalation triggers did not fire: no server-side refusal, no mutation, image or policy change, and the vendor page opens in the node's Chromium (IMP-09, IMP-12). Real-account completion stays R-01.
- Selected route: Direct API/E2E
- Lightweight implementation self-review completed: Yes. The diff was read against the design's file mapping, boundary rules and copy table. There is no dead code; `isOwnNode` and the D-3 comment are removed and nothing else references them. All files are well below 500 lines; the largest change delta is the row template at 41 lines.
- New design impact or escalation trigger: None

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Sign in on a remote node whose server can open a browser; same operation | `sign-in-browser-availability.ts` → `AgentRuntimeStatusService.signInBrowserAvailable()` → resolver `agentRuntimeSignInBrowserAvailable` → `agentRuntimesQueries.ts` → `useAgentRuntimes.signInBrowserAvailable` → `AgentRuntimesManager` `nodeAccess='remoteDesktop'` → `AgentRuntimeRow` `canSignInHere` (button, waiting text `signIn.waitingOnNode`, Cancel, did-not-finish) → unchanged `startAgentRuntimeSignIn` | Done. IMP-01 (fails on base) → IMP-04; real node: IMP-09 (API), IMP-12 (UI → vendor page in node Chromium) |
| BEH-002 | Remote note by node fact; no Update | Manager note: `node.remoteDesktopNote` / `node.remoteNote`; row Update pair and blocked line behind `canUpdateHere` | Done (IMP-04, IMP-12) |
| BEH-003 | Remote hint "Sign in from its command line on that node." | Row hint behind `canSignInHere`, copy `signIn.hintOnNode` when not own | Done (IMP-04, IMP-12) |
| BEH-004 | Node without a desktop stays status only | Rule false → `remoteStatusOnly` → no button, no hint, old note | Done (unit matrix IMP-02, IMP-04, probe ARP-08 IMP-11) |
| BEH-005 | Own node unchanged | `isEmbeddedWindow` → `own` regardless of the node fact (DEC-003) | Done (IMP-04 "whatever its server reports", probe ARP-01…07 IMP-11) |
| BEH-006 | Codex works after sign-in | Outside the change (vendor credentials) | Real-account check on the user's node (R-01) |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/runtime-management/agent-runtimes/sign-in-browser-availability.ts` (new), `agent-runtime-status-service.ts` (dependency `signInBrowserAvailable?` + method), `src/api/graphql/types/agent-runtimes.ts` (query field). The composition is unchanged because the service default is used (the design allowed this).
- Web: `graphql/queries/agentRuntimesQueries.ts`, `composables/settings/useAgentRuntimes.ts` (ref, reset on rebinding), `components/settings/agent-runtimes/agentRuntimesPresentation.ts` (`AgentRuntimeNodeAccess`, `canUpdateHere`, `canSignInHere`), `AgentRuntimesManager.vue`, `AgentRuntimeRow.vue`, `localization/messages/{en,zh-CN}/agentRuntimesSettings.ts` (3 keys each, texts as in the design).
- Docs: `autobyteus-web/docs/settings.md` §Agent Runtimes, `autobyteus-server-ts/docs/modules/agent_runtimes.md`.
- Tests: server `sign-in-browser-availability.test.ts` (new), status-service and resolver tests; web `AgentRuntimesManager.spec.ts` (remote desktop, remote status only, own node with fact false), `localization/messages/__tests__/agentRuntimesSettingsCatalog.spec.ts` (new); `tests/e2e/agent-runtimes-settings-probe.mjs`. The probe backend now has `BROWSER`/`DISPLAY`/`WAYLAND_DISPLAY` set empty, so ARP-08 stays the status-only remote case even on a desktop host such as this one with `DISPLAY=:0`.

## Important Assumptions

- AutoByteus server Docker nodes always report `true`: the image sets `BROWSER` for the server process itself, even when the container is started with it empty (IMP-10). That matches REQ-002, and per the user, real nodes are our Docker image.

## Known Risks

- R-01: real-account completion in the node's Chromium is not yet observed; the checks stop at the vendor page.
- R-02: the user's node must run a server with the new field (DESIGN.md rule 9). Until then a branch web build shows the load error for that node.
- R-03: unchanged; Chromium needs the shipped container security options.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: Boundary Or Ownership Issue (local), where one flag carried two facts
- Reviewed refactor decision: Refactor Needed Now (local): replace `isOwnNode` with `nodeAccess`; the node fact is owned by the status service
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as `Design Impact`: N/A
- Evidence / notes: the row asks only `canSignInHere` / `canUpdateHere`; no component other than the manager reads `windowNodeContextStore`; the resolver calls only the service.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None. The web reads the field unconditionally (DESIGN.md rule 9).
- Legacy old-behavior retained in scope: No
- Dead code in the touched files and modules removed: Yes (`isOwnNode` prop/computed, D-3 comment, obsolete doc sentences)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: Yes. `signInBrowserAvailable` is a node-level field, not on `AgentRuntime` rows or `types/agentRuntimes.ts`.
- Canonical shared design guidance reapplied: Yes
- Changed source files within size guardrails: Yes (status service 296, row 190, manager 131, resolver 150 non-empty lines)
- Notes: —

## Persisted Data Transition Check

- Approved decision: Not Affected
- Implementation follows it: Yes (nothing stored)

## Environment Or Dependency Notes

- The shell had no `pnpm` on PATH, so I used corepack's pnpm 10.28.2 through a shim (`corepack enable --install-directory /tmp/rnrs-bin pnpm`). The steps were `pnpm install --frozen-lockfile`, server `prebuild`, `nuxt prepare` and server `build` for the Docker and probe checks.
- Git had no committer identity in this environment; the commit uses the repository's existing author identity (`-c user.name/user.email`).

## Checks Run

Evidence is in `evidence/`. All checks ran on commit `c0b385524` except IMP-01, which ran on the base with only the new test applied, on Linux 7.0 with node v22.23.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web exec vitest run components/settings/agent-runtimes` with the new spec, before the fix | `22808255c` + spec only | Linux, vitest | web gate | BEH-001 reproduction | Fail as expected | `IMP-01-web-reproduction-fails-on-base.log` | `Received: "Status only. Update these runtimes on that node's computer."` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/agent-runtimes tests/unit/api/graphql/agent-runtimes-resolver.test.ts --no-watch` | `c0b385524` | Linux | rule, status service, resolver | BEH-001, BEH-004, QR-002 | Pass | `IMP-02-server-agent-runtimes-unit.log` | `Tests  55 passed (55)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `c0b385524` | Linux | server `src` | — | Pass | `IMP-03-server-typecheck.log` | `exit 0` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run components/settings/agent-runtimes localization/messages/__tests__` | `c0b385524` | Linux | manager, row, composable, presentation, catalogs | BEH-001…BEH-005, AC-003…AC-006, AC-008 | Pass | `IMP-04-web-agent-runtimes-unit.log` | `Tests  35 passed (35)` |
| IMP-05 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `c0b385524` | Linux | web | REQ-007 | Pass | `IMP-05-web-guards.log` | three `exit 0` lines |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (full) | `c0b385524` | Linux, HDD worktree | server | green-suite rule | Fail (3 tests in 2 files unrelated to the change, see IMP-06b) | `IMP-06-server-unit-full.log` | `Tests  3 failed \| 6403 passed \| 8 skipped (6414)` |
| IMP-06b | The 2 failing files rerun ×3, then compared in a tmpfs worktree at base `a22394f0c` and at `c0b385524` | `c0b385524`, `a22394f0c` | HDD vs tmpfs checkout | Claude provider turn race, package folder watcher | — | Not caused by the change (passes at the same commit in /tmp) → FU-003 | `IMP-06b-server-unit-failed-files-rerun.log` | `at branch c0b385524 … "Tests  2 passed (2)"` |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `c0b385524` | Linux | web | — | Pass | `IMP-07-web-unit-full.log` | `Tests  4628 passed \| 5 skipped (4633)` |
| IMP-08 | Diff of the image's `dist` vs the branch `dist` (.js) before mounting | `c0b385524` | image `autobyteus/autobyteus-server:beta` 191a2073ebee | — | TESTING.md Docker rule | Pass (only the 3 changed files differ) | `IMP-08-image-dist-diff.log` | `agent-runtimes.js`, `agent-runtime-status-service.js`, `Nur in … sign-in-browser-availability.js` |
| IMP-09 | `evidence/IMP-probe-branch-docker-node.sh <worktree>`: throwaway container, branch dist mounted read-only | `c0b385524` | Docker, 127.0.0.1, fresh volumes | server path end to end on a Docker node | BEH-001, AC-001/AC-002 up to vendor page, AC-009 (API) | Pass | `IMP-09-branch-docker-node-signin.log` | `{"agentRuntimeSignInBrowserAvailable":true}`, `"url": "https://auth.openai.com/log-in"`, `"url": "https://accounts.x.ai/sign-in?<query redacted>`; operations carry `command/step/error: null` |
| IMP-10 | Container started with `BROWSER`/`DISPLAY`/`WAYLAND_DISPLAY` empty | `c0b385524` | Docker | node fact on the image | REQ-002 | Informational: still `true` (the image sets `BROWSER` itself) | `IMP-10-headless-container-node-fact.log` | `BROWSER=/usr/local/bin/open-vnc-browser-url.sh` |
| IMP-11 | `node tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build --output-dir=/tmp/rnrs-probe-1792569620` | `c0b385524` | real backend (branch dist), Nuxt dev, headless Chrome | own node journey, headless remote node, privacy scan | BEH-004, BEH-005, AC-005, AC-006 | Pass (10/10) | `IMP-11-settings-browser-probe.log` | `Result: Pass`; `Pass ARP-08 A remote node window on a node without a desktop browser …` |
| IMP-12 | `node evidence/IMP-render-remote-desktop-node.mjs <worktree> evidence/IMP-12-render-remote-desktop-node`: Docker node (branch dist) + Nuxt dev, window bound as remote | `c0b385524` | Docker + Nuxt dev + headless Chrome, 1440/739 px, en/zh-CN | full web path against a real node fact `true` | BEH-001…BEH-003, AC-001 up to vendor page, AC-003, AC-004, AC-008 | Pass (4/4, no browser errors) | `IMP-12-render-remote-desktop-node.log`, `IMP-12-render-remote-desktop-node/*.png`, `result.json` | `"https://auth.openai.com/oauth/authorize?<query redacted>`; screenshots 12a (note, two Sign in, two hints, no Update), 12b (Signing in…, remote waiting text, Cancel), 12c (stacked 739), 12d (zh-CN) |

- Not run, and why: real-account sign-in completion (AC-001/AC-002 end, AC-007) needs the user's account on the user's node running this build (R-01, R-02); server E2E `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` and probe extensions belong to API/E2E. Headless-node testing beyond the unit rule and ARP-08 was dropped at the user's direction (2026-10-21): the nodes in use are our Docker image, which always has a desktop.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings → Agent Runtimes in a remote-node window (remote desktop and status only); own-node window unchanged
- Approved references: requirements REQ-001…REQ-005 copy, design copy table; `runtime-lifecycle-review` layout (VIS-001…023) unchanged
- Existing surfaces reviewed: own-node rows (same buttons, hint style, waiting line); the VNC Viewer tab label `shell.rightTabs.vncViewer` ("VNC Viewer" / "VNC 查看器") matches the new copy
- Surface used: Nuxt dev server from this worktree, against a real Docker node (IMP-12) and against the probe's real backend (IMP-11)
- States inspected: remote desktop at 1440 (table) and 739 (stacked), signed-out rows with Sign in and hints, Signing in… with waiting text and Cancel, Cancel back to Sign in, zh-CN; remote status only and own node via the probe
- Issues found and corrected: none
- Remaining limitations: "Unknown Node" shows as the node name because the test node is not in the window's node registry (a real remote window shows its name, as noted in the probe); did-not-finish and signed-in on a real node are covered only by unit tests, since a real account is needed

## Downstream Coverage Hints / Suggested Scenarios

- Probe: add a remote-desktop case (a backend with `BROWSER` or `DISPLAY` set, window bound as remote) next to ARP-08, for AC-003/AC-004 and the remote waiting text; `evidence/IMP-render-remote-desktop-node.mjs` shows one way.
- Server E2E: `agentRuntimeSignInBrowserAvailable` on the test server (deterministic only if the test sets the environment).
- AC-009 privacy scan during a remote sign-in on a Docker node (IMP-09 shows operations carry no command/step/error).
- Final: the user's node running this build — Codex and Grok to Signed in, then a Codex agent message without "Reconnecting… n/5" (AC-001/002 end, AC-007).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: API/E2E coverage and validation, including the real-account checks on the user's node (with delivery, R-01/R-02).
