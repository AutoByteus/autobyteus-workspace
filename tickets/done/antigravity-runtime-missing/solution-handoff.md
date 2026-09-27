# Architecture Design Complete — Antigravity Version-Independent Simplification

Package: `antigravity-runtime-missing`; current SR-003. Requirements **Approved**, design **Ready**. `task_size=Medium`, `architectural_risk=Low`.

## Request / Approved Outcome
Original user: missing Antigravity runtime in desktop team selector; investigate/reproduce/fix using frontend and Electron backend. Investigation found installed CLI 1.2.12 rejected by exact 1.2.11 gates. User then explicitly requested “completely remove the hard coded versions in the source code ... work on it please” and “simpolify the code”. Remove all AGY release-version gating and obsolete profile plumbing, not add a version to a list. Preserve required capabilities, model discovery, eight-tool allowlist, identity/permission/restore/data behavior and other runtimes. UI visibility redesign is NOT approved/in scope.

## Workspace / Base / Finalization
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing
- Branch: codex/antigravity-runtime-missing
- Refreshed base at bootstrap: origin/personal 82f3359cb9b98f0a5caa0dad79e24e9a58801a46
- Finalization target: origin/personal, Delivery Engineer-owned after gates. No release/install action yet.
- Source unchanged by designer; only untracked ticket artifacts. Dependencies installed offline ignoring scripts. Shared checkout and running installed app/backend untouched. Investigation frontend stopped.

## Evidence / Design
Actual installed AutoByteus 1.4.89 Electron server on port 29695 returned disabled AGY with unsupported diagnostic. Source has exact-version checks in capability probing/discovery and native tool profile. Frontend hides unselected disabled entries. Shell CLI models + bounded real custom-agent NDJSON COMPAT-OK probe pass on 1.2.12; full run/restore/UI correction is NOT yet verified. Browser control failed after frontend loaded; no fresh selector screenshot claimed.

Design: collapse capability/model discovery into existing `listAntigravityModels`, eliminate `--version` admission and unused probe/discover APIs; export unchanged native tool-name constant, capsule owns its use; remove profile DTO/argument/threading; factory uses existing assertAvailable for new/restore. No new files/framework/registry, no frontend changes. Preserve capsule manifest schema version and stored snapshots. Update focused tests and current docs, not historical evidence. Removing CLI version metadata affects no persisted fields.

## Canonical Artifacts (read before work)
- /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing/tickets/in-progress/antigravity-runtime-missing/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing/tickets/in-progress/antigravity-runtime-missing/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing/tickets/in-progress/antigravity-runtime-missing/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing/tickets/in-progress/antigravity-runtime-missing/solution-revision-record.md
- Factual supplements: complete inventory and original screenshot absolute path in investigation notes; evidence directory under same ticket. Prior `investigation-result.md` is superseded historical approval-hold result.
- Architecture/code review artifacts: N/A — not applicable to Medium/Low direct route. Product/UI prototype artifacts: N/A — not requested.

## Constraints / Risks / Expected Work
Implement approved bounded simplification, run focused checks/build, preserve honest regression coverage and produce implementation handoff for independent API/E2E validation. Use branch-built isolated backend to prove fix; unchanged packaged Electron backend will still reject. Do not patch installed resources/restart active user runs. Existing live tests contain old ticket-specific artifact outputs: adapt/use current evidence destinations, do not overwrite finalized histories. Versions in test fixtures are acceptable regression stimuli, not production compatibility policy; don't purge dependency pins/schema versions/history indiscriminately.

Escalate if actual allowed tools, protocol, persistence or ownership must change. Future provider incompatibilities can still fail real checks; no promise of universal upstream compatibility. No outstanding user product decision for this scope.

Routing: pending rule lookup; select single most-specific applicable route, then record confirmation. This is not a claim that code is already fixed.

Rule lookup applied: Architecture Design Complete + Medium + Low selects direct implementation recipient `/implementation_engineer`. Independent architecture review N/A. No other rule matches. Sending this same absolute file as reference; confirmation recorded after tool success.

Handoff confirmed: send_message_to returned accepted=true, code=DELIVERED to `/implementation_engineer`, target_agent_run_id `implementation_engineer_1aff5420d7eb42d48839959e95ba8e80`. Solution Designer stops; implementation owner continues. No duplicate forwarding.
