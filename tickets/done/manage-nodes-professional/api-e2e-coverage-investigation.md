# API/E2E Coverage Investigation — manage-nodes-professional (autobyteus-363)

The plan. Results, confidence and the decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation Notes: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record: [solution-revision-record.md](solution-revision-record.md)
- Design Spec: [design-spec.md](design-spec.md) (SR-002, Ready; Medium / Low)
- Supplemental Task Artifacts: the Product package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` with `visual-references/` VIS-001…037 (design repo `personal` @ `88e0e322`). The 268 spec and the 305 design stay normative for behavior, states and copy.
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: [implementation-handoff.md](implementation-handoff.md) (IR-001)
- Implementation Revision Record: [implementation-revision-record.md](implementation-revision-record.md)
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: [api-e2e-revision-record.md](api-e2e-revision-record.md)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2. Trigger: IR-002, the merge `35e5853a22` of `origin/personal` @ `84ea944ac5` (DR-001 packaging Local Fix). Plan: shared foundations changed (TESTING.md rule 4), so rerun API-01, API-02, API-03 (against the new base) and API-04. The reused implementation cases are taken over as their round 2 reruns, IMP-09…IMP-16. No case was added or removed.
- Trigger: implementation engineer, direct route (run `implementation_engineer_31698f199dad4612834b9e8df260b317`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this document, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional`, branch `codex/manage-nodes-professional`. Source under test `d5f670021b`; HEAD `f83c53d182` adds ticket documents only.

## Current Requirement And Design Basis

- A presentation-only redesign of Nodes → Manage Nodes to the user-approved Product package (REQ-901, AC-901).
- Every function and state of BEH-901…908 keeps its meaning and outcome: same requests, confirmations and results (REQ-902, AC-902).
- The rare states are designed too and must render per the package (REQ-903, AC-903): checking, each line kind, partial result, Docker hint, update offer / progress / restarting / result / refusal with Copy command, not reachable, empty list, empty offer, this node off.
- Every context (REQ-904, AC-904): desktop window, Docker window, browser, zh-CN, 390 px.
- No server, API, data, store, Electron or localization change (REQ-905, AC-905).
- Design: container-query layouts by the card's width (≥64 rem one line; 38–64 rem two tiers with server, then offer, under the name; <38 rem stacked); one capsule; one notice shape with tone icons; offer toggle → framed panel; `NodeServerUpdate` in two parts, where only the cell asks the node (DS-002).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-901, SCN-902, SCN-903.
- Added from the implemented behavior:
  - SCN-A01: the owner updates a remote node's server from its row. Trigger: "Update to <version>". He sees each step, "Restarting…" and the result. Or he sees a refusal with Copy command, a failure, an update already running when he opens the tab, or a node lost during its update.
  - SCN-A02: the owner works in a desktop window at a medium width, for example with the sidebar open. Trigger: the window size.
  - SCN-A03: the owner works by keyboard or a screen reader. Trigger: Tab / Enter.
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-900 look | Changed | REQ-901, VIS-001…037 | Rendered comparison with the VIS images: implementation IMP-06 for the common states; API/E2E for the update states, the desktop window and medium width |
| BEH-901…905, 907 | Preserved | REQ-902 | Probes NP-01…12 and ND-01…05 (IMP-07/08, reused); web suite IMP-01 |
| BEH-906 server version and update | Preserved, re-rendered in two parts | REQ-903, DS-002 | Spec only so far. Rendered through the desktop app with a real C1 relay (API-02) |
| BEH-908 contexts | Preserved | REQ-904 | IMP-06 (browser, zh-CN, 390, medium in an iframe), ND-05 (Docker window); API-02 (desktop window, medium, 390 en/zh-CN) |
| `RemoteCollaborationOfferDisclosure` | Removed | design § Removal | Toggle spec (IMP-01); probes use `-toggle`, `-summary` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | Nodes components (stores unchanged) | IMP-01 (specs) | Rendering of update states, layout tiers | Real renderer |
| Browser integration / user journey | Yes | Rendered page | IMP-07/08 probes, IMP-06 | Update states never rendered | Desktop instance (needs the app version as target) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer in Electron | IMP-06 in a browser | Desktop window with Open icons, sidebar width | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No change | Open (unchanged) | — | The Open icon's place | Isolated desktop instance (smoke) |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No change | Update polling (store unchanged) | Store specs | Its rendering during a real restart | Desktop instance + a restarting server |
| External integration | No | The starter (C2) is unchanged | — | — | Emulated starter |

## Project Execution Discovery

- Assigned worktree: as above. Project: pnpm monorepo, Nuxt/Electron web, Node server.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional/TESTING.md`. There is no closer `TESTING*.md`.
- Conflicting or unclear instructions: none.
- Secrets: `N/A`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global guideline | Desktop-shell or full journeys need an isolated desktop instance of a worktree build; test-owned servers with their own data roots; rerun by impact; never the user's app or containers |
| `docs/isolated-app-instances.md` | Isolated instance | `isolated-app start --from-worktree --data-root <dir>`, userData `<dir>/electron/user-data`, CDP control port, `stop` |
| `autobyteus-server-ts/src/node-update/{node-update-routes,starter-client}.ts` | 305 C1/C2 | The server relays `/rest/node-update` to the starter at `AUTOBYTEUS_STARTER_SOCKET` (C2 `GET /status`, `POST /updates`) |
| `autobyteus-server-ts/docker/starter/update-status.mjs` | The real starter | The status shape the emulated starter copies: `{version, state, target{version, relation}, update{state, targetVersion, step, code, message}, updateBlocker?}` |
| `autobyteus-web/stores/nodeServerUpdateStore.ts` | Window store (unchanged) | Target = this app's version (`appUpdate.currentVersion`, empty in a browser). Polls every 2 s while updating; "Restarting…" for up to 5 min, then "Not reachable" |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Electron build | `autobyteus-web` | `pnpm -C autobyteus-web build:electron:mac` | serialized; no dev server at the same time | `exit=0` | untracked `electron-dist/` |
| Host servers | worktree | `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>`, env PATH/HOME/TMPDIR (+ the starter socket) | the build present (server source unchanged vs base) | `/rest/health` | SIGTERM; temp root removed |
| Emulated starter | journey process | Unix socket under the temp root | test-owned | listening | closed |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --from-worktree --data-root <temp>` | own data root, ports | `start` JSON ok | `isolated-app stop` |

| Data / Fixture / Identity Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| The desktop list with nine remote nodes | `node-registry.v1.json` written in the instance's own userData before start | Own data root | Removed |
| A collaborating node with an Agent | GraphQL on the test servers | Own data roots | Removed |
| Update states | The emulated starter's script per node | — | — |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | One list, add, collaborate, rename, remove, 267 timing; lines without marks plus `tone()` | AC-902/903 | Still Valid (updated by the implementation and the NP-12 baseline fix) | IMP-07 | Reuse IMP-07 |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Docker address, hint, window on Docker | AC-904 | Still Valid (updated) | IMP-08 | Reuse IMP-08 |
| Component specs (`NodeRow`, `NodeServerUpdate`, `AddNodePanel`, `RemoteCollaborationOfferToggle`) | Rendering per state; DS-002 | AC-902/903 | Still Valid | IMP-01 | Reuse IMP-01 |
| `RemoteCollaborationOfferDisclosure.spec.ts` | The removed component | — | Stale / Remove (done by the implementation; replaced by the Toggle spec) | design § Removal | — |
| Web guards, typecheck | Boundaries, types | AC-905 | Still Valid | IMP-02, IMP-03 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-902, AC-903 | web unit / component suite | Reused | IMP-01 | ran on `d5f670021b`; only `tickets/` changed since |
| API-R2 | AC-905 | guards | Reused | IMP-02 | same |
| API-R3 | — | typecheck | Reused | IMP-03 | same |
| API-R4 | AC-902, AC-903 | browser probe, real servers | Reused | IMP-07 | same; the probe ran on `d5f670021b` |
| API-R5 | AC-904 | Docker probe | Reused | IMP-08 | same |
| API-03 | AC-905 | the diff | Temporary Probe | `git diff --stat 3b9dc912a1 d5f670021b -- autobyteus-web/stores autobyteus-web/utils autobyteus-web/localization autobyteus-server-ts autobyteus-web/electron` | prove the presentation-only claim myself |
| API-02 | AC-901, AC-903, AC-904, BEH-906/908 | Isolated desktop instance of this worktree's build; real servers; emulated starter | Temporary Probe (journey kept in evidence) | `pnpm -C autobyteus-web build:electron:mac` (API-01), then `node <evidence>/API-02-desktop-journey.mjs --repo=<worktree> --out=<evidence>/API-02-desktop-journey-run<N>`; sub-cases EL-01…EL-10 | update states need the app's version as target (desktop only) and a C2 starter (Docker only); a durable repository probe would need a packaged build. The states' logic is spec-covered (`NodeServerUpdate.spec.ts`), so the gap is rendering |
| API-04 | AC-901 | Visual comparison | Journey (inspection) | API-02 screenshots side by side with VIS-001/002, 015…021, 030, 033, 036, 037 | the package is the acceptance reference |

API-02 sub-cases:
- EL-01: desktop 1440 default: an Open icon on every desktop row; Open, capsule switch and trash each in one column (VIS-001/002).
- EL-02: at open: version unknown (VIS-022), "Update to" (VIS-002), newer than this app, blocker notice, an update running at open (VIS-021), never reached.
- EL-03: Update through checking, downloading, preparing, Restarting… with the server really stopped, then succeeded with a green notice (VIS-015…018).
- EL-04: a refusal with NEEDS_NEW_IMAGE: amber notice and Copy command, with the right command (VIS-019).
- EL-05: a failed update: amber notice and the offer again (VIS-020).
- EL-06: an update lost: "Not reachable. Last known: updating to …" after the 5-minute grace (VIS-037).
- EL-07: the medium tier in the desktop window: capsules and trash aligned, server then offer under the name.
- EL-08: 390 px en and zh-CN: no horizontal overflow, notice buttons under their text (VIS-033/036); zh-CN 1440 (VIS-030/032).
- EL-09: keyboard and screen reader: capsules are labelled switches; the offer toggle opens by Enter with `aria-expanded`; the server cell is `aria-live="polite"`; the Tab order runs through the add band and the rows' controls.
- EL-10: Open still opens the node's window.

- Test progress log needed: `Yes`.

## Durable Coverage To Add / Update / Remove

None planned. The repository probes already cover the page's behavior with the new look (updated by the implementation, IMP-07/08). The update states and the desktop window need a packaged build plus an emulated starter; that stays a ticket-owned journey. The components' logic for those states is spec-covered.

## Desktop Application Validation Plan

- Shell: Electron. Guideline: TESTING.md § Choosing the path; isolated instance.
- Web-equivalent: the page (IMP-06/07/08). Shell-specific: the desktop window's width with the sidebar, Open, and the app version used as the update target.
- Approach: an isolated instance of the worktree build, driven over CDP (playwright-core `connectOverCDP`), with viewport emulation for the widths.
- The user's app, data and containers are not touched.

## Live Environment And Fixture Plan

- Order: Electron build → host servers and starters → instance → journey → stop.
- Evidence: JSON receipt (cell and notice texts, positions, Tab order, attributes), screenshots per state, server logs, instance log.
- Cleanup: the journey's `finally` (instance stop, servers, sockets, temp root).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| A real starter performing a real package update | 305 validated it (its API-41, DEL-14); this ticket changes no update logic | Low | No | — |
| Pixel-exact comparison with every VIS | Comparison by inspection, as the spec allows (names, versions, timing illustrative) | Low | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (this round's plan)
- Reroute Required Before Validation Execution: `No`
