# Code Review — CRR-018: preserve the web/core boundary

## Latest authoritative result
**Fail — Local Fix, implementation-owned architectural-boundary violation / build integration. API010-F001 remains OPEN.**

2026-10-01 / Code Reviewer / focused failure-origin follow-up to **CRR017**, prompted by the user's explicit boundary clarification. **Large / High unchanged**. This is not a new source-validation Pass, successful-test review or Delivery result.

**The web must not directly depend on autobyteus-ts core. The existing guard is intentional architectural enforcement and must remain intact.** Correct the implementation/test dependency architecture; do not remove, weaken, bypass or exempt this case from the guard. CRR017's option of a guard-policy correction was too permissive and is **withdrawn**.

## Authority, supported basis and bounded scope
Requirements remain **Approved SR033**, design **Ready SR038**, **ARCH-REV006**, implementation basis **IR011**; API-REV010 **Fail75.0%** triggered CRR017. REQ012 / AC014,017 / SCN005 require valid corrected-native history and truthful same-live-run reconstruction; the new user clarification supplies an explicit governing **engineering boundary contract**, not a new product behavior or migration decision.

Current user statements identify direct core imports into web as an architectural violation and explicitly prohibit removing the pre-existing guard. That contract agrees with the documented isolated-app build and existing mandatory guard, independently of any failing test. The actor/event is an engineer building and validating the unreleased product via root TESTING.md's supported worktree build surface.

Existing CRR017 forward-path evidence remains applicable: root isolated-app start --build -> macOS build script -> first mandatory web-boundary guard -> recursive web services/test scan -> four direct core-dist imports in the IR011 native-history test -> guard exit1 -> BUILD_FAILED exit3 before package or launch. The guard is correctly exposing a boundary violation; it is not a nuisance to suppress.

**CG044 / API010-F001: Promote, supported normal operational / architecture contract.** The proportionate remedy is dependency-boundary restoration. **Reject guard weakening or dependency laundering** as a remedy: neither restores the user-required architecture.

This round changes only the required response and its authoritative wording. It does not re-audit ongoing implementation work, rerun the build/tests, or claim working-tree bytes stayed frozen after CRR017. Exact prior test/guard/manifest hashes, source anchors, independent guard exit1/same4 diagnostics, scope and earlier review-gap attribution remain in:
- code-review-evidence/crr-017/source-excerpts.txt and source-provenance.json
- code-review-evidence/crr-017/guard-reproduction-command.json, guard-reproduction.log/.exit
- api-e2e-evidence/api-rev-010/build-command.json and isolated-start.json/.stderr/.exit
- code-review-evidence/crr-018/entry-code-review-report.md (the completed CRR017 report)

## Required correction — no guard change
1. Remove the forbidden core dependency from the web-owned test/setup. **No production dependency, direct relative import, alias, dynamic-import trick, server re-export, or helper wrapper merely hiding the same dependency in web.**
2. Keep the guard intact. No deletion, weakened scan, new allowlist/test exemption or bypass to make this case green.
3. Preserve the meaningful actual-native Agent and hosted-Team regression: freshly produced serialized identity, normal saved projection/hydration, attachments/names/timestamp, Held A / Queued B, repeated reconstruction without send/re-ingestion, clearing, and genuinely new C authorization / once-only A/B/C.
4. Locate cross-layer/native integration coverage at a conformant test owner/harness; web-local tests should exercise the supported contract boundary without instantiating/importing core. The owner chooses repository-conformant placement/setup, not a superficial re-export. No fake keys inserted into old captures and no assertion deletion.
5. Show the corrected dependency path, focused regression results and unchanged mandatory guard passing. Then normal **independent source re-review -> full documented worktree build and integrated API/E2E -> successful durable-test review -> Delivery**. A guard Pass alone is not full-build or runtime acceptance.

This remains an **implementation-owned Local Fix** to restore the established architecture, not authorization to redesign the architecture or relax its boundary. Any genuinely necessary design change must return through Solution Designer; none is approved here.

## Prior results, ownership and retained limits
- **API010-F001 OPEN**, implementation-owned test/build defect. CRR016's missed source-detectable readiness check remains recorded; its9.50 is historical and corrected, not current Pass. No new numeric source scorecard or API confidence rescore.
- **API009-F001 integrated closure OPEN.** Native identity source evidence is not invalidated by this pre-launch failure, but actual corrected Agent/Team repeated new-renderer/SAME backend/native, attachment, recovery/remaining negatives and product Stop are still required. No runtime defect/fix inferred here.
- API15 and the three API009 native files still need eventual successful-test review; CRR013 is pre-integration only. No API-owned test/source edits by reviewer.
- **NO MIGRATION/BACKFILL**, future-native correctness only; no cold-native or restart-durable queue requirement. F005 accepted-known/nonfixed/nonPass/Qwen STOP, F004 unknown, SR022 exhausted/v6 unapproved, CG033 unproved/not pump Pass,14 wider+7 baseline, OOM/web7181 non-green remain unwaived. API006 withdrawn/API007 unsupported claims stay excluded.
- Lost original IR009 logs remain unavailable; present copies are disclosed CRR014 replacements, not originals. No reconstruction.
- No source/test/guard/build/Git changes or provider/app execution in this follow-up. Existing WIP, backups and in-progress uncommitted merge are not touched. No new global preservation audit is claimed during downstream work.

## Artifacts and routing
CRR017 entry report/record preserved before this correction; CRR001 baseline and all revision history retained. Complete cumulative failure package remains available through the unchanged API010 archive/manifests and CRR017 reference index, plus direct current canonical overrides and CRR018 evidence. Archive inclusion is not a reread claim.

Recommended sole recipient: **/implementation_engineer**, same existing execution, to apply this constraint to the ongoing API010-F001 fix. Fresh rule selection and confirmed ordinary-message receipt follow. No duplicate SD/API/Delivery outcome notification.

Fresh rules select solely /implementation_engineer under the implementation-defect failure-origin condition. Same existing execution receives the explicit user constraint; no new design/requirement change, API-owned defect or Delivery route applies.

Confirmed accepted=true / DELIVERED solely to existing Implementation Engineer implementation_engineer_d565b3adf8074d59878dc089de6d3df1. Receipt: code-review-evidence/crr-018/handoff-receipt.json. Explicit user boundary constraint delivered; no guard-policy relaxation allowed. Reviewer stops after this confirmed follow-up.
