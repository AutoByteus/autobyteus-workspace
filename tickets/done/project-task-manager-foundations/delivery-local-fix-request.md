# Delivery Local Fix Request

## Scope / State
- Package PROJ-TASK-MANAGER-20261002-001; DR-001 initial delivery result **Blocked — Local Fix**.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`; branch codex/project-task-manager-foundations; finalization target origin/personal.
- Incoming CRR-002 checkpoint `5e902fc1965f86fce2bfa15ed0a23e8ff8beb7bb`; clean, reviewed candidate already committed.
- Latest fetched origin/personal `5e3cb2f720e6fc80173099075daf55594ed58de9` merged 15 new commits using ort, no conflicts; local HEAD `a5123e7d08f66bbb08440340db167fa4ccb5eba0`. No checkpoint needed. No push/target merge/release/installation/profile/microphone change.
- Large / High / Reviewed unchanged; SR-015 / ARCH-REV-002 Pass / IR-001 / CRR-001 source Pass / API-REV-002 scoped Pass95.0% / CRR-002 test-code Pass retained as-of upstream. New integrated failures do not retroactively rewrite those outcomes.

## DLF-001 — Integrated mention test double has stale voice contract

Expanded renderer command exited1: **112 passed / 12 failed in 13 files (11 passed / 2 failed)**. All 11 mention tests failed, starting at the first test's unmount with `TypeError: voiceInputStore.cancelOperationForTarget is not a function` in `components/voiceInput/VoiceInputButton.vue:82`. Later null-wrapper/observer failures follow it; do not invent 11 independent production defects.

Read-only evidence:
- `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.runMentions.spec.ts:17–21` mocks cancelOperationForSource but not current cancelOperationForTarget.
- Current generic VoiceInputButton uses destination cancellation on unmount/target replacement.
- Sibling AgentUserInputTextArea.spec.ts has the target cancellation mock and passes in the same run.
- Latest remote mention tests used the prior composer voice contract. Automatic source merge preserved remote native mention behavior and this ticket's voice sink; fixture reconciliation was missing.

Implementation owner: reconcile the test double/caller contract proportionately, preserve all keyboard/native projection/observer assertions and real voice lifecycle coverage, and rerun the exact expanded command in `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/delivery-evidence/commands.json`. Do not weaken production lifecycle behavior to accommodate a stale mock. If a real source problem is found, classify/correct it explicitly through the normal route.

## DLF-002 — Extension integration fixture needs disposition

The same run's `tests/integration/voice-input-extension.integration.test.ts:236` failed (status error vs installed). Serial isolated rerun **1/1 Pass**, exit0; original failure retained. This is a repository-generated archive/fake worker, not actual microphone or installed Voice Input proof.

Read-only inspection: createWorkerArchive runs on every fixture HTTP request before the manifest SHA is calculated, including both manifest and runtime requests. Separate compressed archives can therefore diverge. This is a **plausible timing/hash cause, not proven attribution of the observed failure**; the first output did not expose the underlying install error. Upstream immutable-archive fix was in the separate Electron managedExtensionService fixture, not this integration fixture. Investigate/stabilize this fixture or provide a source-backed alternative explanation and successful full rerun. Do not erase the failure, remove the path or blame hardware capability.

## Evidence / Re-entry Constraints
- Fresh server **150/150 in20files**, shared preparation exit0; actual HTTP/default MCP/native/scoped bytes/aggregate coverage included.
- Logs `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/delivery-evidence/server-integrated.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/delivery-evidence/renderer-integrated.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/delivery-evidence/voice-fixture-isolated-rerun.log`; exact commands/exits `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/delivery-evidence/commands.json`; merge facts integration-refresh.json.
- Docs sync and user handoff stopped before the failed integrated state was offered for verification. Planned docs impact: server Projects/Agent Tools MCP, web Projects, canonical voice target/cancellation ownership, web catalog description.
- API-REV-002's retained browser16/16/package typed/detail/external-native-write→Refresh evidence is pre-integration, not newly certified integrated runtime proof.
- Real mic/device/permission/extension/transcript/live IPC remains **Not Tested — user-waived, independently UNVERIFIED**. AC-018 unchanged; no additional hardware test requested. Fixture transcript is not real voice Pass.
- Full VueTSC FAILED387 vs source-base388, initial full-message0added/1removed; latest no new sites/codes but existing websocket.ts:15:3 TS2322 message-shape origin partly unattributed. Not rerun here; no full Pass/suppression/blanket defect ownership.
- Earlier OOM/harness/raw whitespace results retained; browser proof not whole VIS/pixel/phone/capacity certification;120-rowTODO fixture modest correctness, mixed status separate.
- MP-004 Not Reachable, binding units guard-only; no switching coordinator/recovery/subscriptions. Manager/team/scheduler/run linkage/sidebar/stopping/client/skills/phone/default/installation excluded/deferred.
- Return corrected package through applicable Large/High review and validation; no bypass. Delivery resumes from completed base merge, refreshes current remote as needed, then docs/user verification/finalization.
