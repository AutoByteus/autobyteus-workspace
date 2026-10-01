# SR-018 — completed revised architecture for independent re-review

## Result / request

Package `context-compaction-simplification-analysis`; Solution Designer; 2026-09-30.
**Architecture Design Complete; task_size Large; architectural_risk High.** This classifies the completed structural solution for review, NOT acceptance or Delivery. User explicitly asks: “I think the design, the requirement is clear. I think you need to do relevant updates and then send extra review.”

Original objective: separate context compaction from long-term memory, replacing categorized JSON/episodic/semantic generation and child compactor execution with one direct LLM continuation-summary call. Preserve useful head/prefix/recent-tail planning, tool safety, budget/raw evidence/saved-run/history behavior. Do not design the future memory module, keep legacy strategies, or invent a summary-entry UI.

## Approval and authoritative package

Approved: SR-012 REQ-001–009/AC-001–011 and exact prompt-v5/output contract, plus explicitly approved SR-017 no-legacy-settings-import/default-parent amendment (AC-012), reaffirmed now. Requirements and revised design aligned; snapshot terminology clarifies current data meaning versus an obsolete version label under the required migration guideline. No new old-shape runtime decoder or data-loss policy. Active prompt SHA256 `2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7` unchanged. **Candidate-v6 remains unapproved, excluded from active design and implementation.** This review request does not approve it or a new provider campaign.

Core authorities:
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md` (E18-1–5)
- Technical design: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/design-spec.md`
- Cumulative revision index: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision-record.md`
- Full cumulative result: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-progress-result.md`
- Active literal/contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/output-format-and-coverage.md`
- Investigation/rebase checks: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/README.md`
- Full absolute supplement/report/index inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/reference-index.json`; all referenced histories/logs remain in place. Product N/A—not requested. Delivery N/A—not reached.

## Revised architecture / what to review

1. One fixed direct-call compaction flow; no strategy selector/registry, child agent, new category writes or semantic repair generation. Previous summary plus selected older settled history -> one tagged six-heading Markdown replacement. Existing selection, retention, tool safety, commit/raw archive responsibilities remain.
2. Missing current settings uses each attempt's actual parent model/provider and existing credentials; no separate setup/default write. Ratio and optional current model/generation/context/debug controls remain; no new UI reorganization. Explicit current saves persist; unavailable selected model errors, not hidden fallback.
3. Remove old settings importer source, startup import/await and obsolete tests; no registered replacement, old-file fallback, initialization marker or historical preference deletion. Old data files remain inert. No new migration or history conversion campaign.
4. Complete the previously pending migration-guideline audit: normal snapshot reads project current fields, ignore obsolete root/version fields, retain known identity/provenance/tool/provider semantics, and ordinary writes emit exactly `{agent_id,messages}`. Same file/meaning/atomic owner; no startup rewrite. No missing-fact coercion, old decoder or new admission timing. Settings tuple likewise projects known fields and writes exact keys.
5. Before that codec changes, freeze existing native-v5 upgrade source classifier and fixed target in a migration-owned shape file; existing converter retains its released conversion/disposition semantics. An exact valid versionless successor encountered during an already-eligible old migration is preserved before historical conversion/cleanup. No new ID, ledger replay, global gate, repeated scan or journal. Runtime never imports frozen historical shapes. This is an existing-upgrader dependency correction, not a new data transform; review its scope and preservation closely.

DS-001–005 cover automatic/repeated generation, resume, inspection, events and optional current settings; DS-006 retired; DS-007 exposes the existing upgrade interaction rather than hiding it. File/removal inventory, ownership, sequence, ten-point guideline check and target verification are in canonical design. Cumulative Large/High is based on actual runtime/contracts/persistence ownership changes, not Markdown volume. Small no-import delta alone does not downgrade the whole ticket.

## Source / evidence / limits

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`; latest fetched and final remote-checked origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`; current HEAD `9f3b7984a0bbb4a1b09ea249958c64f635c4cd2e`. Four existing task commits replayed over17 new upstream commits. Finalization remains origin/personal, Delivery-owned.
-286 pending paths preserved:284 identical; two API files automatically merge only upstream skillAccessMode removal. Safety branch/stash/tar retained; full evidence under `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/refresh`. Eight conflicts resolved preserving upstream active builtins and already-approved child-compactor deletions. No target implementation changes this round beyond existing-commit rebase reconciliation, no source defect patched by Solution Designer, no specialist report edits.
- Eight unchanged-source characterization checks PASS. They prove current strict reader/version behavior and converter risk, not target implementation or installed-data acceptance. Exact scripts/fixture/source hashes retained; no private dataset sampled.
- Five normal server unit files: **42PASS / 2FAIL**. Two API-owned harness tests fail before intended execution because `ContextFileOwnerResolver` requires memoryDir but wrapper currently supplies only locations (SR018-OBS-001). API owner must reconcile owned-root/readiness semantics and revalidate; do not weaken guards. No claim this explains historical API-F004. Log retained.
- Smoke-script syntax, diff check, ancestry and no-unmerged checks PASS. No full suite/typecheck/built-server smoke/desktop/browser/provider acceptance. No new live-model calls or user-profile/database access; standard test-owned DB only. No push/merge/release, no LMStudio/desktop/external-WIP cleanup.

## Unresolved gates — not waived by architecture review

**API-F005** is a confirmed generated-summary fidelity failure: a requested plan/checkpoint addition is claimed completed/current without source evidence. The exact current v5 prompt already prohibits this; four bounded temp0.7/0 comparisons all failed. No model/prompt/config remedy proven; do not replace valid ACs, switch defaults/support, add semantic validator/repair calls or retry until green. v6 is a separate unapproved proposal, not part of this review basis.

**API-F004** is separate unresolved full-runtime continuation failure with missing original final content/error. Later four-tool positive runs do not isolate cause; the SR-014 run also omitted normal Prisma setup, limiting equivalence. Retain original failed/positive evidence and all disclosure.

**SR018-OBS-001** is newly observed current-base test-support composition drift; do not rescore prior confidence or fix API-owned tests through this design review. Nine API-owned durable paths require subsequent proportional successful-test review. Historical ARCH-REV-001/CRR-002 sourcePass9.40 do not approve this base/revision; API-REV-002 remains Fail82.9. No Delivery advancement.

The structural design may be reviewed/implemented through normal owners while these acceptance gates stay open. Any changed behavior-defining prompt/configuration/support remedy returns for user approval. No additional generator calls authorized by this packet; future reproduction must use a separately declared bounded owner plan.

## Expected reviewer result and route

Independently review the aligned revised design against current source/guideline and approved intent; append your own review history/report. Specifically assess no-import/default-parent completeness, simple spine/removal boundaries, reader/frozen-upgrader separation/preservation, current-base integration risks and target validation. Return any requirement/design finding to Solution Designer rather than broadening behavior. Apply your skill/rules for the resulting review; no Delivery approval, duplicate API failure route or score change implied here.

Rules fetched after full persistence. The single most-specific matching condition is Architecture Design Complete with Large/High -> `/architecture_reviewer`; other rules do not apply. This is the sole formal route. Handoff confirmed accepted=true / DELIVERED to `/architecture_reviewer`, run `architecture_reviewer_589564a0573e47b8b09f3e098800233f`; receipt at solution-recovery-evidence/sr018/handoff-receipt.json. No reviewer Pass or acceptance claim. Required handoff complete; stop. This full result is the handoff attachment, not a path-only task description.
