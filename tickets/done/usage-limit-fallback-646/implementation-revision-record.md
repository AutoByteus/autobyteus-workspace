# Implementation Revision Record — autobyteus-646

## IR-001 — SR-004 … SR-010 implemented (initial implementation, cumulative)

- **Basis:**
  - design-spec.md § SR-004 Revisions R-1 … R-16;
  - SR-005 … SR-010;
  - ARCH-REV-005 Pass on SR-010.
- **History within IR-001:**
  - Built SR-004 (R-1 … R-7).
  - Raised IQ-002 → SR-006, IQ-003 → SR-007 and IQ-004 → SR-008, and built them.
  - Held the live switch, the in-flight map, the classification and the retention while ARCH-REV-003/004 were open.
  - Then built SR-009 (R-11 … R-14) and SR-010 (R-15, R-16, AR-012) as the reviewer lifted the hold.
- **Replaced on the way:**
  - R-1's use of the person's Save → the own automatic switch per root (R-11);
  - the listener's in-flight set → the roots' state guard (R-12);
  - the detector's limits read → per-backend classification and `ERROR_CLASSIFIED` (R-13, R-16);
  - the continue message as an unseen system input → `present_as_notice` (R-10).
- **Evidence:**
  - `evidence/IMP-03` (built-server E2E 8/8);
  - `IMP-04` (server unit);
  - `IMP-05` (integration);
  - `IMP-06` (autobyteus-ts);
  - `IMP-07` (web);
  - `IMP-08` (contracts);
  - `IMP-09` (two-server E2E);
  - `IMP-10` (browser probe).
  - IMP-01/02 are the earlier full runs before SR-009.
- **Handoff:** `implementation-handoff.md` → code review.

## IR-002 — SR-011 (code review CRR-001: CR-646-01 … 03) applied

- **Basis:** design-spec.md § R-17 … R-19 (SR-011, commit 230bcc534b).
- **CR-646-02 → R-17 (node fallback):**
  - `FallbackChooser` tiers: router → `agent_history` → `node_fallback` → nothing usable.
    - The node fallback (`nodeFallbackPick`) takes the node's most-used usable runtime and model over 30 days across every agent (`AgentLaunchHistory.launchesOfNode`), else the first usable runtime in the report's order with its first usable model.
    - `no_fallback` now means nothing is usable.
  - Delegation (`fallbackLaunch`, the `FallbackLaunchPort`, formerly the history port): after an exhausted skip, the agent's history comes before the inherited launch as before; the node fallback comes only when the inherited launch can't run (or there is none), before a refusal.
- **CR-646-01 → R-18 (no-fallback text):**
  - The text is "Usage limits reached: … No other runtime can run now. Choose one in the run's Settings to continue."
  - It names every exhausted runtime with its earliest known reset, or "for about an hour" (`ExhaustedModel.resetKnown`).
- **CR-646-03 → R-19 (launch origin):**
  - The commit primitives take the launch source (`buildRuntimeSwitchMetadata`/`commitAgentRunRuntimeSwitch`/`commitRunRuntimeSwitch` `launchSource`, `applySelectionToConfiguredMember`'s 4th parameter), defaulting to `settings` for the person's Save.
  - The automatic switch records `automaticSwitchLaunchSource(cause)`. For `model_router` the router's reason is the choice reason, with task kind "runtime switch".
  - `node_fallback` is added wherever `agent_history` was:
    - origins, schema list, contracts DTO and dist;
    - `DecisionLaunchSource`, decision log, statistics;
    - `ORIGIN_LABEL` "chosen by the node";
    - C-2/cause `chosenBy`;
    - the marker ("Chosen by the node.");
    - web types, colours, labels (en, zh-CN).
- **Tests:**
  - unit: chooser tiers, resolver node fallback, the R-18 text, the commit source, the Team member source, node launch history, marker and cause parsing;
  - E2E: UL-05 now makes nothing usable (AutoByteus' model server down, every AGY model used up); new UL-09 (no history → `node_fallback`, recorded in the launch source and the marker); UL-01 and ULP-01 check the recorded launch source.
- **Evidence:**
  - `IMP-11` (server unit: 1103 files pass);
  - `IMP-12` (integration: 92 pass);
  - `IMP-13` (web and contracts pass);
  - `IMP-14` (built-server E2E 9/9);
  - `IMP-15` (two-server E2E pass).

## Review receipt — CRR-002 Pass (9.4/10)

- **Result:** code review round 2 passed. CR-646-01, -02 and -03 are resolved (report `code-review-report.md`, commit 5dba382563). The package went to API/E2E. Nothing is owed by implementation.
- **Accepted by the reviewer:** task kind "runtime switch" for a router-chosen switch's launch source (R-19).
- **Reviewer's minor note, not a finding:** when the runtime report can't be read at all, the chooser answers `no_fallback`, and the notice's "No other runtime can run now" is then unverified. It is rare and logged.

## IR-003 — Base refresh: merge of origin/personal (Local Fix requested by delivery)

- **Trigger:** delivery round 1 was blocked by a merge conflict with origin/personal, 125 commits ahead (release-deployment-report.md).
- **Merge commit:** `3a541e3d45`. It merges origin/personal at `8517441116` into the branch at `bd800a81c6`.
- **Conflict:** one hunk, the imports of `autobyteus-server-ts/src/compositions/build-studio-server.ts`.
  - Resolved by keeping both: this ticket's `composeRunEvents` and autobyteus-516's extensions imports (`composeExtensions`, `ExtensionManager`, `readExtensionCatalogSource`, `thisPlatform`, `isDesktopEmbeddedNode`).
  - The file is at 495 non-empty lines.
- **Start and close order checked:**
  - Run events are composed before the run supervisor (the detector joins the notice fan-out), and switching starts after Model Routing.
  - Extensions are composed after the update notifications, from `<appData>/extensions`, which is independent of `run-events/` and `model-routing/`.
  - On close, extensions stop first and the run events release after Model Routing. Neither depends on the other.
- **Auto-merged files checked:**
  - `src/services/server-settings-service.ts`: the usage-limit setting registration stays beside the base's new settings.
  - `autobyteus-web/generated/graphql.ts`: `codegen:check` says it is current.
  - `autobyteus-web/docs/settings.md` and `autobyteus-server-ts/docs/modules/README.md`: both sides' rows are kept.
  - `tests/unit/remote-collaboration/{running-agents-messaging,standalone-remote-delegation,team-remote-delegation}.test.ts`: this ticket's fakes are kept.
- **Validation on the merge:**
  - `evidence/IMP-16`: server and web typecheck PASS (server tests at baseline 972), `codegen:check` current, server unit suite 1113 files pass.
  - `evidence/IMP-17`: built-server E2E UL-01 … UL-12, 12/12.
  - `evidence/IMP-18`: two-server E2E ULP-01 and ULP-02, 2/2.
- **Production code:** no change beyond the merge resolution.
