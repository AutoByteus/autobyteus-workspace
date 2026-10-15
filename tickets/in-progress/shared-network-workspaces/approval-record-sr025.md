# Requirements Approval — SR025 / one VM, two Docker nodes

Package shared-network-workspaces; Task project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
2026-10-15. **User explicitly accepted narrowed topology; Solution Designer records the
settled decision and approves its precise DEC017 alignment within that direction.**

## Provenance and exact approval

API/E2E carried the user's own words and its preceding explanation in:
`evidence/api-e2e/api-rev-007/scope-alignment-handoff.md`, commit
`a6c274d96f75008ac560715795c9bac90e2a3cfd`. This is not approval inferred from an agent's opinion.

User proposed:
> I think you don't have to test the two virtual machines, right? Only one virtual machine maybe is enough. But you need to test the one virtual machine with two Docker nodes. What do you think?

API explained that one VM/two nodes can prove ordinary shared-file behavior but not
Mac↔Linux/separate-OS-kernel interoperability; recommended doing those tests and deferring
cross-OS qualification, explicitly not calling it Passed. Full exact explanation is retained
in the linked handoff. User then accepted:
> Yeah, sorry, then please make your test cases, yeah, update your test cases that you wanna test and then make sure we do full testing. I think the test ledger, right? That's a test ledger or test like, yeah, thanks.

## Recorded decision and limits

DEC017 / ApprovedSR025 supersedes SR024 topology in REQ012/016, staged AC001–020 and
IV-F01–F04/IV-D04; no functional guarantee or product-support deletion. One owned Linux VM,
two actual launcher-managed Docker application nodes, native Linux and Docker-Linux storage
sequentially. Linux is the simplest existing owned execution environment, selected within
the accepted direction. All L01–L26 planned behaviors remain required; the test owner may
refine fixtures/assertions without new product behavior or silently dropping obligations.
Shared-kernel proof is explicitly not independent NFS-client/kernel/host or Mac proof.
Public external-computer join and independent-host allowlist qualification are deferred;
parser/refusal and actual local permission/privacy/guard regressions remain required.

No further approval question: the user already accepted the tradeoff. API alone owns tests,
case status, confidence and verdict; this record does not verify tests. No new architecture,
source review, implementation or release is requested. Functional technical SR023 remains.
Source CRR013 Pass100/API006 historical Blocked67.86/API007 preparation-only stay distinct.
Actual new defects retain normal failure-origin routing. No host/network/credential/budget
permission; no TaskDone, delivery, release or user-test claim.

## User informed in this Solution Designer conversation

> I’ve reviewed the recorded approval. I’m aligning acceptance to one Linux VM with two Docker nodes, retaining all 26 planned test cases. Mac↔Linux and separate-kernel qualification will remain explicitly deferred—not passed—and execution will return directly to API/E2E.

The user then objected to tester→Designer verification overhead. Designer clarified:
> That decision is settled. I’ll correct the outdated wording and return it directly. API/E2E owns execution and the test verdict; no further approval or architecture review is needed.

Current canonical requirements contain DEC017; design changes only its acceptance references.
No separate behavior-defining supplement or Product design artifact. Prior approvals/review
results remain at their exact historical scope, not retroactively expanded.
