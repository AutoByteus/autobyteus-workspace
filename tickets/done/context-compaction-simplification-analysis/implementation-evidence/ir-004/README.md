> Historical IR004 evidence. **SR031 supersedes the production-blocker interpretation only; the failed diagnostic is unchanged.** Current implementation disposition: ../../implementation-handoff.md; continuation evidence ../ir-005/README.md.

# IR004 local implementation evidence — Design Impact, not ready

Basis SR028/SR030 + ARCH-REV-003. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; HEAD
5cb7b049ae3158108bff2cb70ed80e89540586d9. Large/High unchanged.
No commit/staging/push/merge/release, live-provider call, credential/history access,
remote refresh, external-WIP integration, or acceptance campaign this round.

## Result / decisive evidence

`design-impact-request.md`: **IR004-DI001**. Actual Team/Org commands through the
configured handle can replay the same B identity after a failed recovery and grant
another operation. root-command-final.log/.exit/result.json: **2 PASS / 2 FAIL**.
This defeats approved fresh-user-only recovery; no speculative duplicate registry
was added. Need Solution Designer to specify that missing shared admission boundary.

Exact rerun from worktree:
```
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/root-recovery-command.test.ts --no-watch
```
Expected current exit1; two failure assertions expect2calls but observe3. Synthetic
provider only. Root package hosting is a test facade, not full real-root acceptance.

## Local checks retained (overlapping, not an aggregate coverage total)

| Evidence | Local result | Scope / limitation |
|---|---|---|
| strategy-tests.log |2files/33PASS|strategy/parser/config, synthetic|
| sdk-transport-initial.log |1/37PASS|installed SDK fake transport, all inspected families; no remote-internal-work claim|
| core-recovery-positions.log |1/6PASS|native held/consumed-position core paths, synthetic|
| core-focused-current.log |47files393PASS/1FAIL|status mock adaptation later corrected, not rerun; not a green final sweep|
| core-build-interrupt-fix.log |PASS|core production build after interruption classification fix|
| server-native-recovery-verified.log |1/7PASS|real core/native backend/AgentRun/coordinator, synthetic; FIFO, early ACK, repeated failures, proven/uncertain delivery, stop|
| server-stream-verified.log |3/26PASS|Team/Org stream fixture current shape plus API boundary no-provider check|
| server-build-current.log |PASS/empty log|`pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`, exit0|
| web-local-initial.log |4/30PASS|real components/local submission and new projection tests; not rendered inspection|
| web-stream-second.log |28/266PASS|stream/team/org/store focused current-contract regressions|
| contracts-check.log |presentation3PASS;team3PASS;collaboration1PASS/7FAIL|collaboration fixtures lack new fields and also contain obsolete keys; failures unresolved, no baseline waiver|
| root-command-final.log |2PASS/2FAIL|the current design-impact reproducer|

Recent exact commands:
```
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-compaction-recovery.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/agent-org-stream-handler.test.ts tests/unit/secret-management/live-e2e-compaction-boundary.test.ts --no-watch
pnpm -C autobyteus-web test:nuxt services/agentStreaming/__tests__ services/agentStreaming/handlers/__tests__ services/teamExecution/__tests__ services/agentOrgExecution/__tests__ stores/__tests__/agentRunStore.spec.ts --run
pnpm -C autobyteus-agent-presentation-contracts test
pnpm -C autobyteus-team-stream-contracts test
pnpm -C autobyteus-collaboration-stream-contracts test
```
Earlier local iterations are retained by name, not erased or promoted to passes.
The broader core558test WIP and server scope logs were intermediate adaptation
runs; no full package or repository green result is asserted.

## Typecheck / rendered limitation

Native nuxi typecheck failed in npx-cached vue-tsc / TS6 resolution (initial log).
Attempting that cached vue-tsc with repo TypeScript via explicit run(tscPath) hit
Node4GB heap OOM (web-typecheck-local-ts.log), not a successful typecheck. No package
or lockfile was changed. Wrong server tsconfig.json attempt included test files
outside rootDir; production tsconfig.build.json later passed. Web full typecheck
and integrated build remain incomplete. `rendered-result-check.md` records the
concrete unavailable CUA surface and cleanup; no visual verification claimed.

## State preservation

entry-audit.json pins747 pre-existing pending files. Before this result's two
canonical artifact edits,744were unchanged; only3API-owned mechanical caller
adaptations differed. API hash/delta accounting in api-owner-comparison.json and
api-owned-adaptations/README.md. API quality preimage exact bytes unavailable,
so do not claim a hash-verified full diff for that one adaptation. Six other API
paths unchanged. active v5 remains unchanged. source-inventory.json/source-wip.patch
and new-source-snapshot/ preserve partial implementation, not review-ready code.
source-size-check.json: no changed source above500nonempty lines; >220delta and
final dead-code/shared-capability review still require completion. No owned
preview process remains, and no temporary preview page remains in product code.

## Next after design recovery

Specify duplicate identity authority and ACK/lifecycle semantics for Team/Org
without bypassing readiness or adding a duplicate queue/durable outbox; implement
it and rerun both negative cases. Complete remaining target cases (root fence,
stale/cancel/other-run controls, grant-before-A-completion, hook counts, current
snapshot reconciliation), clean unused fields and tighten backend capability,
finish contract fixtures and final build/typecheck/core/snapshot checks. Complete
rendered browser feedback when control surface is available. Development commit
and ordinary Large/High source-review handoff follow only when ready.

Carry forward: API005 interrupted; last complete API004Fail90.7 unrescored;
F005 accepted known/nonblocking/notfixed, QwenSTOPPED; F004causeunknown;
F006correctedCRR007. SR0221fidelityFail/3scopedusable/exhausted. v6unapproved;
no provider/default/support change. Nine API paths' later successful-test review,
inherited/fullsuite/integrated browser/desktop/retry/resume/crash/Delivery/user
verification gates remain. Prior sourcePass9.40 is not a score for IR004.
