# API/E2E Execution Coverage Report — autobyteus-269 (a remote run's title)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title/tickets/in-progress/remote-run-title`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Revision: `API-REV-001`; round 1
- Trigger: IR-001 on the direct route. Code `05be574608`, handoff `d08cd902a9`. Classification: Small / Low.
- **Result: Fail.** One finding, F-001 (Medium): in beta's history sidebar, an active peer-started **Agent** run still shows the work-packet wrapper ("You have a new task from the agent …") instead of its title. The server stores the right title, and Team rows show it.
- Durable coverage changed: Yes. The two-server E2E has title checks in RC-05, RC-21 and RC-22, and a new RC-30.

## Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | `05be574608` (dist API-00) + the test changes | macOS 26.5.2, Node v22.23.1 | two-server E2E (alpha, beta behind capturing proxies; RC-27 adds three), scripted AGY CLI; Brief Studio package on beta | temp roots and HOMEs, `env -i`; removed |
| ENV-2 | as ENV-1 | as ENV-1; agent browser tool (Chromium) | API-03: alpha and beta dist servers (`API-03-setup-two-nodes.mjs`), scripted AGY CLI, `nuxt dev` against beta | temp root removed; Nuxt stopped |

## Cases

| Case | Criteria | What runs | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log`: `build exit=0` |
| API-R1 | AC-602, AC-603, unit | IMP checks at `05be574608` (focused 439, full unit 6473) | — | Reused | The source is unchanged since then |
| API-01 | AC-601 (server), AC-603/604 (preserved) | two-server E2E (`env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`) | ENV-1 | **Pass, 30/30** (301 s) | `API-01-run1.log`, `API-01-run1/remote-two-server-receipt.json`. RC-05 `titleBeforeOwner`: "Publish the draft. Marker STANDALONE-PACKET." It is read after the packet and before any owner message, and is unchanged after the owner's message and the peer's follow-up. RC-21: the Studio Team run is titled "Studio work. Marker STUDIO-PACKET."; RC-22 `studioTitleAfter`: unchanged after owner messages to the coordinator and the checker and the peer messages. RC-01 … RC-29 are otherwise unchanged (preserved) |
| API-02 | AC-602, AC-601 | RC-30 | ENV-1 | Pass | A 317-character description with line breaks gives an Agent and a Team title of "Cut the launch trailer for the Night Owl coffee shop and have it checked before Friday. Keep it u...": one line, 100 characters, equal to the catalogs' rule |
| API-03 | AC-601 / AC-605 (what beta's owner sees) | browser journey | ENV-2 | **Fail (F-001)** for Agent rows; Pass for Team rows | `API-03-browser-journey.log`, `API-03-beta-sidebar-active-runs.png` |

## Failures

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | Medium (the ticket's own symptom remains for active peer-started Agent runs, on every page load; it is right after the run stops and the page reloads) | AC-601 ("beta's history lists both runs with that title"), AC-605 (the user's goal: "a new delegation from the desktop shows a real title"), the design's "The window shows the stored title" | Beta's server stores "Cut the launch trailer and have it checked. Marker AGENT-TITLE." But the sidebar row of the active Publisher run shows "You have a new task from the agent with sender run id … on node \"alpha-node\". …", without the run being opened and after a reload. The Team row shows its title. With the run stopped and the page reloaded, the Agent row shows the title | The Agent row shows the stored title | `API-03-browser-journey.log` steps 2–6; the screenshot; `getRunProjection` (the packet is `{kind: message, role: user}`) | Preliminary: **Design Impact (Solution Designer).** The design and handoff rest on a premise that does not hold: that the window never picks up the packet as a first user message, because it is a `system_task_notification` (handoff § Important Assumptions 3, § Known Risks). In fact: (a) the packet is a `user` message in the run's conversation (scripted AGY here; the AutoByteus runtime too in 247's live check); (b) the window holds a live context for every active run on load; (c) `mergeHistoryRowWithContext` (`autobyteus-web/utils/runTreeLiveStatusMerge.ts`) then replaces the stored `summary` with the first user message (`utils/runTreeSummary.ts`). The design leaves the window path alone and forbids "the window deriving titles for this case", so closing it needs a decision on the window rule (for example: keep a non-empty stored title over the live first user message, or never treat a work packet as a user message). The server part is correct and needs no change |

## Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-601 | API-01 (server: both kinds, before and after messages), API-03 | **Failed (F-001)** in the window for active Agent runs; proven for the stored title and for Team rows |
| AC-602 | API-02 (RC-30, end to end), API-R1 (unit) | Proven |
| AC-603 | API-R1; API-01 (user-started runs unchanged) | Proven |
| AC-604 | review: `git diff bbad8d5f38 05be574608` adds no migration; API-03 step 6 (a stored run lists and opens) | Proven |
| AC-605 | — | the user's check; F-001 would show there for any active Agent run |

## Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user. A failing critical criterion blocks Pass.

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 80% | the server title is proven; the browser shows the symptom for Agent rows | F-001 | the design decision and fix |
| Changed-boundary execution directness | 95% | 95% | real servers, real packets, history query, real window | — | — |
| Cross-boundary integration realism and mock gap | 90% | 92% | the window over real HTTP | which runtimes emit the packet as `user` (AGY observed here, AutoByteus in 247) | a check per runtime after the fix |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean roots | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | long multi-line; before and after messages; stop and reload | — | — |
| User-surface, browser, and desktop-shell confidence | 60% | 85% | the browser journey found F-001 | F-001 | — |
| Durable regression coverage quality and relevance | 92% | 92% | RC-05/21/22/30 | no durable check of the window's row title | a browser probe of the sidebar row after the fix |

- Overall post-repository confidence: 88%
- Overall final confidence: 90%
- Every critical acceptance criterion directly proven: `No` (AC-601 in the window)
- Target met: `No`

## Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-03).
- **Mode:** `Browser`.
- **Reason:** the user's complaint is about what the history sidebar shows, and the handoff's own known risk is in the window. The run found F-001.

## Durable Coverage Changes

`autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
- helpers `betaTitle`, `titleOf` and `titledOnBeta`;
- RC-05, RC-21 and RC-22 title assertions;
- new RC-30;
- the header is updated.

## Decision

Fail. This goes to the code reviewer for failure-origin review of F-001 (preliminary: Design Impact, Solution Designer). The server change and its E2E coverage pass.
