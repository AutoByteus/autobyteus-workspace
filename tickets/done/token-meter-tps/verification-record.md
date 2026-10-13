# Delivery Verification — token-meter-tps / DR-001

**Verified from evidence — Sufficient**, 2026-10-13. No user check needed:
critical intended behavior is settled by approved R1/D1, and actual changed-build
UI evidence is available. No user-only account/node or remaining validation gap.
API-REV-001's 95% confidence (each of seven categories 95%, target >=95% and
no category <90%) is supported by the receipts, not accepted on summary alone.

## Direct evidence inspected
All paths below are relative to this ticket; historical absolute worktree paths
inside upstream records describe their original execution, not current custody.

| Critical AC | Direct basis examined and judgement |
| --- | --- |
| AC-001 | `evidence/api-001/browser-2/result.json` and durable probe assertions prove Collecting→20→30; `transport-3/result.json` raw WS shows one turn, outputs 999/200/150 at 16:22:59.023, 16:23:00.226, 16:23:01.126 UTC. First 999 excluded; actual readings 200/1.203 and 150/0.900. Correct report-pair arithmetic, no reasoning addition. |
| AC-002 | Final web and attribution logs plus actual store/context tests cover Team two-effect dedupe, all eight target projections, Org/collaboration context admission and same-address copies; browser exact-vs-aggregate assertion and real desktop selection prove rendered isolation. Not every topology has a real-server journey. |
| AC-003 | Browser receipt/assertions freeze value/time offline; desktop ready screenshot, checks and wire timestamps retain Estimated/Last reported identity and time after idle. Keyboard disclosure explains waits/cadence. |
| AC-004 | 44 estimator cases within 155 web tests cover invalid/missing/count/time/continuity/recovery. Browser directly checks true zero and invalid interval with no number; adapter/fold logs prove normalized source semantics. |
| AC-005 | Store/adapters and focused server 174 tests prove revision/non-call/tuple handling. Actual desktop selection/reload receipt and `reloaded-unavailable.png` establish session-local state and no historical synthesis. |
| AC-006 | Viewed `browser-2/ready-zh-narrow.png` and `desktop-runs/attempt-1/ready-desktop.png`; browser geometry 286 client / 286 scroll at 320px, readable wrapped model/help, keyboard focus; actual Token tab is visible in packaged app. Collecting independent of totals proved by DOM assertion. |
| AC-007 | Existing web regression and three guards pass. `transport-3/persisted-summary.json` has 1349 output / 3 model calls; no server product, schema or accounting changes. Source diff preserves existing accounting and no new provider requests. |
| AC-008 | Full runtime matrix in API/E2E report, current-source/asar provenance, commands, cleanup and explicit source-versus-installed distinction. This delivery record supplies integration/finalization/release/cleanup gates. |

Opened API/E2E coverage investigation, execution report, ledger and revision record;
requirements, investigation, design, solution/implementation handoffs and histories
supply the cumulative approved basis. Independent review artifacts **N/A** on
unchanged **Medium / Low, Direct Low-Risk** route.

## Integrated-state checks
`git fetch origin personal`; `git merge --no-edit origin/personal` integrated
`0c37f58d88220be3683a15da6e0956d6ab13c4db` at
`a81288041c2c5b9504d879c94a41d3de19338085`. Only unrelated completed-ticket docs
changed; no effective product difference. Ran from the ticket worktree:

```sh
corepack pnpm -C autobyteus-web test:nuxt stores/__tests__/tokenUsageThroughput.spec.ts stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__ composables/__tests__/useTokenUsageWorkspaceScope.spec.ts stores/__tests__/activeContextStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/teamExecution/__tests__/teamExecutionViewState.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/agentOrgInspection.spec.ts --run --maxWorkers=2
corepack pnpm -C autobyteus-web guard:web-boundary
corepack pnpm -C autobyteus-web guard:localization-boundary
corepack pnpm -C autobyteus-web audit:localization-literals
sha256sum -c tickets/in-progress/token-meter-tps/evidence/api-001/final-provenance.sha256
```

All exit 0: **10 files / 155 tests**, three guards, source/asar hash equality.
`evidence/delivery/web-regression.log`, `guards.log`, `provenance.log` and
`evidence-judgement.json` retain checks. Raw receipt arithmetic and every listed
source hash were independently recomputed. Docs-only base integration does not
warrant rebuilding/rerunning unchanged transport or Electron journeys.

## Scope of proof / residual limitations
Actual Linux ARM64 Electron **42.4.1**, worktree app **1.5.3-beta.4**, default
enterprise build, non-root UID61031, sandbox intact, own Xvfb; actual UI selection,
Token, composer Send, embedded server, scripted AGY process/tool, selection and
reload passed with zero browser errors. This is not the user's installed app.
AGY transport is scripted, **not Gemini inference**. Native/Codex/Claude/Grok
adapter/fold semantics ran, not live sessions. No paid inference, macOS/Windows
package run, blanket full-server suite, or semantic Vue typecheck pass (upstream
vue-tsc absent). Provider telemetry/cadence and single-report limitation remain
conditional, explicitly disclosed, not missing in-scope proof. No material
unresolved validation gap or requirement ambiguity warrants reroute.

Upstream cleanup receipts show browser/servers/desktop stopped, ports released,
owned data/homes removed; no user app, data or CLI config modified. Repository
cleanup and final push receipts are in the delivery report. Verification was
completed before ticket archival, branch publication or target finalization.

## Pre-finalization target advance / re-verification
After ticket commit/push `90624f77d706b48616b2458884113ccbc2eb6400`, the required
fetch found origin/personal had advanced to
`4c77cec80d965e0f96658cb2d2881fa6d6a39d96` (sidebar red Stop styling).
The equality guard stopped finalization **before** target branch creation/merge.
Delivery edits were already committed and protected. Merged the new base
conflict-free at `5b7c1931cc98fab44776af239e5c18f146418e94` on the ticket branch.
Shared execution-architecture edits are in disjoint sections; both retained.
No TPS source, transport, contract, model/call semantics or API changed.

Re-ran the entire 10-file TPS suite plus the three inherited sidebar suites:
**13 files / 207 tests pass**, plus all three web/localization guards. Exact
command is retained at the head of `evidence/delivery/web-reintegration.log`;
added paths are `components/workspace/history/__tests__/DelegatedStopButton.spec.ts`,
`components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`,
`composables/__tests__/useWorkspaceHistoryMutations.spec.ts`. All listed TPS
source hashes remain equal to API/E2E evidence. Re-verification **Sufficient**,
no user check; prior packaged evidence proves unchanged TPS source, not the
newly inherited sidebar styling. No material handoff-behavior change. The
latest integrated base for documentation/finalization is now `4c77cec80`.
