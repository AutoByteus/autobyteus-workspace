# Implementation Handoff — autobyteus-305, build step 4 (desktop: version and "Update to <version>")

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High, independent architecture review selected. ARCH-REV-005 `Pass` confirms the reviewed design (SR-005 + SR-009) for step 4; SR-010 and SR-011 are evidence only. Report and record: `design-review-report.md`, `architecture-review-revision-record.md`.
- Requirements doc: `requirements-doc.md` (Approved, SR-003)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md`, "Change / Refactor Sequence" step 4, and "Concrete Examples" (row states)
- Supplemental task artifacts: `handoff-step-4.md`, `delivery-receipt-verification-step3.md`, `options-report.md`, `follow-ups.md`
- Code review of IR-004: `Pass`, CRR-007 (`code-review-report.md`, `code-review-revision-record.md`). All five assumptions, N-4 and CR3-N1 are confirmed. Q-1 is recorded as the non-blocking CR4-N1: one-nodes-tab REQ-706 covers only the connection-details fixing buttons, so a confirmation is an optional product choice for the Solution Designer. No code change.
- Earlier rounds:
  - step 1: IR-001;
  - step 2: IR-002;
  - step 3: IR-003, which passed CRR-005 and API/E2E and was finalized (DR-003, released in beta v1.5.11-beta.6).
  - Their evidence: `evidence/IMP-*`, `IMP2-*`, `IMP3-*`.

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

## Current Implementation Summary

Build step 4: **the desktop.** Under each remote node's row, the Nodes page shows the node's server version. When the node is older than this app it offers "Update to <version>", with the line "Same version as this app" (DEC-018). A click asks the node, over C1 `POST /rest/node-update`, to update in place. The row then follows the steps to the result. Nothing is ever sent without the click (AC-010).

Carried in:
- CR3-N1: the self-check now names an exiting candidate's exit code, and the candidate's output tail goes to the starter log only.
- The Docker start guide lists `autobyteus-docker update --all`.

- Implementation cycle: `Initial` (for step 4)
- Implementation revision record: `implementation-revision-record.md`, current `IR-004`
- Related solution revision IDs: `SR-005`, `SR-009` (SR-010, SR-011 evidence)
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review / API/E2E / delivery revision IDs: `N/A` for step 4
- Triggering finding IDs: `N/A`. Applied:
  - N-4: the C1 `error` row, and a failed GET outside an update;
  - CR3-N1.
  - The optional cleanup of the stale `previous` was left out: nothing depends on it.
- Branch and commits: `codex/docker-node-in-place-server-update`, base `origin/personal` @ `1bed6deeaf`:
  - `deead7bf05` feat(nodes): node server version and "Update to <version>" on the Nodes page
  - the ticket-documents commit with this handoff and the `IMP4-*` evidence
- Not pushed. No release.

## Routing Classification (Mandatory)

- Task size `Large`; Architecture risk `High` (design-spec.md "Task Size And Architectural Risk"). `Confirmed`.
- Rationale: step 4 adds a network-reachable request path that restarts another node (C1 POST, the owner route class), plus a polling store and UI on a shared page. The supply chain, data and process risks are the earlier steps' and are unchanged.
- Selected route: `Code Review`
- New design impact: `None`. One open product question for the Solution Designer is listed under Important Assumptions (Q-1).

## Reviewed Behavior Implementation Trace

| Behavior / AC | Approved Change | Implemented Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-002, REQ-003, AC-001, DEC-018 | The desktop shows the node's version; "Update to <version>" on the user's click; the node runs B in the same container | `NodeRow.vue` renders `NodeServerUpdate.vue` for remote rows (`!row.isEmbedded`). The component asks while the window reaches the node (`nodeListStore.reachedAddressOf`). `stores/nodeServerUpdateStore.ts` sends `GET /rest/node-update?target=<appUpdateStore.currentVersion>` and, on the click only, `POST /rest/node-update { version }`. The server `node-update-routes.ts` POST relays to the starter's `POST /updates` (`starter-client.ts` `requestUpdate`) | Real desktop app (isolated worktree build, 1.5.11-beta.6) against a test node at 1.5.11-beta.5: "Update to 1.5.11-beta.6 · Same version as this app" → click → Starting → Checking → Preparing → Restarting… → "Server 1.5.11-beta.6 · Updated to 1.5.11-beta.6." in about 70 s. Same container ID and image ID afterwards; node status `installed 1.5.11-beta.6` (IMP4-06, screenshots) |
| BEH-007, REQ-011, DS-005 | Version, progress, result, why a node cannot update | Store polling: every 2 s while `update.state` is `running` (also an update started from the host); failed polls during an update show "Restarting…" for up to 5 minutes, then "Not reachable" while it asks every 10 s; it recovers by itself. The row states are in `NodeServerUpdate.vue` | Unit: 9 store cases with fake timers, 12 component cases (IMP4-01). Real app: each step and the result (IMP4-06) |
| REQ-007, AC-010 | Nothing updates without the user's action | The only POST is `requestUpdate`, which only the button calls | Unit: no POST across 30 minutes of an open page with polling. Real app: 30 s on the page before the click; the node's first `update-requested` is at the click's millisecond (IMP4-06) |
| REQ-003, AC-009 | Phones refused; no agent tool; network requests logged with their client address | C1 POST under the existing `TRUSTED_NETWORK_OWNER` class (`remote-access-route-policy.ts:84`, unchanged); `requestedFrom` = `normalizeClientAddress(request.raw.socket.remoteAddress)` | Real node: a phone credential gets 403 on POST and GET, and no request reaches the starter. The desktop's request is logged as `"requestedFrom":"172.17.0.1"` (the client address the node sees through Docker's port mapping). No agent tool or server code outside the route names the update route or the starter socket (IMP4-06); unit route tests (IMP4-03) |
| RU-23 (`updateBlocker`) | The blocker's message instead of the button | `NodeServerUpdate.vue` notice | Real app: a node without its volume shows "Server 1.5.11-beta.5" and the NO_PACKAGES_VOLUME message, with no button (IMP4-shot-S4-02) |
| N-4 | `inPlaceUpdate: "error"` → "Server version unknown" plus the C1 message, no button, the same polling pace; a GET that fails before any update → "Not reachable" | Store and component | Unit (IMP4-01) |
| CR3-N1 | The self-check failure is precise; the candidate's output tail goes to the log only | `self-check.mjs` (stdout and stderr piped, last 40 lines; `self-check-failed` log entry; message "it exited with code N before answering its health check") | Starter test: exact message, output in the log entry, not in the status (IMP4-03) |
| Change Scope derived consumer | The guide card's `update` | `utils/dockerNodeLauncherCommands.ts` `direct-update-all`, en and zh-CN texts | Unit; real app screenshot (IMP4-shot-S4-05) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Desktop:
  - new: `autobyteus-web/stores/nodeServerUpdateStore.ts`, `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue`;
  - changed: `components/settings/nodes/NodeRow.vue` (renders it for remote rows); `localization/messages/{en,zh-CN}/nodesPage.ts` (`update.*`), `{en,zh-CN}/settings.ts` (guide `updateAll`); `utils/dockerNodeLauncherCommands.ts`;
  - tests: `components/settings/nodes/__tests__/{nodeServerUpdateStore,NodeServerUpdate}.spec.ts` (new), `NodeRow.spec.ts` (stubs the child; one placement case), `utils/__tests__/dockerNodeLauncherCommands.spec.ts`.
- Server: `src/node-update/node-update-routes.ts` (POST), `src/node-update/starter-client.ts` (`requestUpdate`), `tests/unit/node-update/node-update-routes.test.ts`.
- Starter: `docker/starter/self-check.mjs`; `tests/update-flow.test.mjs`, `tests/fixtures.mjs`.

## Important Assumptions

Decisions inside the design, for the reviewer to confirm:

- **C1 POST answers beyond 202/409:**
  - `409 { refused: "IN_PLACE_UPDATE_UNAVAILABLE", message }` when no starter runs the server. This is a new optional code under the frozen rule; the desktop never offers the button there, because the GET says `unavailable`.
  - `502 { message }` when the starter does not answer.
  - `400 { message }` without a version string.
  - Other answers of the starter (202, 409, its 400) are relayed as they are. Its 202 also carries `version` (additive).
- **Which result the row shows:**
  - "Updated to <version>" only for an update this window followed (it clicked, or saw the update running);
  - a refused or failed update when this window followed it, or when it was for this app's version. The user then sees why the offered update did not happen, and the button stays.
  - A refusal of this window's own click (C1 409) shows first.
- **Step texts:** `checking`, `downloading`, `preparing`, then `restarting`, `confirming` and `rollingBack` all read "Restarting…". An unknown step reads "Updating to <version>…". An unknown code shows the node's `message`.
- **During the confirm window** the version shown is the trial's (the starter reports the trial's pid and version, IR-003), so the row reads "Server 1.5.11-beta.6 · Restarting…" until the result.
- **NEEDS_NEW_IMAGE copy button:** the command is built from the code and the target version: `autobyteus-docker upgrade --all --tag <version>`. It is not parsed out of the message.
- **No target without an app version:** in a browser window (no Electron), `appUpdateStore.currentVersion` is empty. The row then asks without a target and offers no button.
- **Q-1 (open question for the Solution Designer, not a blocker):** the Nodes page's earlier design says every button that changes another node opens the confirmation first (REQ-706, `NodeRow.vue` comment). This design's row states and SCN-001 go from click to progress, so I added no confirmation. Whether the update, which restarts the node, should confirm first is a product decision.

## Known Risks

- **Not seen in the real run:**
  - "Downloading…" (the local source was too fast for the 2 s poll);
  - the "Restarting…" connection state (the switch took less than one poll; the row showed the `restarting` step instead).
  - Both are covered by unit tests.
- **zh-CN** texts are present and pass the localization guards, but were not rendered in a zh-CN window.
- **The real app's renderer** sends the POST cross-origin to the node: it worked (CORS preflight included). Browser-mode windows are untested; they get no button (no app version).

## Task Design Health Assessment Implementation Check

- Larger Requirement; `No Design Issue Found`; `No Refactor Needed`. Matched: `Yes`. The row gained one child component; `NodeRow.vue` stays at 227 lines.

## Legacy / Compatibility Removal Check

- Compatibility mechanisms: `None`. Per rule 9, a node without C1 is not special-cased: its failed GET reads "Not reachable".
- Dead code: none added. Shared structures: the store's `NodeServerStatus` mirrors C1 and is used only by its two consumers.
- Size guardrails: `Yes`:
  - `nodeServerUpdateStore.ts`: 176 lines;
  - `NodeServerUpdate.vue`: 123 lines;
  - `node-update-routes.ts`: 68 lines;
  - `self-check.mjs`: 85 lines.

## Persisted Data / State Transition Check

- `Not Affected`: step 4 stores nothing new. The desktop keeps its update state in memory only.

## Environment Or Dependency Notes

- Local images kept for reuse:
  - `autobyteus-server-305-test:step4` (clean clone of `deead7bf05`);
  - `autobyteus-server-305-test:step4-testkey` (IMP4-proof-Dockerfile.testkey).
- The proof's signed package and the throwaway test key are under `/tmp/ab305/s4/`; the private key was never committed or printed.
- Cleanup:
  - the isolated instance `iso-60117-eb81` is stopped, its data root removed, and `isolated-app list` shows none running;
  - the test containers and volumes are removed;
  - the user's nodes `autobyteus-server-0/1/2` were not touched.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP4-01 | `pnpm -C autobyteus-web test:nuxt --run` (full suite) | `deead7bf05` | macOS arm64, Node 22 | store, component, row, guide commands, and everything else in web | AC-010, DS-005, N-4, DEC-018 | Pass | `IMP4-01-web-tests.log` | `Test Files  671 passed (671)`, `Tests  4889 passed (4889)` |
| IMP4-02 | web guards, localization boundary and literals audit, `pnpm -C autobyteus-web typecheck` | `deead7bf05` | macOS arm64 | web | — | Pass | `IMP4-02-web-guards-and-typecheck.log` | `Passed`, `production errors: 0`, `[typecheck] PASS` |
| IMP4-03 | server C1 and route tests, server typecheck, `test:starter` | `deead7bf05` | macOS arm64 | C1 POST, starter client, CR3-N1 | AC-009, CR3-N1 | Pass | `IMP4-03-server-and-starter.log` | `Tests  126 passed (126)`, `server typecheck exit 0`, `# pass 49` |
| IMP4-04 | licensing, artifact hygiene, secret gate | `deead7bf05` | macOS arm64 | branch | REQ-013 | Pass | `IMP4-04-gates.log` | `secret gate: PASS` |
| IMP4-05 | step-4 image from a clean clone; test image; the signed 1.5.11-beta.6 package | `deead7bf05` | Docker 29.0.1 | image, package scripts | — | Pass | `IMP4-05-image-build.log` | `Wrote server-package.json: 1.5.11-beta.6 …`, `exit 0` |
| IMP4-06 | Real desktop app (isolated instance, `--build`) on Nodes → Manage Nodes, driven by `IMP4-proof-drive.mjs`: add two test nodes, wait 30 s, click "Update to 1.5.11-beta.6", follow to the result; node-side records; phone credential; guide card | `deead7bf05` | macOS arm64 desktop + test containers + local release source | the whole step-4 path with the step-3 starter | AC-001, AC-009, AC-010, RU-23, rendered states | Pass | `IMP4-06-desktop-update-proof.log`, `IMP4-shot-*.png` | `"text":"Server 1.5.11-beta.6 Updated to 1.5.11-beta.6."`; same container (`created 2026-10-30T22:17:07`) and image; `"requestedFrom":"172.17.0.1"`; `phone POST: 403` |

- Not run, and why:
  - a zh-CN rendering;
  - the "Downloading…" step and the down-for-minutes path in the real app (see Known Risks);
  - the full server `test:unit` (only the node-update route changed; its suites ran);
  - AC-007 (step 5, waiting for autobyteus-285/-287).

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** Nodes → Manage Nodes, a remote row's server line; Nodes → Docker Guide, the new command card.
- **References:**
  - the design's "Row states" and DEC-018;
  - the existing row styling: slate text, the `px-5 pl-[2.75rem]` indent, amber notices like the row's warn line, the neutral bordered button style;
  - the guide card's existing cards.
- **Surface used:** the isolated desktop instance of this worktree's build (TESTING.md: renderer UI that depends on the Electron app version), driven through its control port.
- **States inspected in the real app:**
  - update offered;
  - blocked (NO_PACKAGES_VOLUME);
  - Starting the update…, Checking, Preparing, Restarting…;
  - Updated to;
  - the guide card.
  - The other states (newer than the app, version unknown, starter error, not reachable, a refused click with the copy button) are covered by component tests.
- **Visual issues found and corrected:** none needed correcting. The line sits under the address, aligned with the row's other lines, and wraps on narrow widths (flex-wrap).
- **Evidence:** IMP4-06 and the `IMP4-shot-*.png` files.
- **Remaining limitations:** zh-CN not rendered; keyboard focus rings are the shared `focus-visible` styles and were not exercised by hand.

## Downstream Coverage Hints / Suggested Scenarios

- A failed in-place update seen from the desktop (for example a package without a signature): the notice and the button staying.
- A node stopped for longer than 5 minutes during an update: "Restarting…", then "Not reachable", then recovery.
- An update started from the host command while the Nodes page is open: the row follows it once the page asks again (it asks on open; it does not poll idle nodes).
- Two remote nodes updated one after the other from the same window.
- zh-CN rendering.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The scenarios above. AC-007 belongs to step 5.
