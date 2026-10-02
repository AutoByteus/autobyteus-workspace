# Execution-Base Design Recovery — SR-015 / IB-001

## Result and requested next output
**Architecture Design Complete — Ready for independent re-review**, package `gemini-tts-voice-schema-audit`, 2026-10-02, Solution Designer. **task_size Medium / architectural_risk High** retained. This is a design-only response to Implementation **IR-001 Blocked / Design Impact**, finding **IB-001**, not a completed merge, implementation or acceptance result. Independent review must cover current SR-015 before dependent Implementation resumes. ARCH-REV-001 Pass covers SR-014 only.

Requested output: independently review the bounded conflict disposition and preserved execution-base/delivery gates against unchanged approved SR-012. On Pass, the reviewer owns the primary cumulative implementation handoff. Implementation then completes the existing pending merge/checks and the approved speech feature; no direct implementation bypass or duplicate primary forwarding from this result.

## Original request, goals and unchanged approval
User asked to investigate Google's public voice/schema capability and improve existing **generate_speech** with successfully exercised new features; voice creation should be included only if it works. Experiments showed a genuine extra single voice and per-turn dialogue metadata accepted on configured Vertex Express, but creative voice creation failed on that route. User approved the SR-011 value recommendation with **“thanks lets go i aprove your suggestion. now design after your design tell me the schema you designed”**, then **“continue”**. Reference **USER-APPROVAL-2026-10-02-SPEECH-SR011**, requirements **SR-012 Approved**.

Approved delta remains: provider-ID-capable single-speaker voice_name; featured 30/Kore/default3.8Flash/separateLite retained; accurately advertise tested extra ar-001-advisor-1 without all-library guarantees; optional ordered per-turn styles/global fallback within existing up-to-two-featured-prebuilt dialogue. Same transcript/config/output/WAV/tool contract, explicit configured route and safe errors. Creation, replication, discovery UI, new SDK bump/Interactions/runtime/vault features, streaming and output/rate controls remain deferred. No schema/REQ/AC/behavior change, so **no renewed user approval required**. This disposition preserves REQ-006/AC-006 and REQ-007/AC-007 rather than adding a new product feature.

## Incoming finding and independently observed state
Incoming implementation-handoff.md, implementation-base-blocker-ir001.md, implementation-revision-record.md and dependency-merge-conflict-ir001.patch were read before action. Read approved requirements, SR-014 design/recovery, shared investigation/history, relevant experiment/recommendation supplements, current ARCH-REV-001 and old CRR-008/DR-004. Local read-only git/source inspection independently confirms:

| Item | Exact observed state |
| --- | --- |
| Isolated worktree | /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit |
| Branch | codex/gemini-tts-voice-schema-audit |
| Original resolved base | origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061 |
| Last refreshed origin/personal reference | 5e3cb2f720e6fc80173099075daf55594ed58de9; lacks pinned 3.8 dependency; not re-fetched or changed this round |
| Finalization target | origin/personal / personal — no update/push performed |
| HEAD / task document checkpoint | f1b03b4ed90b1d88f588319a945a22a980b93e73; Implementation checkpointed 18 received documents |
| MERGE_HEAD | c6586a07f3c2585aa13673875c1bc34c971b6e5e — exact pinned reviewed dependency |
| Merge base | b0b077b02571098a6bf7993ab46b67a69fdb8f9d |
| Unmerged source | only test-support/live-e2e/live-e2e-harness.ts; imports and wrapper regions |
| Current harness delta versus HEAD | conflict markers/two alternative regions plus nonconflicting nested useGeminiMode.setup query fix |
| Completed base / speech expansion | Neither completed; install/build/tests not run on unresolved base |

Stage 2 current-base imports/composition use ContextFileLayout, ContextFileOwnerResolver, ContextFileLocalPathResolver, stored team locations, org locations and CollaborationExecutionLocationService. `wrapProductAgentBackendForLiveE2e(backend, environment)` creates the real AgentRunProviderInputNormalizer against scenario-owned roots. Both current call sites provide appDataDir/memoryDir/baseUrl. Stage 3 incoming replaces this with an attachment-free `resolve:()=>null` fixture. The production general-process-run-supervisor uses the same resolver/owner/layout composition as current wrapper. No change to those production modules is needed.

Existing live-e2e-harness unit tests use a real owned package-readiness scan: admitted context locator becomes an owned contained path; unadmitted locator stays opaque; recording locator and original input stay unchanged. Existing normalizer tests preserve remote/missing URI opacity and copy/null semantics. **Read-only contract evidence, not a fresh test Pass.** The normalizer, context local resolver, owner resolver and production supervisor worktree blob hashes equal HEAD, documented in investigation ARCH-EVID-008.

Current GraphQL returns GeminiConfigurationCommandResult.setup; incoming query's nested setup selection is correct. Whole-file ours would lose it; whole-file theirs would discard legitimate current context and unrelated harness behavior. Thus both blanket choices are rejected. This is an execution-base preservation problem, not a demonstrated speech/provider/source bug or a requirement gap.

## Authoritative bounded disposition
1. **After independent SR-015 review Pass**, Implementation retains current stage 2 content **only within the two recorded conflict regions**: six imports and required environment-aware wrapper/composition. Keep both current environment call sites. Remove conflict markers and incoming no-op alternative. No optional environment, dual path or fallback normalizer.
2. Keep all nonconflicting automatic merge content. In the harness specifically retain `useGeminiMode { setup { activeMode aiStudioConfigured vertexExpressConfigured vertexProject { project location } } }`. Keep incoming source/defaults/migration/models/SDK/locks, static scenario model IDs and format-aware Gemini audio assertions. **No whole-file ours/theirs checkout.**
3. Keep current production normalizer/resolver/owner/supervisor and unrelated harness/compaction behavior unchanged. Do not add a new normalization abstraction or change production admission/storage rules. The fixture replacement is preservation of current behavior, not endorsement/re-review of another feature's entire architecture.
4. Preserve the IR-001 checkpoint, pending index and newly received task documents. Implementation finishes the **existing** pinned merge; do not launch a second merge/checkpoint attempt while MERGE_HEAD exists, abort/reset, reconstruct a subset or rewrite refs. Use intentional scoped staging/inspection, not blind `git add -A` or deletion of inherited/untracked artifacts. Record final merge commit and both-parent ancestry; inspect effective source and both lock intents.
5. Run deterministic base-admission checks below **before expansion coding**. Clean merge/ancestry alone are insufficient. If another material conflict or required unrelated semantic/lock/source change emerges, return new precise evidence to Solution Designer rather than widening this authorization.
6. Continue unchanged SR-015 speech feature after valid base; preserve the High-risk source review and API/E2E route. **Old CRR-008 certifies only pinned candidate, not this effective combined tree.** New Code Reviewer must inspect this bounded integration resolution/effective tree alongside expansion source. No independent Pass is claimed now.

Illustrative final harness delta versus f1b03b4ed: current imports/wrapper/call sites unchanged; only nested setup query added. This is a checkable expectation, **not a patch applied by Solution Designer**.

## Execution-base verification plan and ownership
Implementation-scoped checks per TESTING.md/server AGENTS.md; no formal API/E2E substitution or paid request:

```sh
# After owned resolution / completing the existing merge:
git diff --name-only --diff-filter=U
git merge-base --is-ancestor f1b03b4ed90b1d88f588319a945a22a980b93e73 HEAD
git merge-base --is-ancestor c6586a07f3c2585aa13673875c1bc34c971b6e5e HEAD
pnpm install --frozen-lockfile
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-audio-assertions.test.ts tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts tests/unit/context-files/context-file-local-path-resolver.test.ts tests/unit/context-files/context-file-owner-resolver.test.ts --no-watch
pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/audio/audio-client-factory.test.ts tests/unit/multimedia/audio/api/gemini-audio-client.test.ts tests/unit/utils/gemini-model-mapping.test.ts tests/integration/llm/api/gemini-llm-wire-contract.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/unit/config/retired-speech-model-selection.test.ts tests/unit/services/server-settings-service.test.ts --no-watch
```

Record merge commit, effective harness delta and exact results in Implementation artifacts. First command must return no unresolved paths; both ancestry checks return0. Verify manifest/root/nested lock agreement and installed Google SDK2.24.0; no lock regeneration/upgrade by assumption. Server build prebuild prepares current core/shared packages and Prisma; stale dist from the old worktree is not this base's proof. Tests must retain the existing admitted/unadmitted/source/recording assertions and Gemini/WAV versus other-provider behavior. No live-provider environment/key or import for these tests. Missing prerequisites/failures must be classified honestly before expansion proceeds, not counted skipped-Pass or fixed by weakening preservation assertions. Further layer selection remains owner-proportionate under TESTING.md.

## Preserved delivery, security and evidence boundaries
- Pinned independently source-reviewed candidate suffices for local development; old finalization remains **not a coding gate**. Actual incorporation and checks are still required. The older fixture's exact source text is not a mandate to regress a newer legitimate base contract.
- Old DR-004 user-verification/finalization hold remains Delivery/user-owned. Do not use this new ticket's transitive target merge to smuggle the held dependency into origin/personal. Existing owner/user must resolve that separate hold before delivery finalization; no old worktree/branch/owned artifact mutation or release request here.
- Prior SR-010 direct SDK WAVs establish one extra ID and metadata-generation feasibility, not implemented tool acceptance, every voice/route/Flash-Lite/custom support or audible quality. SR-013 mocked SDK serialization proves local projection only. AC-002/003 tool/live output and listening/transcription for order/style contrast/directions-not-spoken remain downstream gates. Header-only proof is insufficient for quality.
- Fresh real validation needs new explicit bounded user authorization and supported dry-run/TTY import into isolated test-owned DB/key/runtime, never production vault or deleted-state reuse. Feature/design approval does not authorize extra paid calls. No provider/import/private-source/audio operation occurred in SR-015.
- Speech schema and approved requirements are unchanged byte-for-byte; no migration/persistence/runtime/route/default/acceptance change. No independent-review or feature Pass inferred from documentation.

## Classification and design health
Medium scope: four speech production owners plus one bounded harness preservation and focused tests/docs, no new subsystem/UI/DB. High risk retained for shared model/tool contract, nullable schema projection, safe provider errors and dependency/effective-tree validation. Document volume/inherited candidate breadth does not itself make a new Large feature. IB-001 is a design-authority gap in integration, not an accusation of current production resolver defect. Existing boundary absorbs the fix; no broad normalizer/compaction refactor, compatibility shim or alternate base is needed.

## Cumulative absolute package paths and authority
Current canonical solution:
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/requirements-doc.md — approved SR-012, unchanged
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/investigation-notes.md — cumulative factual authority, ARCH-EVID-007–010 added
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/design-spec.md — authoritative SR-015; schema/feature semantics unchanged
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-revision-record.md — cumulative SR-001–015 and prior informational Pass
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/generate-speech-schema.json — unchanged contract supplement
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-base-recovery-sr015.md — this full result/handoff

Still-relevant Solution Designer supplements (supporting evidence/history, not competing intent):
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-handoff-sr013.md — original architecture submission; base action refined by SR-014/015
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-base-clarification-sr014.md — candidate-development versus delivery gate retained; conflict action refined by SR-015
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-feature-probe-sr010.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/speech-value-recommendation-sr011.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-schema-audit-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-provider-probe-sr005.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-proposal-sr004.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-scope-update-sr008.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-capability-clarification-sr009.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/test-vault-usability-assessment-sr006.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/test-vault-runtime-explanation-sr007.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/architecture-pass-notification-archrev001.md — receipt of earlier Pass, not current re-review

Specialist-owned read-only artifacts:
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/design-review-report.md — ARCH-REV-001 Pass of SR-014 only
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/architecture-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/implementation-handoff.md — IR-001 Blocked, no expansion source
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/implementation-base-blocker-ir001.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/dependency-merge-conflict-ir001.patch

External read-only dependency evidence:
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/code-review-report.md — CRR-008 source Pass of c6586a07f only
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/release-deployment-report.md — DR-004 separately owned hold
- /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-current-key-probe-sr014.md — different package's basic speech evidence

Product/behavior-defining supplements: **N/A — not requested/applicable**. New-ticket code review/API-E2E/delivery artifacts: **N/A — not reached**, not omitted Passes. Earlier reviewer primary handoff was already delivered; this material recovery requires a new reviewer round, not duplicate forwarding of unchanged SR-014.

## Current work, blockers, risks and route
Completed here: local read-only git/source/contract investigation and Solution Designer-owned design/evidence/history/result changes. No source/index/ref alteration, dependency install/build/test, provider/key/private-source access, old-package mutation or finalization. The actual IR-001 merge remains in progress. Design-level IB-001 disposition is explicit; executable base and feature acceptance remain pending. Further conflicts/failed prerequisites return through their proper ownership boundary.

Owned-artifact checks before routing: scoped `git diff --check` passed; all 27 absolute referenced files exist; new result has no trailing whitespace; unchanged schema remains parseable JSON. Requirements/schema SHA-256 remained **49c312ad3d343a872702f04caa7c5b84493a7cc03116e1be4e5997a672730279** / **1539325a31b2c35cd2d44a9f3744fa6eaf9446556d260d4fbae924101d777a66**. HEAD/MERGE_HEAD/unmerged path stayed identical; current harness diff SHA-256 stayed **ed37eafc2decd3ca251106221e7f920cbc21994e5419585fdcc07d069dc2a2ec**, confirming no source resolution by this round. These are document/state integrity checks, not executable-base or feature acceptance.

`get_handoff_rules` checked after full persistence, 2026-10-02. The most specific matching completed/revised **Architecture Design Complete / High-risk** condition with approved SR-012 returns exact **/architecture_reviewer**. Medium/Low direct implementation and Delivery Completed receipt-gap conditions do not match. Send this same full result plus cumulative package to that reviewer only; no additional Implementation/Delivery recipient for this outcome. Handoff success is claimed only on the corresponding tool's confirmed delivery. Stop after confirmed required handoff; do not poll/review/implement the receiving specialist's work.
