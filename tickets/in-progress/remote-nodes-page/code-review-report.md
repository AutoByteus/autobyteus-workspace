# Code Review Report — remote-nodes-page (autobyteus-267)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002; REQ-504, AC-505)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as referenced by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003; DS-002, the store's triggers and tokens)
- Supplemental Task Artifacts Reviewed As Context: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-nodes-page/ui-ux-spec.md` (L285 "Re-asking on every open"; TR-009)
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: N/A (direct route)
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1. This is the first code-review result for the ticket (direct route).
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E API-REV-001 Fail, finding F-001
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: RNP-06 (AC-505, "Returning to the tab asks again"; switch on → "All asked")
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:remote-nodes-page` (Chrome through playwright-core, nine test-owned servers, `nuxt dev`), runs 3 and 4
- Failure Evidence Paths: `evidence/api-e2e/F-001-in-flight-peer-not-asked-again.log`, `evidence/api-e2e/API-02-run4/remote-nodes-page-probe.json`, `evidence/api-e2e/API-02-diagnostic-dedup-off/`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: none. The failure is local to one query call in one store and doesn't call the risk classification into question.

## Review Scope

- Changed implementation and behavior reviewed: the asks in `remoteCollaborationOffersStore` (`askAll`, `ask`, `clear`, the tokens) and the Apollo call they make.
- Files / areas reviewed: `autobyteus-web/stores/remoteCollaborationOffersStore.ts`, `stores/__tests__/remoteCollaborationOffersStore.spec.ts`, design spec DS-002 (L16, L96–L98), the F-001 log and the diagnostic run.
- Explicit exclusions: no full source audit or scorecard (failure-origin round). The server side (API-01, 29/29) is not affected.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - REQ-504: a peer is asked when the tab opens, each time it is opened, and when the switch is turned on.
  - AC-505: returning to the tab asks again.
  - The UI/UX spec says a peer that takes 20 s shows Checking… again.
- Design-spec behavior map: DS-002 says `clear()` runs when the tab is left and returning asks again. Each ask takes a token, and an answer with a token that is no longer current is ignored. The design's premise at L16 is "Each query is its own HTTP request".
- Behavior-basis status: `Confirmed`. The requirement and design are clear; the implementation doesn't deliver them in one case.
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| REQ-504 / AC-505 (re-ask on return and switch-on) | Confirmed (not met for a peer whose earlier ask is still in flight) | `askAll` → `clear()` → `ask(nodeId)` → `getApolloClient().query({query: GetPeerNodeOffer, variables: {nodeId}, fetchPolicy: 'network-only'})`. `network-only` skips the cache but not Apollo's in-flight deduplication, which is on by default and not changed in the web's Apollo setup. The second ask joins the first request, so no request goes to the server. Both promises resolve with the first answer, and the newer token applies that answer, so the token check can't catch it. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-F001 | REQ-504, AC-505, UI/UX L285, TR-009 | User | Node owner | See each peer's current state after leaving and returning to the tab, or after turning the switch off and on (for example after fixing a peer) | Remote Collaboration tab: open/leave, switch | Explicit Edge | the switch turns on (or the tab opens), a slow peer is asked, the owner leaves and returns (or turns the switch off and on) within that peer's ask, and `askAll` asks it again | A new request for every peer; the slow peer shows Checking… again and settles with an answer to the new ask | The spec names this case ("A peer that takes 20 s therefore shows Checking… again"); RNP-06 runs 3 and 4 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 (F-001) | An ask of a peer whose identical query is still in flight sends no request; Apollo deduplicates it | SCN-F001 | The owner returns to the tab, or turns the switch off and on, while a slow peer's ask is open | No new request. The peer settles with the earlier request's answer, which can be stale if the peer changed in between. REQ-504 / AC-505 are not met | `thetaAsked {onReturn: 0, onSwitchOnAgain: 0}`; with `context: {queryDeduplication: false}`, `{1, 1}` and all 9 cases pass, with theta settling 20.2 s after the new ask, so the old answer is ignored by its token as designed | Promote | This ticket | One query option and a spec, both in the owning store |
| C-2 | Turn deduplication off for the whole web Apollo client | — | — | It would change the behavior of every other query | — | Reject | — | Out of proportion; only this query needs a fresh request per ask |
| C-3 | Cancel the earlier request (AbortController) instead | SCN-F001 | — | Not required: the token already ignores the old answer, and the server still finishes its own peer request | — | Reject | — | The design's tokens are the stale-answer mechanism; cancelling isn't needed |

## Findings

| Finding ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| F-001 (API/E2E's ID kept) | Low | `autobyteus-web/stores/remoteCollaborationOffersStore.ts` `ask` (L70–74) | See C-1 | 1. Add `context: { queryDeduplication: false }` to the `GetPeerNodeOffer` query, with a one-line comment saying why: each ask must send its own request (REQ-504), and the token ignores the earlier answer. 2. Add a store spec that fails without the option. The current spec mocks `getApolloClient().query`, so it can't see Apollo's deduplication. Prefer a real `ApolloClient` over a counting test link: two asks of one peer while the first is pending send two operations, and the first answer is ignored. At minimum, assert that the option is passed. 3. Correct the design premise in the implementation handoff (design L16, "each query is its own HTTP request"): it holds for different peers, but an identical in-flight query is deduplicated unless this option is set. | Local Fix / `implementation_engineer` |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Local Fix` (implementation-owned). It is a bounded correction in one store call and its spec. The requirement and design intent are correct and need no upstream change. The design's premise sentence was imprecise, but the fix doesn't change the design.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (failure-origin: an implementation defect)

## Residual Risks

- After the fix: rerun the browser probe (`pnpm -C autobyteus-web test:e2e:remote-nodes-page`, after the server build) and the store specs. API-01 stays valid if only the web store changes.
- AC-506 is the user's desktop ↔ Docker check.

## Latest Authoritative Result

- Review Decision: `Fail`. The failure origin is confirmed as an implementation defect.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-F001 is a supported explicit edge named in the spec)
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: implementation. `ask` uses an Apollo query that deduplicates an identical in-flight request, so a re-ask sends nothing and the newer token applies the earlier answer.
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: API/E2E's diagnosis and proposed fix are confirmed.
