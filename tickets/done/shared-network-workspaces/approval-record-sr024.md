# Requirements Approval — SR024 / VM cross-node filesystem increment

Package `shared-network-workspaces`, Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`,
2026-10-15. **Approved by Solution Designer within the user's explicit direct clarification.**
This is an acceptance/sequencing revision; no technical mechanism or test result changes.

## Authority and chronology

1. Code Reviewer relayed the user's wish to close this increment and test their real setup
later. The initial designer draft retained remaining feasible checks. Its unpublished
approval/disposition drafts are retained as `evidence/acceptance-revision/sr024/superseded-initial-*`;
they are NOT the final baseline or a separate completed SR round.
2. The user directly stated they regarded the VM testing as sufficient and suggested sending
to Delivery or telling Code Reviewer the increment was accepted. The designer proposed
remaining test-code review and delivery, without another testing round.
3. **The latest direct user clarification qualifies that proposal:**

> Yeah, but all those test cases should be tested, right? I mean, even though we do not test the agent inside those nodes, but all those file system writing should be tested, right? I mean, because we have virtual machine, so the testing scope, even though we cannot verify, even though API E2E engineer cannot run on my, like, commands, which need permission, but all those test cases, even though it doesn't have agents, but all those shared file system test cases can be tested in different nodes, right? That's needed. That's the scope. At least that asks for the testing scope for this.

Latest message is the current scope authority. It requires actual cross-node filesystem
case coverage, not immediate ticket closure on existing Mac VM evidence alone. Physical
machines/personal commands and authenticated agents are not current increment prerequisites.
No unseen message, broad live-operation permission or full product-test Pass is inferred.

## Decision and readiness

DEC016 approves required IV-F01–F06 and deferred IV-D01–D03/release-only IV-R01 in canonical
requirements-doc.md. Preserve all normal functional/safety targets and only-Mac-Docker-
STORAGE deferral; accept different real OS VM nodes for this increment's topology, with
non-agent processes as filesystem actors. Complete/reconcile all shared-filesystem cases
before closeout, including both-OS managed clients, supported storage modes, reciprocal
exact-byte/consistency/permission/concurrency/restart/preservation contracts. Current
CRR013 source Pass and API006 Mac fix closure are evidence, not whole-matrix proof.

No new product mechanism or UI direction is chosen. Missing agent/physical permissions
cannot block independent feasible VM filesystem tests. API owns the revised execution
verdict; Code Reviewer owns subsequent proportional test-code review; Delivery owns
integration/docs/finalization/cleanup. No TaskDone, release, test-score inflation or review
bypass. No renewed question needed: latest explicit user statement settles this boundary.
Functional SR018 and technical SR023 authorities otherwise remain. Cumulative Large/High.

## User informed

Exact designer informing message after the latest clarification:

> Yes—that’s the required scope. Separate VM nodes can test shared-file behavior without running agents: cross-node reads/writes, exact contents, rename/delete, permissions, concurrent access, and restart/reconnect preservation.
>
> So I won’t treat “the Mac VM was tested” as proof that the whole filesystem matrix is complete. I’ll ask API/E2E to identify which cases already have evidence and finish the missing cross-node filesystem cases before delivery. Authenticated-agent runs and testing on your personal machines can wait.

Approval changes REQ012/016, AC011 and staged proof mapping/DEC014 sequencing; stable
other functional IDs/targets unchanged. Design aligns acceptance/next-work only; reviewed
SR023 production architecture remains. Evidence ownership and references are in the
acceptance-disposition supplement and cumulative package index. No separate behavior-
defining supplement or external Product artifact.
