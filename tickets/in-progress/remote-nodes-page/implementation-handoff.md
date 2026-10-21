# Implementation Handoff — Nodes → Remote Collaboration page (autobyteus-267)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: no architecture review. The design is `Medium / Low` on the direct route (Solution Designer, `handoff-implementation.md`). This handoff goes to API/E2E after the lightweight self-review below.
- Requirements doc: `tickets/in-progress/remote-nodes-page/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `tickets/in-progress/remote-nodes-page/investigation-notes.md`
- Solution revision record: `tickets/in-progress/remote-nodes-page/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/remote-nodes-page/design-spec.md` (SR-003, commit `304e49494c`)
- Supplemental task artifacts: the approved UI/UX spec, which is normative: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-nodes-page/ui-ux-spec.md`, with `visual-references/VIS-001 … VIS-007`. The UI reference is in the design repository (`personal` @ `d9e25db`).
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page`, branch `codex/remote-nodes-page`, base `origin/personal` `9e7a458808`. One implementation commit, `3a21bcae44`, following the change sequence:

1. **Server:**
   - `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)`; `listAvailableAgents(name)` now resolves the name and calls it, so the page and the tools share one path.
   - GraphQL `peerNodeOffer(nodeId)` returns `PeerNodeOfferGql {entries | refusalCode}`. Entries are `{name, kind, description}`, with no address and `description` null when absent. Exactly one of the two fields is set.
2. **Web, query and store:**
   - `GetPeerNodeOffer`;
   - `stores/remoteCollaborationOffersStore.ts`: one state per peer, `askAll`, `ask`, `forget` and `clear`, per-peer tokens, mapping and sorting.
3. **Web, page:**
   - the UI reference's `RemoteCollaborationPeersSection.vue`, `RemoteCollaborationOfferDisclosure.vue` and `RemoteCollaborationOfferList.vue`, ported onto the production store;
   - the page triggers in `RemoteCollaborationCard.vue`, where the availability card is removed;
   - `remoteCollaborationStore.addPeer` returns the added peer;
   - the spec's string table in English and Chinese; `availability.*` removed.
4. **Docs:** web `docs/settings.md` (§ Nodes: Remote Collaboration); server `docs/modules/remote_collaboration.md`.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/remote-nodes-page/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001 … SR-003
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - The contract between nodes and `PeerClient` / `PeerGateway` are unchanged; the page reuses 261's discovery path.
  - The new GraphQL query is window ↔ own server.
  - No persistence and no security change: the window never contacts a peer, and the entry fields are a subset of what agents get.
  - The escalation trigger, a change to the peer contract or to `PeerClient` / `PeerGateway`, did not fire.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see § Self-Review)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-501 / BEH-501 | Each peer shows its state: Available, or one of four unavailable states with the reason | `remoteCollaborationOffersStore.ask` → `peerNodeOffer` → `RemoteNodeDiscovery.listAvailableAgentsOf` → `PeerClient.listAvailableAgents`; `PeersSection` `statusOf` (chip colours: amber for off there / not registered there, red for not reachable / different server) and `peers.detail.{code}` | Implemented. Any other refusal code, a GraphQL error or a failed query shows Not reachable. Live: all six states from real servers (IMP-07) |
| REQ-502 / REQ-510 | Available peer: Agents and Agent Teams with name, kind, description when it has one | Resolver maps entries without address, `description` null when absent; the store keeps a description only when non-empty and drops unknown kinds | Implemented; store spec and resolver test |
| REQ-503 | One source; the window never contacts a peer | The store queries this node's GraphQL only; the server goes through `RemoteNodeDiscovery` (the tools' path; `listAvailableAgents` by name delegates to `listAvailableAgentsOf`) | Implemented; discovery test "one path" |
| REQ-504 / AC-501 / AC-505 | Asked on open, add, switch on and Refresh; waiting state per peer; usable page; never on a timer; ≤ 20 s | Card: `onMounted` (after capability and peers load) → `askAll`; the switch watcher (only after the first load) → `askAll` or `clear`; `onBeforeUnmount` → `clear`. Section: add → `ask(added.nodeId)`; Refresh → `ask(nodeId)`; remove → `forget` (only when accepted) | Implemented. Live: a black-holed peer showed Checking… for about 20.5 s from page load, then Not reachable, while the others were settled at once (IMP-08) |
| Stale answers | Token per peer; an answer for a peer removed, re-asked, switched off or with the tab left is ignored | `tokens` in the store; `forget` and `clear` drop them | Implemented; store spec "ignores a stale answer" |
| REQ-507 / AC-504 / BEH-503 | One line by default; expand; sorted by name; search when either kind has more than 6 | `RemoteCollaborationOfferDisclosure` / `RemoteCollaborationOfferList` (reference components); entries sorted by kind, then `localeCompare` within each kind | Implemented; component spec (24 + 2 entries: "10 of 24", "No match.", the all-groups sentence, Clear search, close clears) and live (IMP-10) |
| REQ-508 | Switch off: nobody asked, no states, one notice | Watcher → `clear()`; the section hides chips, sentences and Refresh when off and shows `peers.switchOff` | Implemented; card spec and live (IMP-09) |
| BEH-502 | The availability card is removed; its rules move into a collapsed line | `RemoteCollaborationCard.vue` (section removed); "How peers' runs work" in the section; `rules.*` keys; `availability.*` removed | Implemented; card spec and live (IMP-11) |
| REQ-509 | Same page in a window opened on a Docker node | No node-specific code: everything is answered by the bound node's server | By construction; the user's check (AC-506) |
| REQ-511 | Docs | `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Implemented |
| AC-507 (preserved) | Add, rename and remove as before; 261 tool results unchanged | `addPeer` behaves as before and returns the peer instead of `true`; tool contracts untouched | Existing specs updated only for the return value; server remote suite passes |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server:
  - `autobyteus-server-ts/src/remote-collaboration/discovery/remote-node-discovery.ts`
  - `src/api/graphql/types/remote-collaboration-settings.ts`
  - tests: `tests/unit/remote-collaboration/remote-node-discovery.test.ts` (extended), `peer-node-offer-resolver.test.ts` (new)
- Web:
  - `autobyteus-web/stores/remoteCollaborationOffersStore.ts` (new)
  - `stores/remoteCollaborationStore.ts`
  - `graphql/queries/remoteCollaborationQueries.ts`
  - `components/settings/RemoteCollaborationCard.vue`
  - `RemoteCollaborationPeersSection.vue`
  - `RemoteCollaborationOfferDisclosure.vue`, `RemoteCollaborationOfferList.vue` (new)
  - `localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts`
  - specs: `stores/__tests__/remoteCollaborationOffersStore.spec.ts` (new), `remoteCollaborationStore.spec.ts`, `components/settings/__tests__/RemoteCollaborationCard.spec.ts`, `RemoteCollaborationOfferDisclosure.spec.ts` (new)
- Docs as above.

## Important Assumptions

1. **Where the triggers live.**
   - The tab-level triggers (open, switch on and off, leaving the tab) are in `RemoteCollaborationCard.vue`, which already owns loading the switch and the peers. Asking every peer needs the loaded list, as the UI reference also did.
   - The per-peer triggers (add, Refresh, remove) are in `RemoteCollaborationPeersSection.vue`, where those actions happen.
   - The design's ownership map puts "the triggers wired to the store" in the section. The behavior is the design's; only the file differs.
2. **One ask on open.** The switch watcher acts only after the tab's first load has finished. Otherwise the switch resolving to on during load would ask every peer a second time.
3. **`remoteCollaborationStore.addPeer` returns the added peer, or `null` when refused** (it returned a boolean before). The design says the add mutation returns the `nodeId` the page asks for.
4. **Remove drops the peer's state only when the removal was accepted.** A refused removal keeps the peer and its state.
5. **`kind` is a GraphQL `String`.** The store keeps only `agent` and `agent_team` and drops anything else, so the page never shows an unknown kind.
6. **The "Checked" time uses the locale's own time format,** as the UI reference does ("Checked 05:42 PM" in English, "检查于 17:47" in Chinese). The spec's "HH:MM" and VIS-003 show the same 12-hour English form.
7. **A refused ask by node ID for a peer removed in the meantime** answers `PEER_NOT_REGISTERED` from the server. The window only uses the code, and its token is already stale, so nothing is shown.

## Known Risks

- **RSK-501 (accepted in the design):** with more than 6 silent peers, a 7th waits behind the browser's connection limit.
- **RSK-401 (from 261):** any registered peer can read the list until S6.
- **Live check limits:**
  - An Agent definition can't be created without a description through the API, so an entry without a description wasn't seen live; the store and component specs cover it.
  - The browser tool's viewport is fixed at 918 CSS px. The 1440 px views were rendered in a 1440 px iframe and scaled for the screenshot; the 390 px view was rendered in a 390 px iframe (media queries confirmed: `md` true / false).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a UI feature on an existing server owner.
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: `RemoteNodeDiscovery` absorbed the method; the section stays a list of peers, with the offer in its own two components.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: the availability `<section>` and the `availability.title` / `availability.note` keys in both languages, the reference's design-only `label` prop of the disclosure, and the scripted-answer store.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. `PeerOffer` is a three-phase union; an entry carries a description only when it has one.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest: `RemoteCollaborationPeersSection.vue` (about 240 lines, mostly template); every delta is under 220.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Setup per TESTING.md: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, and `pnpm -C autobyteus-server-ts build` for the live check. The untracked SDK `dist/` folders are build outputs and not part of this change.
- The live check used a test-owned cluster, all of it stopped and deleted afterwards:
  - eight servers from this worktree's `dist/app.js`, each with its own data root and HOME under `/tmp/rnp-cluster/…`, on ports 29811–29818;
  - one black-hole TCP listener;
  - the web dev server on `127.0.0.1:3948`.
- A temporary same-origin harness file (`autobyteus-web/public/__rnp-frame.html`, never committed) was deleted after the check. No user data, running app or `~/.autobyteus` data was touched. The browser tool's screenshots were copied from its artifact folder.

## Self-Review (direct route)

- **Requirements and spec:**
  - every ST-01 … ST-11 state, TR-001 … TR-012 transition and string of the spec's table is implemented;
  - the reference components were ported, with only the production store wiring changed (`checking` phase, `ask(nodeId)`, lowercase kinds, entry keys) and the design-only `label` prop removed;
  - every VIS was compared side by side (IMP-07 … IMP-13).
- **Boundaries:**
  - components → stores → `graphql/queries`; no component calls Apollo;
  - the resolver goes through `RemoteNodeDiscovery`, never `PeerClient`;
  - the window contacts no peer;
  - web guards pass.
- **State correctness:**
  - tokens cover re-ask, remove, switch-off and leaving the tab;
  - the watcher can't double-ask on open;
  - a refused removal keeps state;
  - Refresh and close clear the search, because the list is unmounted.
- **Accessibility:**
  - the chip has `role="status"`;
  - the detail area is `aria-live="polite"`;
  - the disclosure and rules buttons carry `aria-expanded`;
  - Refresh has `aria-label` "Refresh {name}" and `title`;
  - search is `type="search"` with an `aria-label`;
  - icons are `aria-hidden`;
  - focus rings as in the reference.
- **Tests:** server discovery and resolver; web store, card and disclosure specs; the existing specs updated only for the removed card and `addPeer`'s return value.

## Checks Run

Evidence: `tickets/in-progress/remote-nodes-page/evidence/implementation/`. Environment: macOS Darwin 25.5.0, Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `3a21bcae44` | macOS | server sources | REQ-503 | Pass | `IMP-01-server-typecheck.log` | `TYPECHECK EXIT 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-collaboration` | `3a21bcae44` | macOS | discovery (by ID, one path), `peerNodeOffer` mapping, the 261 discovery and delegation suites | REQ-501 … 503, AC-507 | Pass | `IMP-02-server-remote-collaboration.log` | `Test Files  16 passed (16)`, `Tests  103 passed (103)` |
| IMP-03 | `NUXT_TEST=true vitest run` on the card, disclosure, offers store and peers store specs, plus `localization` | `3a21bcae44` | macOS | the store's rules, the page's states, triggers and texts, the catalogs | REQ-501, 502, 504, 507, 508, BEH-502 | Pass | `IMP-03-web-focused.log` | `Test Files  18 passed (18)`, `Tests  61 passed (61)` |
| IMP-04 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `3a21bcae44` | macOS | web boundary and localization rules | — | Pass | `IMP-04-web-guards.log` | three `Passed` lines |
| IMP-05 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit` | `3a21bcae44` | macOS | the whole server unit suite | AC-507 | Pass | `IMP-05-server-unit-full.log` | `Test Files  787 passed \| 4 skipped (791)`, `Tests  6460 passed \| 7 skipped (6467)` |
| IMP-06 | `NUXT_TEST=true pnpm exec vitest run` (`autobyteus-web`) | `3a21bcae44` | macOS | the whole web Nuxt suite | AC-507 | Pass | `IMP-06-web-nuxt-full-excerpt.log` (the 1.8 MB full log is not committed) | `Test Files  650 passed \| 2 skipped (652)`, `Tests  4641 passed \| 5 skipped (4646)` |
| IMP-07 | Live: alpha with peers beta (8 Agents, 2 Teams), gamma (stopped), delta (switch off), epsilon (alpha not registered), zeta (another server at its address), eta (shares nothing); page at 1440 px | `3a21bcae44` working tree | test-owned cluster, web dev server | the whole page path | REQ-501, 502, AC-501 | Pass | `IMP-07-VIS-001-peers-settled-1440.png` | each chip and sentence as in VIS-001 |
| IMP-08 | Live: theta black-holed; page opened, its chip polled from load | same | same | waiting state; the 20 s bound; others not blocked | REQ-504, AC-501, QR-501 | Pass | `IMP-08-VIS-002-peer-checking-1440.png` | theta "Checking…", "Waiting for theta… up to 20 seconds.", disabled Refresh; became Not reachable about 20.5 s after load while beta was already Available |
| IMP-09 | Live: switch off in the UI, then on | same | same | REQ-508, AC-505 | Pass | `IMP-09-VIS-005-switch-off-1440.png` | the notice; no chips or Refresh; Rename / Remove on all seven peers; on → every peer asked (fast peers settled within 0.4 s, theta Checking…) |
| IMP-10 | Live: beta opened, search "er" | same | same | REQ-507, AC-504 | Pass | `IMP-10-VIS-003-expanded-search-1440.png` | "5 of 8", "0 of 2", "No match.", "Checked …" |
| IMP-11 | Live: rules line opened; eta removed and added back; theta Refresh | same | same | BEH-502, UXJ-003, UXJ-004, TR-005, TR-011 | Pass | `IMP-11-VIS-004-empty-offer-rules-1440.png` | the four rules bullets; "eta shares no Agents or Agent Teams."; eta re-added last and asked at once; theta Refresh → Checking…, icon disabled and spinning, beta untouched |
| IMP-12 | Live: Chinese (`zh-CN` preference), beta open | same | same | the Chinese strings | Pass | `IMP-12-VIS-006-zh-CN-1440.png` | 可用, 无法连接, 对方已关闭, 未在对方登记, 服务器不一致, 检查中…, the counts, 按名称搜索, 检查于 |
| IMP-13 | Live: 390 px, beta open; leaving the tab and returning | same | same | narrow wrap rule; stacked groups; re-ask on return | Pass | `IMP-13-VIS-007-narrow-390-header.png`, `IMP-13-VIS-007-narrow-390-open.png` | actions on a second line under the name block; groups stacked (same left edge); no horizontal overflow (document width 390); on return theta is Checking… again |

- Not run, and why:
  - the API/E2E web run against two real servers with a request log (AC-502's "the window makes no request to the peer", AC-505's add-then-asked through the UI over HTTP) is API/E2E's; IMP-07 … IMP-13 are implementation self-validation;
  - AC-506, the user's desktop ↔ Docker check, is the user's.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Nodes → Remote Collaboration (UIS-001); UXJ-001 … UXJ-005.
- Approved UI/UX, interaction, requirement, or design references: the UI/UX spec above; VIS-001 … VIS-007; the reference components at `d9e25db`.
- Existing design system, shared components, and adjacent product surfaces reviewed: the Nodes page shell and tab list; the switch card (`FeatureCapabilityToggleCard`, unchanged); the Manage Nodes pill colours; the reference components (ported).
- Testing guideline or development / preview instructions and rendered surface used: the web dev server (`nuxt dev`) against a test-owned server cluster from this worktree's build; a same-origin iframe for exact 1440 and 390 px viewports.
- States, layouts, viewports, and interactions inspected:
  - ST-01 … ST-10 (ST-11 in specs);
  - 1440 and 390 px; English and Chinese;
  - expand, search, Clear search, close, Refresh, remove and re-add, switch off and on, leaving and returning to the tab;
  - the 20 s bound on a black-holed peer.
- Visual or interaction issues found and corrected: none found in the port; it matched the references on the first render.
- Check IDs with the supporting evidence, and remaining unverified states or limitations:
  - IMP-07 … IMP-13;
  - not seen live: an entry without a description (the API requires one; specs cover it), and a peer with only one kind (specs cover it);
  - keyboard: native buttons (Enter and Space) and `aria-expanded` were verified in specs; there was no separate live keyboard walk-through.

## Downstream Coverage Hints / Suggested Scenarios

- **Two-server (or more) web E2E**, extending the remote-collaboration harness:
  - the four peer states and a black-holed peer, with each settling at its own pace;
  - the request log shows the window never calls a peer URL (AC-502);
  - add, then the new peer is asked; switch off: no `peerNodeOffer` requests; switch on: one per peer;
  - leaving the tab and returning asks again;
  - Refresh asks one peer only.
- **AC-504 with 30 entries:** the list starts as one line; typing narrows it; clearing restores it.
- **The list equals `list_available_agents {node}`** for the same peer (names, kinds, descriptions).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-501, AC-502, AC-504 and AC-505 at the browser-and-server level, with a request log; AC-506 with the user.
