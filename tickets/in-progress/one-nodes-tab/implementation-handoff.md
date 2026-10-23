# Implementation Handoff — one-nodes-tab

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected and passed (`ARCH-REV-003`). Classification Large / High, so the handoff rule routes to independent source review (`/software_engineering_team/code_reviewer`).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/requirements-doc.md` (Approved, SR-006)
- Investigation notes: `.../one-nodes-tab/investigation-notes.md`
- Solution revision record: `.../one-nodes-tab/solution-revision-record.md` (SR-001 … SR-007)
- Design spec: `.../one-nodes-tab/design-spec.md` (SR-007, Ready)
- Supplemental task artifacts: the Product Team's approved UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` with `visual-references/` VIS-001…031 (normative), and its runnable reference (`components/settings/nodes/*`, `localization/messages/*/nodesPage.ts`, used for visual fidelity; its mock store is not architecture). `ui-sketch.md` is superseded.
- Design review report: `.../one-nodes-tab/design-review-report.md` (Pass)
- Architecture review revision record: `.../one-nodes-tab/architecture-review-revision-record.md` (`ARCH-REV-003`)
- Triggering rework report, revision record, or evidence: code review `CRR-001` (Fail; CR-001 … CR-004, all Local Fix): `.../one-nodes-tab/code-review-report.md`, `.../one-nodes-tab/code-review-revision-record.md`

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`, branch `codex/one-nodes-tab`, base `origin/personal` `ca1f09e52a`. Commits (rebuilt for CR-004, branch not pushed): `9457972953` baseline fix (the projects test only), `e16d848e0f` implementation (IR-001; same tree as the earlier `5fc0ad389a`), `780e846d4a` ticket docs (IR-001), `23f3feb193` CRR-001 local fixes (IR-002).

## Current Implementation Summary

- Implementation cycle: `Rework` (CRR-001 local fixes)
- Implementation revision record: `.../one-nodes-tab/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001: initial implementation)
- Related solution revision IDs: `SR-006`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-001, CR-002, CR-003, CR-004

IR-002 (CRR-001) changes, all within the reviewed design:
- CR-003: the connector's wiring is its own file, `services/nodeCollaboration/windowNodeCollaborationConnector.ts`. `nodeListStore` owns rename, change address (through the connector, no dialog), each row's unfinished step (`setUnfinishedStep`/`unfinishedStepOf`, as design § Product Package Mapping places it) and the change subject (`changeSubjectOf`). `nodeChangeDialogStore` depends on the list only (dialog → list). `addNode` returns `{ok, key, confirm}` and `AddNodePanel` opens the confirmation; `NodeList` cancels the dialog when it unmounts.
- CR-002: Change address is one step, `changeAddressHere` with the typed address; the server's `changePeerAddress` checks it and returns the details the page words.
- CR-001: `remoteCollaborationStore` drops `loaded`/`loadError`; a failed load throws and keeps the last list (`nodeListStore.open` tolerates it; a plan that cannot read the peers asks the row again).
- CR-004: history rebuilt so the baseline-fix commit holds only `project-task-index-status.test.ts` and the removals sit in the implementation commit.

The design is implemented in the order of its Change / Refactor Sequence:

1. **Server `remote-collaboration`.** `channel/transport-failure-reason.ts` classifies Node `fetch` failures (`refused`, `timeout`, `not_found`, `unreachable`). `PeerClient`'s identity probe throws `PEER_UNREACHABLE` with `{reason, address}` and a plain message; its refusals carry `reason` on a remote-collaboration type (`domain/peer-refusal.ts`; agents' texts unchanged, the port type untouched). `settings/peer-address-resolver.ts` (`PeerAddressResolver`, DS-005): switch must be on, refuses this node itself, probes every candidate at once, returns the first in order that answers with the expected node ID, or refuses with `attempts`, `reason`, `address` and `loopbackInContainer` (`server-addressing/runs-in-container.ts`). `PeerDirectory.add({nodeId, name, baseUrl})` (clean cut; `PEER_IDENTITY_MISMATCH` when another node answers) and `changeAddress`. `RemoteNodeDiscovery.checkAvailabilityOf`. GraphQL: `addPeerNode` new input, `changePeerAddress`, `resolvePeerAddress`, `peerAddressCandidates`, `peerNodeAvailability`, `peerNodeOffer.unreachableReason`, and settings error extensions `{code, reason?, address?, loopbackInContainer?, attempts?}`.
2. **Desktop registry.** `NodeProfile.serverInstanceId` (optional; `capabilities`/`capabilityProbeState` and their types removed); `normalizeLoadedNode` reads a valid ID and no longer reads the dropped fields; the `identify` change (`identifyNodeEntry` in `electron/nodeRegistryStore.ts`, used by `applyNodeRegistryChange`; a no-op identify writes nothing).
3. **Web data.** `utils/nodeIdentityProbe.ts`, `utils/nodeSettingsError.ts`, `nodeStore.identifyNode` and `addRemoteNode({name, baseUrl, serverInstanceId?})` without opening the window, `remoteCollaborationStore` as this node's one peer write path (structured refusals), the offers store's `reason`, `services/nodeCollaboration/{directNodeApolloClient,nodeCollaborationApi,nodeChangePlan,nodeCollaborationConnector,windowNodeCollaborationConnector}.ts`, `stores/nodeListStore.ts` (rows, asks, add, open, rename, change address, per-row unfinished step) with `stores/nodeRowStatus.ts` (pure row derivation) and `stores/nodeChangeDialogStore.ts` (the one confirmation's plan; depends on the list only).
4. **Web UI.** `components/settings/nodes/{ThisNodeCard,NodeList,AddNodePanel,NodeRow,NodeConnectionDetails,NodeChangeDialog,NodeAddressHint,RemoteCollaborationIcon}.vue`; `RemoteCollaborationOfferDisclosure.vue` gains a slot, a `label` and an optional `v-model`; `NodeManager.vue` is tabs and panels only; the Remote Collaboration tab is gone; `localization/messages/{en,zh-CN}/nodesPage.ts`.
5. **Removal** (design removal plan): `RemoteCollaborationCard.vue` + spec, `RemoteCollaborationPeersSection.vue`, `CurrentWindowNodeCard.vue`, `utils/nodeCapabilityProbe.ts` + spec, `utils/nodeHostValidation.ts` + spec, the probe fields, `AddPeerNodeInput {baseUrl, name}`, the dead `NodeManager.*` / `RemoteCollaboration.*` keys (en + zh-CN), the disclosure's dead `footer` prop. Docs: web `docs/settings.md` (§ Nodes: Manage Nodes), server `docs/modules/remote_collaboration.md`. The Docker guide does not tell users to add peers by hand, so it is unchanged.

Collateral updates named by the review: the server two-server E2E (`addPeerNode` with `nodeId`) and `types/__tests__/node.spec.ts` (dropped fields).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change spans the server's remote-collaboration subsystem (GraphQL contract change, new error extensions, new queries), the desktop registry's persisted shape (one field added, two dropped, no migration), and a new two-node write coordination in the web with partial-failure semantics, as the design says. No escalation trigger fired: no new inbound peer-request kind, the gateway admission (CM-12) unchanged, no data migration.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. CRR-001 accepted A1–A8; the design § Run Rules `changeAddress` row is to be reconciled at docs sync (A1, CR-002).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-703 (REQ-702, 703, 711; AC-702) | One row per node, joined by node ID; both stored lists keep their owners | `nodeListStore.rows` joins `nodeStore.nodes` (by `serverInstanceId`, first-created first; several entries of one node join) with `remoteCollaborationStore.peers`; a never-reached entry is its own `d:<id>` row; peer-only rows (DEC-706). The window probe identifies entries (`identify`) and the row re-keys. Name: peer name, else desktop label (DEC-705). | Implemented; unit-tested (`nodeListStore.spec.ts`, the user's 8001/"docker" case). |
| BEH-701/702 (REQ-704; AC-703) | One add form; switch on by default; confirmed once; no window opened; duplicates by address (any state, AR-008) or node ID | `AddNodePanel.vue` → `nodeListStore.addNode`: address check against every row, 1.5 s identity probe race, node-ID check, `nodeStore.addRemoteNode` (no `openNodeWindow`), highlight, confirmation only when reachable and switch on | Implemented; unit-tested; observed (IMP-08 steps 2, 11, 12). |
| BEH-704 (REQ-705, 706; AC-704…706) | One confirmed plan on both nodes; each direction's state; one line + one fixing button | `nodeChangeDialogStore.request` → `nodeCollaborationConnector.plan` (facts from both nodes, naming rule) → `resolveAhead` (sides already on) → `run` by § Run Rules; this node through its stores, the other node through `nodeCollaborationApi`, the list through `nodeStore`. Row lines/directions: `nodeRowStatus.rowViewOf`. B→A: B's peers (address, AR-009) and `peerNodeAvailability`. | Implemented; connector, row-status and dialog/row component tests; observed on two real servers (IMP-08 steps 3–9). |
| BEH-705 (REQ-707, 708; AC-707) | Named causes; Docker loopback hint (server-computed) | Server: classifier, `PeerAddressResolver`, `PeerDirectory.changeAddress`, error extensions. Web: `nodeConnectionErrorText`, `NodeAddressHint.vue` in the dialog (resolve steps) and in Change address; Use this retries with `host.docker.internal:<port>` first. | Implemented; unit-tested both sides; "fetch failed" never shown (IMP-04, IMP-08 steps 6, 12, 15). The hint end to end needs a node in Docker (not run here). |
| BEH-706 (REQ-701, 709; AC-701) | No Remote Collaboration tab; the switch and rules in Manage Nodes | `NodeManager.vue`, `NodeManagerTabs.vue`, `ThisNodeCard.vue` | Implemented; `NodeManager.spec.ts`; observed (IMP-08 steps 1, 13). |
| BEH-707 (REQ-712, 703; AC-710) | 267 offers under the bar once collaborating; asked on open, add, switch on, refresh; no polling; per-row tokens | `nodeListStore.ask` (tokens per row; offers via the offers store), `RemoteCollaborationOfferDisclosure` with the details slot | Implemented; preserved 267 offer tests pass. |
| REQ-710 (AC-708, 709) | Rename once; Remove confirms, removes there when reachable, says when it could not | Rename: `nodeListStore.renameNode` → connector `rename` (`renameHere` then `renameInList`, stop). Remove: connector `remove` (continue to `removeFromList`). | Implemented; observed (IMP-08 steps 10, 14, 15). |
| REQ-713 | Docker window, browser, en + zh-CN | "This node" is the window's node; the embedded node is a row with Open and no Remove; browser has no Open (spacer); zh-CN catalog | Browser + zh-CN observed; Docker window and Electron not run here. |
| REQ-714 | Docs | `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Updated. |
| Preserved (AC-713) | 267 offer behavior, refusals, agent tool texts, Open | Agent-facing refusal texts unchanged (`peer-client.test.ts`); offers store tests unchanged and passing; Open unchanged except that adding no longer opens (SR-006) | Server unit and web suites green (IMP-03, IMP-05). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/remote-collaboration/{channel/transport-failure-reason.ts, channel/peer-client.ts, domain/peer-refusal.ts, domain/remote-collaboration-settings-error.ts, settings/peer-address-resolver.ts, settings/peer-directory.ts, discovery/remote-node-discovery.ts, remote-collaboration-services.ts}`, `src/server-addressing/runs-in-container.ts`, `src/api/graphql/types/remote-collaboration-settings.ts`.
- Electron: `autobyteus-web/electron/{nodeRegistryStore.ts, nodeRegistryTypes.ts, application/electronApplication.ts}`, `autobyteus-web/types/node.ts`.
- Web stores/services/utils: `stores/{nodeListStore,nodeRowStatus,nodeChangeDialogStore,nodeStore,remoteCollaborationStore,remoteCollaborationOffersStore}.ts`, `services/nodeCollaboration/*.ts`, `utils/{nodeIdentityProbe,nodeSettingsError,nodeConnectionErrorText}.ts`, `graphql/{queries,mutations}/remoteCollaboration*.ts`.
- Web components: `components/settings/nodes/*.vue`, `components/settings/{NodeManager,NodeManagerTabs,RemoteCollaborationOfferDisclosure}.vue`.
- Localization: `localization/messages/{en,zh-CN}/{nodesPage,index,remoteCollaborationSettings,settings,settings.generated}.ts`.
- Tests: server `tests/unit/remote-collaboration/{peer-address-resolver,transport-failure-reason}.test.ts` (new) and updated settings/client/offer-resolver/discovery tests, the two-server E2E input; Electron `nodeRegistryStore.spec.ts`; web specs for the connector, API, row status, list store, probe, error text, dialog and row components, plus updated store/NodeManager/disclosure/zh-CN-consistency specs.

## Important Assumptions

Decisions taken where the design text left room, each toward the approved requirements and the normative visuals. The code reviewer may route any of them to the Solution Designer.

- **A1 — Change address checks the typed address alone** (accepted in CRR-001). § Run Rules says `changeAddress` is `resolveHere` "(with the typed address first)". Adding the other node's candidates after it meant a wrong or loopback address was quietly replaced by a working candidate (observed, IMP-08 step 6), which would make AC-707's own case, VIS-026 and TR-711's "A different node answers there…" unreachable. Since CR-002 the plan is one step, `changeAddressHere` with the typed address: the server's `changePeerAddress` checks the pinned node answers there and returns `PEER_IDENTITY_MISMATCH` or `PEER_UNREACHABLE` with `reason`, `address`, `loopbackInContainer`. Use this saves the suggested address the same way.
- **A2 — Naming rule drops the scheme.** § Naming Rule's literal steps turn `http://localhost:8003` into `http-localhost-8003`; its own example (and the "Peer name for an existing row" example) is `localhost-8003`. The rule drops a leading `scheme://` first, matching the examples.
- **A3 — Copy added beyond `nodesPage.ts`** (en + zh-CN), for causes the reference does not script: `cause.unreachable` ("No answer from that address."), `cause.thisNode`, `error.nameTaken` ("<node> already has a node named <name>.", from § Naming Rule 4) and `error.other` (fallback with the server's message). Eight reference keys nothing uses were left out (`detail.offState`, `detail.offersUnavailable`, `dialog.list`, `hint.noAddress`, `row.agents`, `row.collapse`, `row.expand`, `row.open`).
- **A4 — The window's own failure cause.** A browser reports only "Failed to fetch". The window probe reads a failure as `refused` for loopback hosts (nothing else can fail there), `timeout` by its error name, otherwise `unreachable`. The server's classifier gives full causes for every server-side request.
- **A5 — File split for size and ownership** (reshaped by CR-003). `nodeListStore` (rows, asks, add, open, rename, change address, each row's unfinished step) is accompanied by `nodeRowStatus.ts` (pure row derivation), `nodeChangeDialogStore.ts` (the one confirmation's plan and Use this; dialog → list only) and `windowNodeCollaborationConnector.ts` (the connector's wiring to the stores). `utils/nodeSettingsError.ts` is the one structured-refusal type shared by `remoteCollaborationStore` and `nodeCollaborationApi`.
- **A6 — Rename "taken"** also counts this node's own name (the spec: "a name used by another node"; observed IMP-08 step 10).
- **A7 — A peer-only row while this node's switch is off** shows a neutral dot (no reachability claim) and "Off on this node" in its details (design § Window Probes While The Switch Is Off).
- **A8 — A plan that cannot read the other node** (for connect/finish) opens no dialog; the row is asked again and shows "Not reachable … [Check again]". For disconnect/remove, an unreadable other node keeps `removeThere` in the plan when this node has it registered, so the result reports it.

## Known Risks

- RSK-701, RSK-702, RSK-703 as accepted in the design (unauthenticated settings calls on the other node; a black-holed candidate before the match can delay resolution up to 20 s; a partial connect stays visible, no rollback).
- Pinia keeps a store instance across Nuxt HMR, so a dev session can run an older connector until reload (development only; observed once).
- `directNodeApolloClient` bounds each request to the other node at 25 s (above the server's 20 s peer bound) so a resolve on the other node can finish.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature plus behavior change)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`: `NodeManager.vue` reduced from 381 lines to tabs and panels (112 effective lines); one projection owner (`nodeListStore` with its pure derivation), one coordination owner (`nodeCollaborationConnector`), small single-purpose components; obsolete pieces removed.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A` (A1–A3 are text reconciliations, listed above).
- Evidence / notes: § Key Files; removal list in § Current Implementation Summary item 5.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no `?nodeTab=remoteCollaboration` alias; no old `addPeerNode` input; no reading of the dropped registry fields)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (obsolete components/utilities/tests, the disclosure's `footer` prop, the store's `error`/`errorScope`/`saving` and, after CR-001, `loaded`/`loadError`, dead keys including two `NodeManager.*` generated keys that were already unused)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`NodeRow` keeps `windowAddress` and `peer.baseUrl` separate; `PeerRefusal` extends the port refusal on the remote-collaboration side)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest changed source files (effective non-empty lines): `localization/messages/{en,zh-CN}/settings.ts` 482 (shrank), `electron/application/electronApplication.ts` 405 (+11), `stores/nodeStore.ts` 299, `stores/nodeListStore.ts` 238, `services/nodeCollaboration/nodeCollaborationConnector.ts` 223, `components/settings/nodes/NodeRow.vue` 209.
- Notes: historical ticket documents under `autobyteus-web/tickets/multi_node_window_v1_ticket/` mention the removed utilities; they are records, left unchanged.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (desktop registry); `peers.json` `Not Affected`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `electron/__tests__/nodeRegistryStore.spec.ts`: an entry written before this change (with `capabilities`/`capabilityProbeState`) loads without them and the next save no longer has them; a valid `serverInstanceId` is read, an invalid one is treated as absent; `identify` sets/replaces, is a no-op when equal, refuses unknown entries and invalid IDs. In the browser, `nodeStore` reads `localStorage` as is and writes no probe fields.
- Migration implementation and focused checks: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, and `pnpm -C autobyteus-server-ts build` (for the rendered check's servers) per TESTING.md. `prepare:shared` rebuilt the SDK `dist/` folders, which are untracked build outputs and are not committed.
- The rendered check's test-owned servers and Nuxt dev server ran from `/tmp/one-nodes-visual/` and are stopped after the handoff (see IMP-08).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/evidence/implementation/`. Commits on `codex/one-nodes-tab` (rebuilt for CR-004): `9457972953` (baseline fix: one projects test's timing window, TESTING.md rule 9; see IMP-03a), `e16d848e0f` (implementation; the same tree as `5fc0ad389a`, the hash the IMP-02 … IMP-08 logs name) and `23f3feb193` (CRR-001 fixes; web only). IMP-02 … IMP-08 cover IR-001 and still hold for the server, Electron and unchanged web code; IMP-09 … IMP-11 cover IR-002.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `e16d848e0f` | macOS, Node v22.23.1 | server `src` | all server changes | Pass | `IMP-02-server-typecheck.log` | `exit=0` after `tsc -p tsconfig.build.json --noEmit` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `e16d848e0f` | macOS, Node v22.23.1 | server unit suite incl. `tests/unit/remote-collaboration/*` (resolver, classifier, directory, client, discovery, resolver mapping) | BEH-704/705, DS-005, REQ-707/708, AC-713 | Pass | `IMP-03-server-unit.log` | `Test Files  790 passed | 4 skipped (794)`, `Tests  6484 passed | 7 skipped (6491)` |
| IMP-03a | First server unit run (shared the machine with the web suite) | 5fc0ad389a (same code) | macOS, Node v22.23.1 | server unit suite | — | Fail (1 test, not this change) | `IMP-03a-server-unit-first-run.log` | `Tests  1 failed \| 6483 passed`; the failing test is `project-task-index-status.test.ts` (projects); cause and the baseline fix (`d62efda0ff`, rebuilt as `9457972953`) are at the end of the file |
| IMP-04 | GraphQL calls on two test-owned servers of this worktree (switch off/on, resolve, wrong node ID, candidates) | `e16d848e0f` | macOS; `dist` from the working tree; own data roots; `env -i` | resolver, directory, GraphQL edge, error extensions | DEC-709 (b), DS-005, REQ-707 | Pass | `IMP-04-server-api-sanity.log` | `"code":"REMOTE_COLLABORATION_OFF"` while off; `"resolvePeerAddress":"http://127.0.0.1:38702"`; `"result":"refused"` and `"result":"not_found"`; `"code":"PEER_IDENTITY_MISMATCH"` |
| IMP-05 | `(autobyteus-web) NUXT_TEST=true pnpm exec vitest run` | `e16d848e0f` | macOS, Node v22.23.1 | all web unit and component specs, incl. the new node specs | BEH-701…707, REQ-701…713 | `Pass` | `IMP-05-web-unit.log` | ``Test Files  656 passed | 2 skipped (658)`, `Tests  4724 passed | 5 skipped (4729)`` |
| IMP-05b | `(autobyteus-web) NUXT_TEST=true pnpm exec vitest run stores components/settings services utils localization` after the last `nodeListStore.ts` edit (a readability change to the reached check) | e16d848e0f | macOS, Node v22.23.1 | web stores, settings components, services, utils, localization specs | as IMP-05 | Pass | `IMP-05b-web-rerun.log` | `Tests  2613 passed (2613)` |
| IMP-06 | `(autobyteus-web) pnpm exec vitest --config ./electron/vitest.config.ts run` | `e16d848e0f` | macOS, Node v22.23.1 | Electron main-process specs incl. `nodeRegistryStore.spec.ts` (`identify`, projection), `preload.spec.ts` | REQ-711, AC-702, persisted-data decision | `Pass` | `IMP-06-electron.log` | ``Test Files  38 passed | 1 skipped (39)`, `Tests  218 passed | 1 skipped (219)`` |
| IMP-07 | `pnpm guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `e16d848e0f` | macOS | web boundary and localization rules | REQ-713 | `Pass` | `IMP-07-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-09 | `(autobyteus-web) NUXT_TEST=true pnpm exec vitest run` after the CRR-001 fixes | `23f3feb193` | macOS, Node v22.23.1 | all web specs incl. the new `nodeChangeDialogStore.spec.ts`, `AddNodePanel.spec.ts` and updated list-store, connector, row and store specs | CR-001…CR-003; BEH-701…707 | Pass | `IMP-09-web-unit-crr001.log` | `Test Files  658 passed \| 2 skipped (660)`, `Tests  4733 passed \| 5 skipped (4738)` |
| IMP-10 | web guards after the CRR-001 fixes | `23f3feb193` | macOS | web boundary and localization rules | REQ-713 | Pass | `IMP-10-web-guards-crr001.log` | the three `Passed` lines |
| IMP-11 | Rendered re-check of the restructured flows on fresh test-owned servers (add → confirmation, rename, change address; plus `identify` replacing a stale ID) | `23f3feb193` | as IMP-08 | `nodeListStore`, `nodeChangeDialogStore`, `AddNodePanel`, connector, server `changePeerAddress` | CR-002, CR-003; AR-003; TR-702, TR-711 | Pass | `IMP-11-rendered-recheck-crr001.md` | step 3 dialog text; step 6 "Nothing answers at that address and port."; step 7 `lab box @ http://localhost:38702` |
| IMP-08 | Rendered check: Nuxt dev server against two test-owned servers; narrow tab and 1440 px iframe; steps in the notes | `e16d848e0f` | macOS, agent Chromium; servers as IMP-04 | the whole Manage Nodes page, stores, connector, both servers | UXJ-701…707, 709, 710; VIS-001/003/006/008/009/010/011/013/019/022/024/027/028/030 behavior | Pass (two defects found and fixed during the check; see notes) | `IMP-08-rendered-check.md`, `IMP-08-*.png` | the step table; e.g. step 15 "Removed here. lab box could not be reached, so this node is still registered there." |

- Not run, and why:
  - Server integration suite and server E2E (incl. the updated two-server E2E `addPeerNode` input): left to API/E2E (TESTING.md layers; the E2E needs its own owned stack). The E2E file's change is the input shape only.
  - The project-wide web `tsc` is not a usable gate here: it reports 720 errors before and after, mostly module resolution (`@apollo/client/core`, `graphql`) that also hits untouched files such as `plugins/30.apollo.client.ts`. The Vitest suites compile every changed file.
  - Electron shell (Open, IPC `identify` live, the Docker-window context), a node in Docker (the loopback hint end to end, AC-704's `host.docker.internal` address, AC-707), and the agents delegating across the two nodes after connect: need an isolated desktop instance and a test-owned container (API/E2E).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Nodes → Manage Nodes (UIS-001…006); UXJ-701…707, 709, 710.
- Approved UI/UX, interaction, requirement, or design references: the Product package's `ui-ux-spec.md` and VIS-001…031; its reference components for exact classes and markup.
- Existing design system, shared components, and adjacent product surfaces reviewed: Nodes page cards and tab bar, the confirmation frame, the switch styling of `FeatureCapabilityToggleCard`, the 267 offer disclosure and list (reused, extended with a slot, label and `v-model`).
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md (renderer UI: web unit tests + a browser view); Nuxt dev server in browser mode against two test-owned servers of this worktree.
- States, layouts, viewports, and interactions inspected: see IMP-08 (17 steps): empty list, add (reachable, duplicate by node ID, unreachable), confirmation (both off; finish; registered only there), running and done, details with both directions, Change address error, off there, turn off, rename (taken, saved), this node off, remove (list only; failed there), zh-CN, narrow stacking.
- Visual or interaction issues found and corrected: (1) the confirmation did not open after adding (window address taken only from a finished probe) → fixed; (2) Change address silently kept another address → A1; (3) "Change address" hidden while this node is off, unlike VIS-024 → shown, and a refusal there reads "Off on this node".
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-08. Not seen rendered: the Docker hint end to end (rendering covered by `NodeChangeDialog.spec.ts`), the Electron Open icon and the Docker-window context, a node with shared agents (counts line; covered by `NodeRow.spec.ts` and 267's tests), the running dialog's spinner (covered by `NodeChangeDialog.spec.ts`), and pixel-level comparison with every VIS image.

## Downstream Coverage Hints / Suggested Scenarios

- AC-704 with one node in Docker (test-owned container from the node image, `dist` mounted): the Docker side registers this node at `host.docker.internal:<port>`; both directions working; agents list each other's agents.
- AC-707: Change address `http://127.0.0.1:<desktop port>` in a window on the Docker node → the hint; Use this → saved `host.docker.internal:<port>`.
- AC-703 in Electron: adding does not open the window; Open opens it; a peer-only row's first Open adds a desktop entry.
- AC-705 / AC-709 with the other node stopped: "this node is still registered there".
- AC-710: a black-holed address (e.g. `10.255.255.1`) → checking, then not reachable after ~20 s; other rows usable.
- The name race (PEER_NAME_TAKEN between plan and run) and the naming collision " 2".
- REQ-711 on a registry written by the current release (entries with `capabilities`): loads, rows join after the first probe, the next save drops the fields.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Server integration and E2E suites, including the updated `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`.
- An isolated desktop instance of a worktree build for the Electron paths (Open, `identify` over IPC, the Docker-window context) and the user's journeys.
- A test-owned Docker node for AC-704/AC-707.
