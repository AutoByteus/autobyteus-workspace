# API/E2E Coverage Investigation — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

The plan for round 4. Results are in `api-e2e-execution-coverage-report.md`. Earlier rounds:

- round 1: step 1, plan at `48c2d82ea1`;
- round 2: step 2, plan at `c052bb1aff`;
- round 3: step 3, plan at `e7e76ac2c0`.

Steps 1–3 are merged into `personal`, and released in beta v1.5.11-beta.6 (DR-003).

## Investigation Meta

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-005 + SR-009), step 4; DS-001, DS-005, "Row states"
- Supplemental Task Artifacts: `handoff-step-4.md`, `follow-ups.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-005, Pass; N-4)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-007, Pass, 9.5/10; CR4-N1)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`; this round `API-REV-004`
- Current Investigation Round: `4`
- Trigger: code review Pass of build step 4 (CRR-007)
- Prior Investigation Reviewed: round 3 (`e7e76ac2c0`); nothing open

## Current Requirement And Design Basis

Step 4 adds the desktop part:

- **C1 `POST /rest/node-update { version }`:** relays to the starter with `requestedFrom` set to the client address. Owner route class, so phones get 403.
- **`nodeServerUpdateStore` and `NodeServerUpdate.vue`** under each remote row on Nodes → Manage Nodes. The row shows:
  - the version;
  - "Update to <app version>" with "Same version as this app", when the node is older;
  - progress: checking, downloading, preparing, then Restarting… for restarting, confirming and rolling back;
  - "Updated to <v>.", or "The update to <v> did not happen. <message>" (the button stays);
  - the blocker message, or the starter's error;
  - a copy button with `autobyteus-docker upgrade --all --tag <v>` for NEEDS_NEW_IMAGE;
  - "Not reachable." when a GET fails before any update (N-4).
- **Polling:** every 2 s while an update runs. When polls fail during an update, the row shows "Restarting…" for up to 5 min, then "Not reachable. Last known: updating to <v>." with 10 s polls, and recovers by itself. Idle nodes are asked when the row appears, not polled.
- **Nothing is sent without the click** (AC-010).
- **CR3-N1:** the self-check names the candidate's exit code.

In scope: AC-001, AC-009 (desktop request and client-address log), AC-010, REQ-011 on the desktop. Out of scope: AC-007 (step 5).

## Supported Scenarios And Real Usage

- SCN-001 (the user's main path), with its alternates: refused (new image needed), failed with the old version running.
- Reviewer items 1–8, as real-use journeys:
  - **RU-41:** a failed update clicked from the row; the reason shows and the button stays.
  - **RU-42:** NEEDS_NEW_IMAGE from the row, with the copy command.
  - **RU-43:** a slow download ("Downloading…").
  - **RU-44:** a long outage during an update: Restarting… → Not reachable → recovers by itself. The real trigger is the node's container being stopped mid-update (its machine or Docker restarted), then started again.
  - **RU-45:** an update started from the host (`autobyteus-docker update --name`) while the row is visible.
  - **RU-46:** the row in zh-CN.
  - **RU-47:** a node on a pre-starter image.
  - **RU-48:** AC-010 over a long session with an older node in the list.
- Also from the handoff: two nodes updated one after another from the same window.
- Contrived (not tested): a browser-mode window (no app version, so no button): design-decided, unit-covered.

## Project Execution Discovery

- Worktree HEAD `5618071c7f` (docs on top of `6412b7e4fd`; code `deead7bf05`). App version 1.5.11-beta.6.
- **Desktop:** an isolated instance of this worktree's build, `pnpm --silent isolated-app start --build` (TESTING.md: renderer UI that depends on the Electron app version). It is driven over its control port with `playwright-core` (`connectOverCDP`), like IMP4-06, and stopped with `isolated-app stop`.
- **Nodes:** test-owned containers on the host daemon, so the desktop reaches them on `127.0.0.1:<port>`:
  - names `ab305-api4-<n>`, label `autobyteus.ab305-api=round4`, fresh volumes `ab305-api4-<n>-data` and `ab305-api4-<n>-packages` (the latter mounted on `/home/autobyteus/server-packages`);
  - no launcher label, so no launcher sees them;
  - image `ab305-api4-node:testkey`: `autobyteus-server-305-test:step4` plus my throwaway public key, built-in labelled 1.5.11-beta.5, as in IMP4-proof-Dockerfile.testkey;
  - `AUTOBYTEUS_SERVER_PACKAGE_SOURCE` set per container (the design's test-only variable).
- **Release source:** `release-source.mjs` on host loopback, reached from containers at `host.docker.internal:<port>`. One prefix per variant of 1.5.11-beta.6, signed with a fresh throwaway key using the IMP3 harness's `make()`:
  - `good`: plain, archive sent at 4 MB/s;
  - `fail`: migrates, then exits 30 s after start;
  - `lvl99`: system level 99.
- **RU-45:** the real bash launcher, `update --name ab305-api4-h --version 1.5.11-beta.6`, with a private state dir holding a state file for that one container. Without `--all`, the launcher touches only the named container.
- **RU-47:** a container from `autobyteus-server-305-test:step1` (server package, no starter).
- **zh-CN:** Settings → Language (`settings-language-select` = `zh-CN`), the real setting; switched back afterwards.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/nodeServerUpdateStore*.spec.ts` (9 cases, fake timers) | Polling, restarting and unreachable timing, no POST in 30 min | Still Valid (IMP4-01) | Reuse; RU-44/48 run them for real |
| `components/settings/nodes/__tests__/NodeServerUpdate*.spec.ts` (12) | Row states | Still Valid | Reuse; the real app renders them (RU-41..47) |
| Server C1 and route tests; starter tests | C1 POST, phone 403, CR3-N1 | Still Valid (IMP4-03) | Reuse |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps (`Reused`: check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| API-40 | AC-001, AC-009, AC-010, REQ-011, CR3-N1 | Web tests and guards, server and starter tests, image, real-app main path, phone 403 | Reused | IMP4-01..IMP4-06 | Only `tickets/` changed since `deead7bf05` |
| API-41 | AC-001, AC-009 (log), AC-010, REQ-011, RU-41..RU-48 | The real desktop app with test nodes | Journey | `API-41-desktop-drive.mjs` over the control port: I (idle, whole session); P (pre-starter) → "Not reachable."; L (lvl99) click → NEEDS_NEW_IMAGE notice and copy button, the button stays; F (fail) click → steps → "did not happen" with the reason, the button stays, old version, migration undone; G (good, slow) click → "Downloading…" … "Updated to"; H: host `autobyteus-docker update` while the row shows the offer, then reopen the page → the row follows to "Updated to"; R: click, `docker stop` once "Restarting…" shows, keep it down 5.5 min → "Not reachable. Last known: updating to …", `docker start` → the row recovers by itself and shows the node's outcome; zh-CN screenshots of the row states; at the end, I has 0 POSTs (CDP network record) and 0 `update-requested`, with GETs > 0. Node-side: `requestedFrom` of the desktop's requests | All eight reviewer items in one real window |

- Test progress log: `Yes`

## Durable Coverage To Add / Update / Remove

None. The journeys need the packaged desktop app and Docker nodes. The row's states are unit-tested (IMP4-01).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| AC-007 | Step 5 | — | No | Step 5 |
| Windows/Linux desktop shells | macOS only here | Low (renderer behavior) | No | — |
| A real GitHub update between two published versions | Only one release with packages exists (v1.5.11-beta.6), so nothing newer to update to | First real update after the next release | Yes (a release needs the user) | Delivery at the next release |

## Investigation Decision

- Proceed: `Yes`. Durable changes: `No`. Reroute: `No`.
