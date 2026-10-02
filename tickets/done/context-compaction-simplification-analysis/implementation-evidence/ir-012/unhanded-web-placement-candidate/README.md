# IR-012 — native integration test placement

Trigger: CRR017 / API010-F001, implementation-owned Local Fix. Approved SR033 / Ready SR038 / ARCH-REV006; Large / High unchanged.

The unchanged mandatory guard reproduced exit1 before correction and exit0 afterward. The native cross-layer test moved from web services to the existing tests/integration owner. Imports only retargeted for the move; the complete mock/test body is byte-identical. All four direct static core imports remain explicit. No guard exception, regex/syntax evasion, guard/build bypass, production dependency, assertion deletion or API fixture change.

## Evidence
- entry-* snapshots and pins: incoming source, authorities, raw/logical Git index/refs/stash.
- source-before/, source-delta.patch, source-inventory.json: exact test relocation, new guard contract tests and focused TESTING.md guidance.
- test-relocation-check.json: entire original mock/test body preserved; old active path removed.
- production-preservation.json: all17 IR011 production paths match their published hashes.
- guard-before.log/.json/.exit and guard-after equivalents: same first mandatory build check, red -> green.
- focused-web.log/.json/.exit:19 tests /4 files pass (native2, identity12, guard3, existing packaging2).
- documented-native.log/.json/.exit: advertised standalone new path,2 native cases pass again (overlap, not additive).
- whitespace-check.json: no trailing whitespace/EOF issues; tracked diff check0. Untracked no-index check commands return1 for differing /dev/null inputs with empty diagnostic logs, not test failures or silently reported exit0.
- final-audit.json: exact allowed modification/removal plus API15/packaged2/Git preservation.
- reference-index.json and reference-check.json: cumulative navigation with old native test mapped to preserved preimage and current relocated path. Archive is immutable history, current direct files override it.
- handoff-rules/selection/receipt: only confirmed receipt establishes handoff.

No full build, app/environment bring-up, renderer, provider or API signoff this round. No new source/UI behavior; frontend feedback loop N/A for this placement-only delta. IR011 bounded rendering remains historical scoped evidence, not a product reload check.

## Required continuation
Independent current-source re-review -> API documented full worktree build + same-backend actual new renderer, repeated Agent/hosted-Team attachments/Held A + Queued B, recovery/no-send/no-reingestion/negative/product Stop checks -> separate successful-test review -> Delivery. API009 integrated closure remains OPEN. API010 local cause corrected for review, not a full build/runtime closure claim.

F005 accepted-known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass; 14 wider + 7 baseline failures unwaived. Historical OOM/web tsc7078 and latest reported7181 remain non-green; no new full typing run. API006 withdrawn/API007 unsupported excluded. ARCH004/IR007/CRR011/API00895.0/CRR013 passes are pre-integration only; ARCH005 covers SR035, corrected by ARCH006 for SR038. CRR0149.40 historical/corrected by CRR015; CRR0169.50 historical and its readiness/category7 rationale superseded by CRR017, no full numeric rescore. API00977.9% Fail and API01075.0% Fail remain owner-authoritative. Ineffective initial location.reload claims remain withdrawn. API009's three new durable files and cumulative API15 still need later successful-test review; CRR013 does not approve them. Two overwritten IR009 overlap logs remain disclosed CRR014 replacements, originals unavailable/no reconstruction. No native cold-history activity, backend-restart queue, power-loss, full-suite, semantic acceptance or new provider-budget claim.
