# Requirements Approval — SR018 / Working V1 First

Package shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63;2026-10-13. Current requirements-doc.md SR018 is **Approved by Solution Designer within explicit direct-user direction**, user informed below. This is renewed scope approval after requirements recovery, not an evidence-only change. Prior SR017 hosting/access/physical-sequencing choices remain; no repeated questionnaire.

Authority: reviewer-forwarded **user's own words**, preserved read-only at architecture-review-scope-feedback.md (commit3d95901924), after the user was told healthy previews should work and D-001 concerns a source-inspected outage rather than an observed healthy preview failure:

> From my opinion, in the first version, we don't care about those edge cases. The first, normally when you are working in edge cases, you continue to, you know, in the beginning, you'll want to, you know, have a correct solution, but you don't consider that many edge cases. You consider the ideal cases, you know, only when it's working, then when we experience problems, then we start to, you know, we start to think, yeah, continue to improve.

Decision DEC015: remove the advanced outage-isolation/bounded responsiveness obligation consistently from v1, including D-001 REST streaming expansion and earlier broad file/terminal/runtime per-action child machinery. Preserve normal connected operation, one-command service, native tools/projects/previews, private skill cleanup correctness, same backing identity, no intentional local copy/fallback, source/node/private-data preservation and explicit privileged/disruption consent. Unknown storage/write state is not success. Hard-NFS outages may stall previews/file tools/other server work; no bounded cancellation/recovery guarantee is advertised. Normal repeat/restart when storage is healthy still required.

Changed REQ007/008/012/016, AC006/007, SCN004, QR002 and dependent scope/validation language. REQ011/AC010 explicitly preserve existing healthy media/HTML/artifact preview use; AC016/019, BEH004/006, UC004/006, SCN006/010 and traceability are aligned without adding a preview feature or retaining an old outage guarantee. No hosting/client/security or final physical healthy topology/merge/user-verification deferral. Existing empirical failure records and ARCH-REV-001 Fail against SR017 remain true, not a new Pass. No live-action/deletion/release authorization.

Exact informing message in Solution Designer conversation:

> I’m aligning v1 with your working-first direction: keep the one-command setup, normal file sharing and previews, plus safeguards for existing data. Advanced outage isolation is deferred; if storage disconnects, file operations or previews may stall. The cross-node skill fix remains because it affects normal use.

No separate behavior-defining Product supplement. The scope-feedback file is exact user-direction evidence, and this record approves the canonical revised requirements. Revised design still requires configured independent re-review before implementation; no source changes or live tests are asserted by approval.
