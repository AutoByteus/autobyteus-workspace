# Repeated Compaction Runtime Analysis

## Status And Authority

- Type: investigation supplement; evidence/context only.
- Approval applicability: N/A.
- Scope: the user-observed sequence after changing the Daily Assistant compaction trigger ratio from 80% to 20% in the locally built Electron application.
- Related behavior: BEH-007.
- Related requirements/acceptance criteria: approved REQ-011–REQ-012 and AC-014–AC-017.

## Observed Sequence

The supported settings UI accepts ratios from 1% through 100%. The user changed the active Daily Assistant from 80% to 20% after its prompt had already reached approximately 249k tokens. The effective input budget did not change; only the proactive compaction threshold changed.

| Evaluation / operation | Prompt tokens before evaluation | 20% threshold | Selected units / raw traces | Retained units | Compactor prompt characters | Result | Next observed prompt tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: |
| `compaction_operation_mssvv6cl_1` | 249,416 | 123,148 | 17 / 57 | 428 | 17,849 | Valid; 2 episodes, 18 semantic facts | 243,153 |
| `compaction_operation_mssvwf3s_2` | 243,153 | 123,148 | 2 / 4 | 428 | 3,628 | Valid; 2 episodes, 18 semantic facts | 242,812 |
| `compaction_operation_mssvxn2c_3` | 242,812 | 123,148 | 425 / 1,446 | 5 | 372,840 | Valid; 5 episodes, 0 semantic facts | 8,755 |
| next evaluation | 8,755 | 123,148 | N/A | N/A | N/A | `compaction_required: false` | N/A |

All three operations were separate successful parent compaction operations requested and executed during `turn_0001`. The sequence stopped only after the third operation reduced the prompt below the configured threshold.

## Trigger Semantics

For this run:

- Effective total model context: 1,000,000 tokens.
- Reserved maximum output: 384,000 tokens.
- Effective input capacity: 616,000 tokens.
- Safety-adjusted input budget: 615,744 tokens.
- At 80%, the proactive trigger was 492,595 tokens; the ~249k prompt was below it.
- At 20%, the proactive trigger became 123,148 tokens; the same ~249k prompt remained valid under the model input capacity but was above the new proactive trigger.

Therefore the first compaction after the setting change was expected. The percentage is a proactive trigger and does not redefine the model's hard context window.

## Root Cause

`resolveTokenBudget` and `CompactionPolicy` correctly derive and test the configurable trigger threshold:

```text
triggerThresholdTokens = floor(compactionRatio * inputBudget)
```

The selection planner is governed by a separate invariant. `EstimatedMessageBudgetStrategy` calculates the recent suffix budget as a fixed 35% of the full input budget:

```text
recentSuffixBudgetTokens = floor(inputBudgetTokens * 0.35)
```

The planner receives `inputBudgetTokens` but not `triggerThresholdTokens` or the active trigger ratio. At 20%, the trigger target was 123,148 tokens while the recent-suffix budget was approximately 215,510 tokens before protected-suffix subtraction. A normal first plan was therefore allowed to retain substantially more recent context than the threshold that would immediately be evaluated again.

The first two successful compactions retained 428 units and reduced actual prompt use by only 6,263 and 341 tokens respectively. Since the post-response budget check is performed after every LLM response in the same active tool loop, each still-over-threshold prompt requested another parent compaction operation.

The third operation changed shape because `WorkingContextMessageWindowPlanner.enforceBudgetAndCompactablePrefix` deliberately retains only the minimum recent suffix when every candidate would otherwise fit inside the fixed suffix budget. It selected 425 units, retained five, and caused the abrupt drop to 8,755 tokens.

## Classification

- Supported-path reachability: Reachable. The settings UI accepts 20%, the user changed it through the supported Electron settings surface, and runtime logs show the complete production path and consequence.
- Change posture: bug fix / behavior correction.
- Root cause: missing invariant plus duplicated/inconsistent policy. Trigger policy owns when compaction begins; selection policy independently chooses a post-compaction retention target without consuming the active trigger target.
- Prompt/model quality involvement: none in this incident. All three DeepSeek compactor responses passed the new response contract and committed successfully.
- Persisted-data impact: none; existing memory remains directly usable and no migration is needed.

## Required Behavioral Direction

1. Lowering the trigger below the current valid prompt size should still request compaction at the next supported evaluation.
2. One successful compaction operation for a threshold crossing must plan enough reduction that the resulting working context is expected to be below the same configured trigger with explicit headroom; a fixed retention target above the trigger is invalid.
3. One threshold crossing must not produce an unbounded or rapid chain of separate successful compaction operations. Accepted local estimate below the trigger is not a provider usage observation: after success, only a fresh same-key observation below the trigger rearms crossing detection. A first observation still at/above the trigger must produce one bounded inadequate-reduction diagnostic/suppression outcome instead of another proactive operation; hard-cap safety may override suppression.
4. The prompt contract, bounded invalid-response repair, atomic accepted-compaction commit, typed memory semantics, and existing persisted data remain unchanged.
5. Compactor-model input-capacity preflight or chunking is a separate future robustness topic and is not required to correct this observed trigger/selection mismatch.

## Evidence

- Screenshot: `evidence/repeated-compaction-at-20-percent.png`
- Focused runtime events: `evidence/repeated-compaction-server-log-excerpt.txt` (corrected for `ARCH-REV-002` / `AR-FIND-002`; directly recomputed SHA-256 `adc1c471f487ad1aee1ffe4e6176fdd70603218b0dadff39c09af439134148cf`; revalidated operation IDs `mssvv6cl_1`, `mssvwf3s_2`, `mssvxn2c_3`; prompt observations 249,416, 243,153, 242,812, 8,755; compactor prompt lengths 17,849, 3,628, 372,840; excludes the unrelated `mssvuhbz_1` run)
- Full server log: `/Users/normy/.autobyteus/server-data/logs/server.log`
- Trigger calculation: `autobyteus-ts/src/agent/token-budget.ts`
- Re-evaluation/request path: `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts`
- Trigger decision: `autobyteus-ts/src/memory/policies/compaction-policy.ts`
- Fixed retention budget: `autobyteus-ts/src/memory/compaction/message-budget-strategy.ts`
- Forced-prefix fallback: `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts`
- Supported UI range: `autobyteus-web/components/settings/CompactionConfigCard.vue`
