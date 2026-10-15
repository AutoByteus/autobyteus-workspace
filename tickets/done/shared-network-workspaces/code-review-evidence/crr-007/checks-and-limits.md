# CRR007 — targeted source re-review of IR006 / CR004

2026-10-14. Personal independent review, no delegation or production/test fix.
Input0d244f40496b368cbe1613f75d6cd21bb444c58d, source
`eb7934072a1f98832b7b6330a1bc6a7f348fd93d`, prior receipt
`b1747fbdc3fe41f8aa8413f7e110a42ce9687704`. Approved018/Ready020/ARCH004
unchanged. Implementation Review / Targeted Delta Review / Large/High.

## Independent source/contract checks

Rechecked CR004 first against the complete current workflow and both-file diff.
Only workflow and new gate regression changed outside ticket artifacts. No data
shape, owner, package recipe, engine bytes, runtime or UI source changed.
`delta-audit.json` compares all1115 prior recorded paths to actual baseline Git
blobs and current SHA256; all equal.435 incoming references exist;11 retained
IR005 candidate files rehashed with exact size; IR001–005 history prefix preserved.
The carried CRR006 full109-source structural audit remains valid except current
workflow277->283 nonempty (8 insertions/2 deletions); cumulative+283 remains a
cohesive release pipeline, not a required split. New regression132 nonempty:
tests do not receive production source-size thresholds.

Independent operational basis remains approved SR020 distribution, REQ012/019,
AC011/019/020: after qualification/authorization an operator dispatches publish
with the retained candidate; this review does not authorize publication.
Four explicit cancellation-aware status gates now accept the deliberate rebuild
skip only at publication's engine-inputs bridge and require success at every
applicable preparation, candidate, image and binary/signing boundary. Existing
metadata qualification, retained-candidate exact identity, signing/notarization
and final publication checks remain. No always/unconditional-job workaround,
continue-on-error, package rebuild or changed release owner.

Primary GitHub documentation freshly read2026-10-14:
- [needs propagation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)
- [status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions)

The documented status-function override and cancellation semantics support the
source correction. The regression reads actual needs/if expressions and explicitly
limits its evaluator; it is not a GitHub hosted scheduler or shell/signing test.
The old skip defect remains historical evidence, not a current finding.

## Personal execution

`run-reviewer-checks.py` completed,9 subprocess commands all expected:
- actionlint1.7.11 version and syntax/expression/needs checks Pass; shellcheck and
  pyflakes explicitly disabled, not claimed checked.
- Current four-file Python suite17 enumerated /16 Pass /1 Go-parent-only skip.
  All five new gate tests pass. Go parent was NOT rerun this round; IR005 proof
  remains historical. No Go, VM, Docker or broad UI/API execution.
- Scratch-only old workflow control:5 methods/10 expected assertion failures.
  Scratch-only missing binary/signing-result predicate:5 methods/6 expected
  assertion failures. No parse errors or production mutations.
- Default actual release.py --check-publish refuses as required; no release.
- Both source hashes reproduced and changed-source whitespace passes.
Implementation's six mutation results were inspected, not all personally rerun.

## Identity, cleanup and remaining work

Default source aggregate:
`4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac`.
Current source plus same measured arm64 manifest:
`5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc`.
These are source aggregates, NOT new CLI hashes. Retained ignored IR005 CLI and
release.json are byte-identical but carry the old workflow aggregate. Reuse exact
engine packages/source/notices; generate current CLI/metadata and record identities
before API validation. No new engine build/qualification inferred.

Owned temp home/tmp/control files removed, all child processes completed;
`cleanup.json`. No VM/container/host-root/mount/app/node/provider/credential/hosted
workflow/upload/push/tag/release action. Five preexisting dist trees and ignored
candidate left untouched. Reviewer evidence only is staged.

**Source Pass does not close API-F002.** API002 Fail57.14%/broader Required remains.
Next: fresh public create/reconnect FIRST on the specified defaultY Ubuntu/ext4/
kernel7 reference with exact nonroot credentials, nonempty source preservation,
bytes/UUID/private modes/job checks and NO manual engine preinstall/probe bypass.
Then full approved matrix, independent physical systems, native-runtime/assets,
healthy mounted desktop previews, user verification and release gates remain.
Hosted Actions/signing, native amd64 engine and published installer not executed.
Only MacDocker STORAGE deferred; peer NAT environment limit remains separate.
D001/DEC015 deferred/not fixed; IMP-D001 private current-source links and independent
Update-Remove/AGY/local unchanged. FUP001 remains PM-owned, no duplicate follow-up.
