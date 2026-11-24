# Handoff Summary — stopped-run-unavailable-model (Task autobyteus-53)

## Ticket
- `task_size=Medium`, `architectural_risk=High`; reviewed route (architecture ARCH-REV-002 Pass, source CRR-002 Pass 9.4, API/E2E API-001 Pass 95.3%, test-code CRR-003 Pass). SR-006. Archived at `tickets/done/stopped-run-unavailable-model/`.

## What Changed
- **Problem:** a stopped native (AutoByteus) run on a model that is gone (for example removed from LM Studio) had an empty model menu and refused every Save, because a same-session change cannot go to a smaller or unknown context window.
- **Rule (the user's):** the model the session last ran on is the reference. Both capacities verified and the new one equal or bigger → same session. Otherwise (smaller, unknown, or the old model gone) → the Save makes a **model hand-over**: a pending switch on the same agent runtime. The next message starts a fresh session on the new model, carrying the hand-over notice and the marker "Model changed from … to …", and continues from the work journal.
- **Server:** `RunModelSelectionService` decides the `continuation` (`same_session` / `hand_over`) once, from the reference model and the record's `handOver` capability (`available`, `unavailable`, `no_session`). `applyRuntimeSelection` applies it instead of inferring it from the runtime. All three save paths (standalone and delegated copies, Team, Org) and both options paths use it. A run that cannot hand over (peer-started, application- or system-owned) is still refused with today's message (AC-009). A scope with no session (a Team's or Org's default launch, a never-started run) accepts any offered model.
- **Fix found by review (CR-001):** the Org container writer dropped the session ID, so every Org member model save threw; fixed in `0c58796856`.
- **Web:** the native help text (en, zh-CN) and the standalone Save message describe the rule.
- **Tests:** a new built-server suite (`native-model-handover-built-server.e2e.test.ts`, MH-01..MH-06) and three stale Org-member switch suites repaired in their own commit (`cef4f79481`, TESTING Rule 9).
- **Docs:** `GLOSSARY.md` (ticket) and nine long-lived docs synced by delivery (`docs-sync-report.md`).

## Integration
- Base advanced `1f761bc8db` → `27a08a1794` (autobyteus-588 and autobyteus-377, Antigravity). Merged into the ticket branch (`89d890796a`) without conflicts. On the merged state: server typecheck PASS (production 0 errors, tests 972 = baseline), web typecheck PASS (tests 86 = baseline), server rebuilt, and the built-server suites `native-model-handover` (6) and `agy-switch-back` (3) pass 9/9 (`evidence/delivery/DEL-01-*`).

## Verification
- From the evidence: AC-001..AC-010 proven (execution report's Acceptance-Criteria Proof; MH-final.log, mutation checks, the repaired switch suites, the merged-state rerun). The rendered Settings menu and help text were not rendered by any stage.
- **AC-011 (the user's check on a beta): waived by the user.** The user decided on 2026-11-24, in the Solution Designer conversation: "And no need I trusted API e2e engineer okay because I'm sure there's no need to because our software factory has 100% reliability no need its done". The API/E2E evidence (API-001 Pass, 95.3%) stands in for it. Not checked by anyone, and so not proven: the rendered Settings menu and the new help text (en, zh-CN), and a run on the user's own LM Studio. Everything else is proven by the built-server suites.
- No accepted unverified-risk decisions (`DEC-*` evidence decisions): none.
- Residual risks: a delegated copy's native hand-over is covered only by the existing copy suites and unit tests; the isolated desktop instance cannot use the scripted LM Studio endpoint.

## Release
- `No release` by this delivery: with the user's check waived, I cut no tag and the guide's default is no release. `release-notes.md` stays ready for a later stable.
- The change is nevertheless in the beta **`v1.5.14-beta.10`** (GitHub pre-release, published 2026-11-24T04:13Z). It was cut by the separate release ticket `release-v1.5.14-beta.10` (autobyteus-629) from `personal`, after this ticket's merge `e5d878832b` (`git tag --contains` confirms it). That release's record says Codex was waived by the founder; its own report holds its pipelines and assets. I did not verify that release's pipelines.
- My pre-tag smoke run on the merged state: Claude, Grok, Antigravity and AutoByteus passed; Codex failed on the account's usage limit (resets 2026-11-27), not on code.

## Follow-ups
- FU-001 (not urgent): LM Studio models carry no verified capacity in the rule's catalog, so an LM Studio → LM Studio edit always hands over, even to an equal or bigger model. This meets the user's rule. The Solution Designer sends it.
