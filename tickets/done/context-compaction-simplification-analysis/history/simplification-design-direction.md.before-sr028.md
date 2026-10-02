# Simplification design direction

> Finalization: user approved the consolidated SR-012 scope (“Correct. approve”). The complete SR-013 `design-spec.md` now supersedes the tentative technical details and open-decision wording below. This document preserves the earlier design-direction discussion.

- Package / round: `context-compaction-simplification-analysis` / `SR-010`.
- Owner: Solution Designer. Date: 2026-09-26.
- Status: source-grounded proposal answering the user's design/strategy question, **not the final architecture spec or an implementation-ready package**. Core single-call/one-summary direction and clean replacement are approved. SR-010 user confirmation selects removal rather than a parallel strategy; final transition/configuration/output details remain to be agreed and completed.
- Basis: canonical requirements REQ-001–008, source investigation, current prompt `SR-008/prompt-v5`. No application source changed.
- Workspace/base: existing isolated `codex/context-compaction-simplification-analysis` worktree at `046279298f53fb98d7688ee9dc2b2ba0fa827685`; finalization target remains `origin/personal` through delivery.

## Decision to simplify: replace, do not add a parallel strategy

**The framework supports registered compaction strategies. The inspected production registry registers only `structured-json`.** It is wired through a registry, resolver, environment/settings value, GraphQL catalogue and web selector. `MessageBudgetStrategy` is a separate internal token-budget calculation contract, not a second compaction algorithm.

Adding a `markdown` strategy alongside `structured-json` would keep the old machinery and its tests/configuration alive. It also would not bypass the main coupling: the shared proposal still expects a normalized episode/semantic result, and the shared accepted-result builder constructs categorized records and then renders them. The existing registry is not a clean text-output plug-in seam.

User-selected direction (SR-010): one supported rolling-summary compaction path, with a narrow direct-model invocation boundary where dependency injection/provider support is actually useful. Remove the compaction strategy selection infrastructure and old execution path rather than building compatibility switches or leaving obsolete options. Keep the useful threshold/context-budget/logging controls; removing one meaningless algorithm selector is not a settings redesign.

This approved replacement direction is not a claim that removal of every public export/API has already been fully audited. Current repository production registrations/callers were inspected; external library consumers are unknown. Such uncertainty must be resolved in final design rather than preserving a hidden fallback by default.

## Before and after

Current path:

```text
Run reaches compaction threshold
  -> existing window planner
  -> launch built-in compactor AgentRun and collect its final output
  -> extract/validate six-array JSON (possibly model-driven correction)
  -> normalize episodes and semantic facts
  -> create/store category records and their lineage membership
  -> render them back into a combined message
  -> finalize/save working context
  -> next request continues
```

Proposed path:

```text
Run reaches compaction threshold
  -> existing window planner
  -> one direct model call using the tuned prompt
  -> extract the single marked Markdown summary and validate the candidate
  -> finalize/save one replacement working context
  -> next request continues
```

This replaces the *combined prompt-facing result*, not merely the episode half or semantic half. Useful facts, outcomes and current work remain in the Markdown body. No independent episode/fact items are generated, identified, ranked or re-rendered.

## Context layout stays recognizable

Logical context before compaction:

```text
required system head
previous summary, if any
older settled messages selected for compaction
recent retained messages and protected tool-call/result groups
```

Logical context afterward:

```text
same required system head
one new Markdown summary
same retained recent messages and protected tool-call/result groups
```

The summary is produced from the previous summary plus newly selected settled history. At the next compaction it is replaced, not appended to indefinitely. Required head and recent/tool-safe suffix remain separate planning concerns. Existing provider-aware finalization may compose adjacent user messages while retaining provenance; this diagram is the logical layout, not a demand for a new physical role protocol.

## Clear responsibilities without a new framework

| Existing boundary / concern | Target responsibility | What it must no longer do |
| --- | --- | --- |
| Run/request preparation and `PendingCompactionExecutor` under `MemoryManager` | Own when an attempt is allowed, immutable baseline, sequencing, status/failure and existing retry admission. | Resolve a catalogue of legacy/current compaction algorithms or coordinate a child AgentRun. |
| Existing unit builder/window planner and budget calculations | Select eligible old history; preserve head, recent suffix and complete tool groups; reserve replacement capacity. | Classify output into memory kinds. Renaming memory-specific terms is useful only where meaning changes. |
| A small summarizer invoked by the compaction owner | Build input with the tuned prompt; use the existing LLM construction/provider boundary for one call; extract one complete marked body. | Create an agent, expose tools, write memory files, launch a repair agent or own run persistence. |
| Existing finalizer/output validator | Compose head + summary + retained messages; enforce tool/message integrity and target context capacity. | Render a semantic/episodic bundle or infer summary completeness from tag presence alone. |
| Existing working-context/snapshot and raw-trace owners | Commit and restore the continuation context; preserve the existing evidence/archive contract. | Require fresh category IDs/rows to validate an otherwise valid current summary. |

Small components can remain where they own real policy or boundaries. Removing layers does not mean putting provider access, planning, storage and UI in a single large file.

## Keep, modify and remove — proposed change inventory

Paths are relative to the task worktree. Core compaction paths below are under `autobyteus-ts/src/memory/compaction/` unless otherwise noted.

| Action | Current files/surface | Target delta |
| --- | --- | --- |
| Keep/adapt | `working-context-message-unit-builder.ts`, `working-context-message-window-planner.ts`, `compaction-planning-budget.ts`, `message-budget-strategy.ts` | Preserve boundary/budget responsibilities. Fix source preparation that clips important user/prior-summary content; do not discard planner safety just because output is text. |
| Modify | `pending-compaction-executor.ts`; `autobyteus-ts/src/agent/loop/llm-phase.ts` | Wire the single compaction path; retain scheduling/gating/status and replace episode/fact/child-run diagnostics with operation/model/size outcome data. |
| Replace | `agent-compaction-summarizer.ts`, `compaction-agent-runner.ts`, `structured-json-compaction-strategy.ts` | A direct summarization boundary producing one summary plus needed invocation metadata. Final file names/ownership to be settled in complete design. |
| Remove | `compaction-response-parser.ts`, `compaction-result-normalizer.ts`, categorized `compaction-result.ts` | Small marked-summary extraction replaces six-array parsing/correction/category normalization. No alternate old-output fallback. |
| Simplify | `working-context-compaction-proposal.ts`, `accepted-compaction-builder.ts`, `accepted-compaction-committer.ts` | Proposal carries summary text and necessary selection/budget/identity data, not episode/semantic entries. Builder creates the summary message directly; commit does not write category rows. |
| Remove from active path | `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts`, `current-compaction-output-loader.ts`; category-membership lineage wiring | No category-to-prompt projection or category-membership restore gate. Audit remaining exports/readers before deleting shared files; independent historical inspection is not the obsolete generation path. |
| Remove | `default-working-context-compaction-strategy-registry.ts`, `working-context-compaction-strategy-registry.ts`, `working-context-compaction-strategy-resolver.ts`, algorithm-selection portion of `working-context-compaction-strategy-setting.ts` | One path, no selectable legacy strategy. Move still-useful diagnostics/types to their concrete owner rather than keeping an empty strategy facade. |
| Modify | `memory-compaction-configuration.ts`, `compaction-runtime-settings.ts` | Replace required child-runner dependency with direct summarizer wiring; retain enablement/budget/debug controls and useful model choice. |
| Remove/replace wiring | `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts`, `compaction-run-output-collector.ts`, `memory-compactor-agent-launch-resolver.ts` | No child create/post/subscribe/wait/terminate lifecycle. Reuse `createAvailableLlm` and existing availability/secret-resolution ownership. Keep the tuned prompt content, not an otherwise unnecessary agent lifecycle. |
| Remove obsolete selection only | Server strategy setting/catalog GraphQL resolver; web strategy catalogue/selector and corresponding setting/query wiring | Remove advertised algorithm choice, retain compaction threshold/context limit/debug controls. Source-backed scope, not a broad UI overhaul. |
| Modify | Snapshot restore/bootstrap; core/server backend construction and public exports/tests/docs touched by removals | Remove category dependencies, supply the direct path consistently and delete obsolete tests/docs rather than retain contradictory contracts. |

Future long-term-memory development is separate work. Do not add speculative memory-module extension points, stores or hooks now just to reserve that possibility. The boundary is the absence of compulsory long-term-memory processing in compaction, not a new framework.

Do not blanket-delete the whole episodic/semantic subsystem or historical files without tracing independent readers. This scope removes their mandatory role in compaction; long-term-memory design itself remains out of scope.

## Persistence: one active authority

The existing v5 working-context snapshot already stores the summary text in its marked message region. Strong candidate: reuse it as the active continuation authority rather than creating a separate summary store and copying the same value back and forth.

The stored snapshot may remain JSON because it contains typed messages and metadata; that does not mean the LLM must return categorized JSON. Model output format and runtime persistence serialization are separate concerns.

Existing restore currently depends on categorized lineage, and current commit ordering spans archive/category/lineage/snapshot writes. Those dependencies cannot simply be deleted without a safe, concrete commit/restore design. Preserve baseline safety, normal resume integrity and the existing raw-evidence lifecycle using the owning snapshot/trace boundaries. Do not invent a generic transaction framework to compensate for keeping redundant stores.

Recommended product boundary remains: keep currently supported existing runs resumable and historical records readable, but never run the old categorized compactor as a fallback. This preserves user data, not obsolete code. The user has not yet explicitly answered the historical-data question; do not claim that transition is fully approved or proven migration-free.

## Direct call: no autonomous compactor

Use a dedicated LLM invocation with the saved prompt and selected history. Reuse existing model availability, provider and secret-resolution construction. Do not mutate the parent agent's system prompt or share an invocation lifecycle in a way that changes the parent's tools or telemetry.

A direct-call interface is not a new strategy framework: it separates provider execution from the memory owner's orchestration and makes focused testing possible. Parent-model/default and explicit override behavior must be mapped from current settings without leaving a ghost agent-definition dependency. Native-provider conversation identity/cleanup and normalized completion status remain known investigation tasks, not reasons to silently exclude providers.

## Proportionate refactor sequence

1. Confirm the final behavior/prompt/data/configuration boundary; retain the current tuned prompt as the content authority.
2. Complete the safe snapshot/trace and provider/model-binding decisions against current source.
3. Replace the shared categorized proposal/builder boundary with a summary-text boundary and direct-call wiring; preserve planner/finalizer/validation behavior.
4. Remove old parser/normalizer/category projection, child-run lifecycle and strategy catalogue/selection as part of the same coherent change—not an indefinitely dual implementation.
5. Validate first and repeated compaction, protected head/tail/tool boundaries, output extraction/failure, normal resume and historical inspection as applicable; update docs/settings/tests for the actual single path.

This spans core runtime, server wiring and limited settings cleanup; it is more than a prompt edit. It is not permission to rewrite unrelated memory or application subsystems. Formal size/risk classification belongs after the complete architecture, not this discussion proposal.

## Remaining design work and approval state

- Full requirements/prompt supplement approval, including the known data-continuity decision and surfaced removal of algorithm selection.
- Provider terminal-status contract across supported direct-call adapters; native conversation lifecycle; model-configuration mapping without child agents.
- Safe snapshot/trace replacement and restore integrity; representative supported persisted-data evidence before claiming no migration.
- Exact final file/API/export removals and dependent UI/settings changes; external strategy extension consumers not audited.

No new live-model experiments, implementation changes or specialist reviews were performed for this explanation. The final `design-spec.md` is not yet issued; current result is a source-grounded simplification proposal, not Architecture Design Complete.
