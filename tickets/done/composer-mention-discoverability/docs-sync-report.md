# Docs Sync Report — composer-mention-discoverability

## Scope
- Trigger: API/E2E Pass API-REV-001 / IR-001 / SR-005, first delivery round DR-001.
- Classification: task_size=Medium; architectural_risk=Low; Direct Low-Risk.
- Bootstrap and integrated base: origin/personal `e04cfef23550c3b78286a53befc6bd5d71fb1061`.
- Integrated candidate: codex/composer-mention-discoverability `74762c9f5c0d1b32560138c4656873e9d63ae7c5`.
- Refresh: `git fetch origin personal`; `git merge origin/personal` → Already up to date (0 incoming commits). No checkpoint needed.
- Verification: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/composer-mention-discoverability/delivery-evidence/integration-refresh.log. No executable rerun needed because fetched base and candidate runtime/tests are exactly the API/E2E-validated state; delivery edits are Markdown/artifacts only.

## Why Docs Were Updated
Canonical Chat docs still described the deleted top chip row and its remove button, failure “chips”, and a target-name input cue. Replace stale user/developer understanding and promote native renderer ownership and regression command into the concern doc, not a competing Product UI spec.

## Long-Lived Docs Reviewed
| Doc | Result | Rationale |
| --- | --- | --- |
| autobyteus-web/docs/chat.md | Updated | Canonical live-run composer discovery, selection, native edits, failure recovery, removed component and browser coverage |
| autobyteus-web/docs/agent_execution_architecture.md (draft/attachment ownership sections) | No change | Current per-context draft and attachment lifecycle remains unchanged; no new state/persistence authority |
| autobyteus-web/README.md (testing/probe sections) | No change | General test commands remain valid; scoped probe documented in canonical Chat test catalog |
| autobyteus-web/ARCHITECTURE.md (testing overview), TESTING.md, autobyteus-web/AGENTS.md | No change | Existing colocated + renderer probe path still applies; no Electron/architecture/release-process change |

## Docs Updated / Durable Knowledge Promoted
- /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/autobyteus-web/docs/chat.md: exact English/zh-CN native cue and capability priority; no-scope/New Chat and actual skill capability preserved.
- Same doc: known chosen definition identity remains separate from native text; active filter governs highlight/send; delete/name edit deactivate, exact restoration/undo reactivate only prior choices. Failed admission retains text/definitions/attachments.
- Same doc: escaped noninteractive aria-hidden mirror, sole native editor, shared metrics/client scroll/ResizeObserver lifecycle, forced-color outline and context-local projection. No rich-text/persisted spans/migration.
- Same doc test catalog: durable `test:e2e:composer-mention-discoverability`, prerequisites, owned cleanup and doubled endpoint/transport boundaries; not provider/full-desktop/real OS IME certification.
- Sources: design-spec.md A-001–010/DS-001–005, implementation-handoff.md IR-001, api-e2e-execution-coverage-report.md API-REV-001; actual integrated production source is primary truth.

## Removed / Replaced Components Recorded
`MentionChipRow.vue`, `RunMentionChip`, `runMentionChipsOf`, `removeRunMentionChip`, `removeMentionFromText` and chip-removal locale label removed. One native inline chosen-token highlight replaces only the duplicate row; menus, selected metadata, skill chips, Context Files and sent/history rendering are retained. Removal and new authority documented in Chat.

## Verification / Continuation
Docs sync Pass; `git diff --check` passed. Runtime/coverage source unchanged by Delivery. No-impact decision N/A (real docs impact corrected).
Independent architecture/source/test review artifacts N/A — not applicable, direct route; no review Pass fabricated.
DR-002 continuation Completed: explicit UV-001 acceptance, unchanged fresh target, archive/commit/push/merge/push and safe task cleanup; release explicitly Not required. No upstream ambiguity/product defect found; user verification hold is not a finding requiring reroute. UI-CLOSE-001 honored; DATA-001/BASE-002 remain externally deferred.

Delivery-only pre-verification checks: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/composer-mention-discoverability/delivery-evidence/pre-verification-checks.log (diff hygiene, two probe syntax checks, temporary pages absent, inventory paths present; not a functional test rerun).
