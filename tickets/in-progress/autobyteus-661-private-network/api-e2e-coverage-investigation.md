# API/E2E Coverage Investigation — autobyteus-661, build slice T-3 (node keys, one pairing model, migration)

## Investigation Meta

- Requirements: `requirements-doc.md` (SR-001); Investigation notes: `investigation-notes.md`; Solution revision record: `solution-revision-record.md` (incl. T-3 decision (b), CR-001/CR-002 decisions).
- Design spec: `design-spec.md` (Ready; AR-001…AR-006); supplements: `pairing-contract.md` (current 2026-11-27, APP 32/32), `use-case-spines.md`.
- Design review: `design-review-report.md` (ARCH-REV-004), `architecture-review-revision-record.md`.
- Implementation: `implementation-handoff.md` (IR-002), `implementation-revision-record.md`.
- Code review: `code-review-report.md` (CRR-002, Pass), `code-review-revision-record.md`.
- API/E2E revision record: `api-e2e-revision-record.md`; current revision: becomes `API-REV-001` (first API/E2E round of this ticket; T-3).
- Round 1; trigger: `/code_reviewer` CRR-002 Pass, 2026-11-27.

Paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-661-private-network/tickets/in-progress/autobyteus-661-private-network/`.

**Commit under test: b59628b4bf.** It includes 7f723d717b (T-4 part 1: caller socket and the private-network gate path), which is **not code-reviewed** (its review comes with T-4); every check here runs that code too. The shared worktree holds another agent's uncommitted T-4 work, so every check runs in API/E2E's own clone of b59628b4bf (`/tmp/661-api/clone`, `git clone --no-local`, frozen install, `prepare:source`, `build`), never in the shared worktree, and nothing there was changed except new ticket files and the new test file (committed by path).

## Current Requirement And Design Basis

One pairing model with node keys (REQ-006…REQ-009, AC-004…AC-008): own nodes pair in one click with a grant bound to the asking node (`forNodeId`); other nodes pair by Pair → Accept / Reject / Cancel; every peer request is node-key signed (contract §5); a node held with a key refuses another key for that node ID, with or without a grant (contract §1 key rule, CR-001, NAS-53); in one click the asking node pairs at the first of the window's address and the other node's own `addresses` that answers as it (CR-002); the receiving node keeps the first of the asking node's addresses that answers as it (decision (b)). After the update, existing pairings show "Pair again" and the switch is deleted (REQ-012, AC-011, D-3, D-4) by the sealed migration `20261127_peers_to_node_keys`.

## Supported Scenarios And Real Usage

- Designer scenarios: S-1 (own nodes, one click), S-2 (Pair → Accept), S-3 (any admitted caller claims a paired node's ID: refused), S-4 (Pair again with the same key), SCN-004 (pair on a LAN by address), SCN-006 (update with existing pairings), SCN-007 (stranger / stolen key).
- Added from the implemented behavior, each with its real trigger:
  - SCN-A1: the desktop window pairs this computer's node with a local Docker node (window's Pair; decision (b)).
  - SCN-A2 (CR-002 a): a window bound to a Docker node pairs it with this computer's node, which the window reaches at 127.0.0.1.
  - SCN-A3 (CR-002 b): two Docker nodes published on 127.0.0.1, paired from one's window.
  - SCN-A4: an upgrade from a released version whose nodes were paired with invite texts and the switch on; then Pair again from a window (one click), as a user does after the update.
- Rejected as contrived: S-X1 (`pair-accepted` reply lost after A stored B; code review).

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `PeerPairing`, `NodeKey`, `PeerDirectory`, verifier | unit (IMP-03/07) | Accept/Reject/Cancel across processes | e2e over HTTP (new durable file) |
| API / transport / contract | Yes | `/rest/remote/pair*`, GraphQL pairing | unit, two-server e2e (grant, signing, Unpair) | pending/outstanding over HTTP; NAS-53 over HTTP | new durable e2e |
| Authentication / permissions | Yes | route table (exempt pair routes), gate peer verifier | node-access-model e2e (IMP-05) | every other route through the changed gate | whole server E2E (TESTING) |
| Persisted-data transition | Yes | `peers.json`, `.env` | migration tests on synthesized fixtures | data a released build wrote, its ledger, a real upgrade | released image → this package on the same volumes |
| Worker / distributed coordination | Yes | address choice between nodes | two-server e2e (all on 127.0.0.1) | Docker networking (container loopback, host alias) | Docker nodes of this commit |
| Frontend | Yes (API plumbing, removals) | connector `pair` step | web specs (IMP-04, IMP-07) | — (T-6 UI) | the connector's calls replayed exactly |
| Desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root). Applicable rules: the node's request gate / node credentials / shared e2e helpers changed → **whole server E2E** (`pnpm test:e2e`); a required input of server owners → whole unit and `test:integration`; GraphQL operations changed → demo coverage spec + `autobyteus-ios/scripts/prepare-demo-web.sh --build`; `autobyteus-web/generated/graphql.ts` is a build input → **fresh-start build**; no build step or gate changed → no build-only release run. Docker server nodes: test-owned containers, this worktree's server package mounted read-only, fresh volumes. Migrations: data a released build wrote, faithful ledger.
- Environment: macOS arm64, Node 22.23.1, Docker 29.0.1; released image `autobyteus/autobyteus-server:beta` = 1.5.14-beta.7 (local; not pulled or retagged: other containers on this machine may use the tag).

## Persisted Data Transition Coverage Basis

- Decision: `Migration Required` (sealed `20261127_peers_to_node_keys`).
- Representative existing data: produced by the released build itself (three released nodes paired by invite text, switch on), not hand-written; `.env` as the release wrote it (switch line last, no final newline).
- Evidence planned: file shapes before/after (secrets redacted), `.env` bytes, file modes, the ledger row, `peerNodes` ("Pair again"), Pair again in one click, signed requests after, a second start changing nothing.
- Other released shapes (`role: "sandbox"`, `role: null`, rows without `peerSecret`) stay with the migration tests' synthesized fixtures (1.5.14-beta.7 predates sandboxes).

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| `tests/unit/remote-collaboration/peer-pairing.test.ts`, `peer-directory.test.ts`, verifier, migration tests | NAS-47…53, AC-005, migration | Still Valid | Reuse (IMP-03, IMP-07) |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | grant pairing, signing, Unpair | Still Valid | Reuse (IMP-07, 61/61 at b59628b4bf) |
| `tests/e2e/node-access/node-access-model.e2e.test.ts` and the rest of `tests/e2e` | the gate for every route | Still Valid | Whole suite (API-05) |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs`, `remote-nodes-page-probe.mjs` | Manage Nodes | Stale (drive the removed switch) | Out of scope here: FU-661-02, rewritten in T-6 |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | all T-3 | typechecks, unit, web specs, selected e2e, two-server e2e | Reused | IMP-01…IMP-07 | ran on the reviewed commits; whole unit and integration rerun below where inputs changed after IMP-03 |
| API-01 | AC-005, AC-007, NAS-49…51 | Pair → Accept / Reject / Cancel across real servers over HTTP | Durable (new) | `tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts` PRQ-01…03 | only in-process before |
| API-02 | NAS-53, CR-001 | key conflict with/without a grant; grant from another node | Durable (new) | same file PRQ-04, PRQ-05 | over HTTP was open |
| API-03 | AC-011, REQ-012, D-3, D-4 | migration on data a released build wrote; Pair again | Temporary Probe | `probes/api-e2e/released-upgrade/*` | needs a released image and Docker volumes |
| API-04 | AC-004, CR-002, decision (b) | one click with Docker nodes | Temporary Probe | `probes/api-e2e/docker-one-click-probe.mjs` | needs containers |
| API-05 | gate, credentials | every e2e route | Existing Test | `env -i … pnpm test:e2e` | TESTING: gate change |
| API-06 | owner inputs | server unit + integration | Existing Test | `pnpm -C autobyteus-server-ts test:unit`; `test:integration:prepare`, `test:integration` | TESTING: required inputs of owners changed after IMP-03 |
| API-07 | GraphQL ops | demo coverage + iOS demo build | Existing Test | `mobileBuildChecks.spec.ts`; `prepare-demo-web.sh --build`; `build:mobile-web` | TESTING |
| API-08 | build input | fresh-start build | Journey | fresh clone at b59628b4bf, frozen install, `build:electron:mac -- --arm64`, verify steps | `generated/graphql.ts` changed |

- Test progress log: `Yes` (`api-e2e-test-progress.md`).

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-01, API-02 | `autobyteus-server-ts/tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts` | Pair by request and the key rule were proven only in-process; three real servers over HTTP keep them proven |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| The Manage Nodes UI and its probes | T-6 (FU-661-02) | none for T-3's server behavior | No | T-6 |
| Private-network caller, machine check producer | T-4 | verifier's machine rule has no producer yet | No | T-4 |
| Sandbox pairing under node keys against Docker sandboxes | the host's sandbox spine needs the sandbox feature end to end; unit `sandbox-pairing.test.ts` covers it | Low | No | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage: `Yes` (one new file). Reroute: `No`.
