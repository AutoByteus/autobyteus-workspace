# API/E2E Execution Coverage Report — manage-nodes-professional (autobyteus-363)

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1; implementation engineer, direct route (Medium / Low, SR-002).
- Prior round reviewed: none.
- Deviations from the investigation's plan, and why: none in scope. API-02 needed three runs; the first two failed on the journey itself (see API-02 notes). All runs are kept.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional/tickets/in-progress/manage-nodes-professional/evidence/api-e2e/` (the handoff message gives the commit).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (and no durable test code was changed by API/E2E)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `d5f670021b` (HEAD `f83c53d182` adds ticket documents only) | macOS (Darwin 25.5.0), arm64 | Isolated desktop instance of this worktree's packaged build (`build:electron:mac`, app version `1.5.11-beta.10`), `isolated-app start --from-worktree --data-root <own temp dir>`, driven over CDP (playwright-core `connectOverCDP`), viewport emulated at 1440×900, 1100×900 and 390×844 | Eight remote nodes are servers of this worktree's `dist` on `127.0.0.1` free ports, each with its own data root and HOME (env PATH/HOME/TMPDIR). Six of them get a test-owned starter on a Unix socket (`AUTOBYTEUS_STARTER_SOCKET`), scripted per state. "ghost" is an unused port. The desktop list was written into the instance's own userData before start. Locales en and zh-CN |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-902, AC-903 | web unit / component suite | Reused IMP-01 | — | Pass (reused) | — | — | ran on `d5f670021b`; `git diff --name-only d5f670021b f83c53d182` is `tickets/` only |
| API-R2 | AC-905 | web guards | Reused IMP-02 | — | Pass (reused) | — | — | same |
| API-R3 | — | web typecheck | Reused IMP-03 | — | Pass (reused) | — | — | same |
| API-R4 | AC-902, AC-903 | browser probe, real servers (NP-01…12) | Reused IMP-07 | — | Pass (reused) | — | — | same |
| API-R5 | AC-904 | Docker probe (ND-01…05) | Reused IMP-08 | — | Pass (reused) | — | — | same |
| API-01 | setup | Electron build | `pnpm -C autobyteus-web build:electron:mac` | ENV-1 | Pass | `API-01-electron-build.log` | `exit=0` | web guards ran inside the build |
| API-03 | AC-905 | the change set | `git diff --stat 3b9dc912a1 d5f670021b -- autobyteus-web/stores autobyteus-web/utils autobyteus-web/localization autobyteus-server-ts autobyteus-web/electron` | ENV-1 | Pass | `API-03-presentation-only-diff.log` | the section between `--- stores/utils/localization/server/electron (expected empty):` and `--- end` is empty; the whole set is 21 files under `components/settings`, their specs, the 2 probes, `docs/settings.md`, `typecheck-baseline.json` | — |
| API-02 | AC-901, AC-903, AC-904, BEH-906/908 | Desktop app + real servers + emulated starter | `node <evidence>/API-02-desktop-journey.mjs --repo=<worktree> --out=<evidence>/API-02-desktop-journey-run3` | ENV-1 | Pass (run 3) | `API-02-desktop-journey-run3/API-02-desktop-journey.json`, `EL-*.png`, `server-*.log`, `instance.log`; the script `API-02-desktop-journey.mjs` | per sub-case below | runs 1–2 kept (`-run1`, `-run2`) |
| API-04 | AC-901 | Visual comparison with the package | API-02 screenshots side by side with VIS-016, 019, 037, 033/036 and the default views | ENV-1 | Pass | `API-02-desktop-journey-run3/EL-03-update-downloading.png` vs VIS-016; `EL-04-update-refused-copy-command.png` vs VIS-019; `EL-06-update-lost-not-reachable.png` vs VIS-037; `EL-08-narrow-390-zh-CN.png` vs VIS-036; `EL-07-medium-window-1100.png` | see below | by inspection; names, versions, counts and messages are illustrative per the spec |

### API-02 sub-cases (run 3)

| Sub-case | Criteria | Result | Look For (in `API-02-desktop-journey.json` `cases.<id>`) |
| --- | --- | --- | --- |
| EL-01 | AC-901, REQ-904 (desktop window) | Pass | `rowsCount: 9`; one x for every Open (`openXs: [1319]`), trash (`removeXs: [1355]`) and capsule switch (`switchXs: [1250]`); `EL-01-*.png` |
| EL-02 | AC-903 (states at open) | Pass | `cells.plain.cell: "Server version unknown"` (VIS-022); `cells.upd.cell: "Server 1.5.10 Update to 1.5.11-beta.10 Same version as this app"`; `cells.newer.cell: "Server 1.6.0 Newer than this app. Update this app."`; `cells.blocked` has no Update button, and its notice is the blocker message; `cells.running.cell: "Server 1.5.10 Downloading 1.5.11-beta.10…"` (VIS-021); ghost `Not reachable. Nothing answers at that address and port.` |
| EL-08 | AC-904 (390 en/zh-CN, zh-CN 1440) | Pass | `en` and `zh-CN`: `overflow.scroll` = `client` = 390, `clipped: []`; the notice button's `buttonTop` is below `textBottom`; `EL-08-*.png` |
| EL-06a | (start of EL-06) | Pass | `restartingAfterMs: 4071` ("Restarting…" once the node stopped answering) |
| EL-03 | AC-903 (VIS-015…018) | Pass | `seen`, in order: `Starting the update…`, `Checking the update to 1.5.11-beta.10…`, `Downloading …`, `Preparing …`, `Restarting…` (server really stopped), then `Server 1.5.11-beta.10` with notice `Updated to 1.5.11-beta.10.` in the emerald frame; `EL-03-update-*.png` |
| EL-04 | AC-903 (VIS-019), AC-902 (Copy command) | Pass | notice `The update to 1.5.11-beta.10 did not happen. This node runs an image … Copy command`, amber; `copyTitle: "autobyteus-docker upgrade --all --tag 1.5.11-beta.10"`; `focused: true`, `after: "Copied"`, `clipboard` equals the command |
| EL-05 | AC-903 (VIS-020) | Pass | notice `The update to 1.5.11-beta.10 did not happen. The download of the server package was interrupted.`; the cell offers `Update to 1.5.11-beta.10` again |
| EL-07 | AC-904 (medium tier) | Pass | `windowWidth: 1100`, `cardWidth: 713` (38–64 rem); `switchXs` and `removeXs` one value each; `plainRow`: capsule on the first tier (y 408), server (y 455) then offer (y 489) under the name (y 405) |
| EL-09 | REQ-902 accessibility | Pass | 9 capsules, each `role="switch"` with `aria-label` "Let agents work with …"; the offer toggle opens by Enter (`aria-expanded` false → true); the server cell is `aria-live="polite"`; `order` runs address → name → capsule → Add node, then per row: name, offer toggle, capsule, Open, trash, the panel's controls, fix button / Update |
| EL-10 | AC-902 (Open) | Pass | `windowsBefore: 1`, `windowsAfter: 2` |
| EL-06 | AC-903 (VIS-037) | Pass | after 304,648 ms: `cell: "Not reachable. Last known: updating to 1.5.11-beta.10."`; `EL-06-update-lost-not-reachable.png` |

Notes:
- Run 1 (`-run1`) stopped in setup. On this base the identity page answers `nodeId` (renamed since one-nodes-tab), and the journey read `serverInstanceId`. Fixed in the journey.
- Run 2 (`-run2`), two journey problems, no product failure:
  - EL-04 did not show "Copied". The automated window was not focused, so the browser refuses a clipboard write. The journey now brings the window to the front, as a user's click does. With focus, run 3 shows "Copied" and the clipboard holds the command. `copy()` is unchanged by this ticket: the diff only moves its lines.
  - EL-06 did not reach "Not reachable. Last known…". EL-08 reloads the page to switch languages, and a reload ends the window's follow of an update. Run 3 runs EL-08 first.
- The console errors in the receipt are `ERR_CONNECTION_REFUSED` from asking the stopped and never-reachable nodes, by design. There is no `pageerror`.
- In the narrow screenshots only the viewport shows, because the app scrolls inside its own container. The rows below are covered by the DOM checks in EL-08.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-901 | Yes | API-04 (update states, lost, narrow, medium) with EL-*; IMP-06 (common states at 1440 en/zh-CN, medium, 390 in a browser) | Proven | — (the user approved the package itself; DEC-904 makes his design approval the acceptance basis) |
| AC-902 | Yes | API-R1, API-R4 (NP-01…12), API-R5, EL-04 (Copy command), EL-09, EL-10 | Proven | — |
| AC-903 | Yes | EL-02, EL-03, EL-04, EL-05, EL-06; API-R1 (`NodeServerUpdate.spec.ts`); IMP-06/API-R4 for checking, line kinds, partial, empty states, this node off | Proven | — |
| AC-904 | Yes | EL-01 (desktop window), EL-07 (medium), EL-08 (390 en/zh-CN, zh-CN 1440), API-R5 ND-05 (Docker window), IMP-06 (browser) | Proven | — |
| AC-905 | Yes | API-03 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | Every AC proven: API-R1…R5, API-02/03/04 | Comparison by inspection, not pixel diff (the spec marks the variable content illustrative) | — |
| Changed-boundary execution directness | 85% | 95% | The changed components render in the real desktop renderer and in a browser (IMP-07/08) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Real servers, the real C1 relay and store, a real restart of the updating server | The starter (C2, frozen, unchanged here) is emulated. 305 proved the real starter end to end | A real starter run; not material to a presentation change |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Packaged worktree build with its real version as the update target; own data roots; clean env | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | Refused, failed, running at open, lost after the grace, blocked, newer, never reached, a real restart | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | Desktop at three widths, en and zh-CN, keyboard order, live region, Open | Screen reader not driven (attributes checked) | — |
| Durable regression coverage quality and relevance | 90% | 95% | Probes updated by the implementation (IMP-07/08) and component specs (IMP-01) cover the changed code; update-state rendering is spec-covered (13 tests) | The desktop journey is ticket-owned | — |

- Overall post-repository confidence: 81%
- Overall final confidence: 95% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material; see the residual column.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: `Project Desktop Validation` (isolated desktop instance), with live test servers.
- Confidence gap it addresses: the update states had never been rendered, because they need the app's own version as the target, which a browser has not, and a starter. The desktop window and the medium tier had not been seen in the shell either. These runs close both.
- Browser validation: done by the implementation (IMP-06/07/08). The desktop instance renders the same components with the desktop-only inputs.

## Desktop Application Validation

- Approach: an isolated instance of this worktree's packaged build, driven over its control port. Viewport emulation sets the widths.
- Web-equivalent: IMP-06/07/08. Desktop-specific: Open icons and their column (EL-01), the app version as the update target (EL-02…06), the window width with the sidebar (EL-07), Open (EL-10).
- Effect on any already-running desktop application: `None`. `isolated-app list` shows no instance of mine afterwards, and the user's app, data and containers were not touched.
- Behavior not directly proven: none in scope.

## Persisted-Data Transition Checks

Not affected (design: `Not Affected`).

## Compatibility / Legacy Scope Check

- Backward compatibility in requirements/design: `No`.
- Compatibility-only or legacy-retention behavior in the implementation: `No`. The Disclosure and its spec are removed, and no hidden marks were kept for probes.
- Durable coverage only for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round by API/E2E: `No`. The implementation updated the two probes and the specs; those changes are reused as IMP-01/07/08.
- Paths attached for test-code review: `Not Applicable` (direct route).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The Docker starter (C2) | A test-owned Unix-socket starter answering `GET /status` and `POST /updates` in the real starter's shape (`docker/starter/update-status.mjs`), scripted per node; the journey stops and restarts the server for "Restarting…" | A real starter needs a Docker node with a packages volume and a signed package source (305's API-41 setup), for a contract this ticket does not change | None for the presentation under test; the starter's own behavior was proven in 305 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-58933-81a6` (run 1), `iso-59147-0691` (run 2), `iso-60042-e50d` (run 3) | Yes | `isolated-app stop`; own data roots removed | `stop.ok: true`, ports released, `mineStillListed: []`, `rootRemoved: true` |
| Host servers and starter sockets | Yes | the journey's `finally` | stopped; temp root removed |
| `autobyteus-web/electron-dist/` | Yes | Left as an untracked build output | — |
| The user's app, data, containers | No | Not touched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`.
- Next recipient from `get_handoff_rules`: the delivery engineer (direct route).
- Notes: final confidence 95%. No product defect found. The journey script is kept in the evidence folder as ticket-owned automation.
