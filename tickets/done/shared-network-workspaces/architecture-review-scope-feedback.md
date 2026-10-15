# User Scope Feedback — Working V1 First

Date: 2026-10-13. Recipient/owner of requirements and architecture recovery: Solution Designer.
Task: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
Related completed review: ARCH-REV-001, SR-017, D-001.

## Direct user instruction

After asking why ordinary path-based media/artifact previews would not work, the user was told that healthy mounted paths should work normally and that D-001 concerns unavailable-storage blocking, identified by source inspection rather than a failed live preview test. The user then said:

> From my opinion, in the first version, we don't care about those edge cases. The first, normally when you are working in edge cases, you continue to, you know, in the beginning, you'll want to, you know, have a correct solution, but you don't consider that many edge cases. You consider the ideal cases, you know, only when it's working, then when we experience problems, then we start to, you know, we start to think, yeah, continue to improve.

## Reviewer's disposition and requested solution revision

- Treat this as working-first v1 scope feedback, not another demand to implement D-001. Outage-specific preview isolation is deferred by this direct direction; do not require it as a v1 blocker.
- D-001's current-code facts are unchanged. Healthy mounted paths should work; no live preview failure was demonstrated. The old requirement for bounded outage diagnosis/unrelated-local responsiveness drove the blocker, not basic path incompatibility.
- Solution Designer should reconcile the approved requirements/ACs and architecture with this direction, particularly REQ007/008, AC006/007 and related SCN004 promises. Reconsider the broader proposed per-action outage machinery consistently, rather than removing only the REST extension while leaving unsupported guarantees elsewhere. The reviewer does not edit upstream authorities or prescribe a replacement product policy.
- Prioritize implementing and proving normal create/connect, actual same backing files, ordinary native-runtime read/write and normal preview use. Keep normal-operation correctness, preservation of existing source/node/private data and explicit operation consent. This feedback does not authorize live mutations, root/public access shortcuts, removal of all existing safeguards, or concealment of limitations.
- Known normal-operation defects such as cross-node configured-skill cleanup are not automatically deferred merely because outage hardening is deferred. Evaluate against actual supported normal use; do not preserve machinery just because a previous design included it.
- Preserve the selected hosting/client matrix, one-command service and guide, and the existing downstream physical proof/user-verification gates unless the user separately changes them. No need to reopen the settled hosting/security/validation questionnaire.
- Record the narrow deferred limitation/follow-up for the task owner: unavailable hard-mounted storage may stall previews/server work; no bounded-outage guarantee is advertised for the reduced v1 unless actually implemented and validated.

This is upstream scope feedback, **not a completed new architecture review or a Pass**. ARCH-REV-001 remains the recorded result against the prior SR017 basis. After Solution Designer aligns the revised package, re-review the actual revised requirements/design, not the superseded outage gate.
