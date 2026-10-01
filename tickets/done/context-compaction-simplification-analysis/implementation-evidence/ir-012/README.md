# IR012 — Restore native integration test ownership

**Final candidate: workspace-owned harness outside web**, after CRR018 explicit user boundary clarification. No implementation handoff occurred before this correction. Trigger CRR017/018 / API010-F001; Approved SR033 / Ready SR038 / ARCH006; Large/High unchanged.

The guard is intact. Initial placement-only candidate inside web passed checks but was withdrawn on CRR018; it is archived in unhanded-web-placement-candidate/ and is NOT the selected implementation. Its focused-web/documented-native/guard-after logs remain historical attempts, not final architectural proof. The intermediate final-audit detected concurrent changes to the two reviewer canonicals; those are the CRR018 owner update, separately pinned in crr018-owner-update.json, not implementation edits.

## Selected dependency direction
Root pnpm test:native-input-history -> unchanged web boundary guard -> explicit workspace config/test in test-support/native-input-history -> independent native/server + web boundaries. Neither web source nor web-local tests/setup/config imports the harness or core through it. Native core imports are explicit in the workspace test, not aliases/re-exports/wrappers. The workspace config imports the existing web Nuxt test config to reuse tooling; dedupe covers tools/Pinia/contracts only, never core. Root script is additive test-only; web manifest/config/guard/build chain and lock unchanged.

## Final checks
- workspace-native-final.json/.log/.exit: root documented command, unchanged guard0 + actual native Agent and hosted-Team2 Pass.
- web-boundary-final.json/.log/.exit: web-local identity12 + guard3 (all rejection controls) + existing dependency boundary2 =17 Pass. Combined final19; prior attempts not added.
- workspace-native-attempt1: same external harness2 Pass before adding root command, overlap only.
- test-relocation-check.json: complete original native mock/test body byte-identical; only import depth and frontend alias retargeted. Both web active native test locations absent.
- production-preservation.json: all17 IR011 production hashes match. API15/packaged2/guard/manifest/index/refs/stash preservation in final-audit.json.
- source-delta.patch/source-inventory.json/source-before: exact changes; whitespace-check.json covers final paths.
- reference-index/check: cumulative archive + current direct canonicals including CRR018. Old native active path mapped to preserved preimage and current harness. Archive remains immutable.

No source behavior, model/provider, data transition or rendered UI change. No full desktop build, app launch, server global DB setup, full typing or independent API closure. Final guard Pass is a prerequisite only. Next source review -> full documented current build/integrated same-backend genuine renderer reload + Agent/Team attachments/retry/no-send/negatives/product Stop -> successful-test review -> Delivery.

F005 accepted-known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass; 14 wider + 7 baseline failures unwaived. Historical OOM/web tsc7078 and latest reported7181 remain non-green, not rerun. API006 withdrawn/API007 unsupported excluded. ARCH004/IR007/CRR011/API00895.0/CRR013 passes are pre-integration only; ARCH005 SR035 identity premise corrected by ARCH006 SR038. CRR0149.40 historical/corrected by CRR015; CRR0169.50 historical, readiness/category7 superseded by CRR017/018, no full numeric rescore. API00977.9% Fail and API01075.0% Fail remain owner-authoritative. Ineffective initial location.reload claims remain withdrawn. API009's three new durable files and cumulative API15 still need successful-test review; CRR013 does not approve them. Two overwritten IR009 logs remain disclosed CRR014 replacements, originals unavailable/no reconstruction. No cold-native history, backend-restart queue, power-loss, full-suite, semantic acceptance or new provider-budget claim.
