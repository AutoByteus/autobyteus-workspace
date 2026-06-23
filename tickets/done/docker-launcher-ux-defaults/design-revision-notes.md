# Design Revision Notes — Architecture Review Round 1 Findings

Date: 2026-06-23
Owner: solution_designer
Trigger: `design-review-report.md` round 1 decision `Fail / Design Impact`.

## Findings Addressed

### AR-DI-001 — Missing mandatory task design health assessment
Resolution: Added `Task Design Health Assessment` to `design-spec.md`.

Added coverage:
- explicit change posture: launcher UX behavior change with targeted local refactors, no broad subsystem redesign;
- evidence-backed root-cause classifications for install PATH UX, sequential port allocation, retry invariant, read-only discovery defaults, and mutating-command safety;
- concrete refactor/no-refactor decision tied to affected files/functions;
- residual-risk rationale tied to shell profile writes, port availability, retry behavior, and all-node read-only output.

### AR-DI-002 — Sequential port retry policy under-specified after Docker bind failure
Resolution: Revised `design-spec.md` section 2 and `future-state-runtime-call-stack.md`.

Added coverage:
- `choose_ports_for_node(node_name, allow_friendly_preferences)` interface;
- first allocation uses node-index friendly preferences;
- after bind/run/start failure, `start_node` clears selected ports and sets `allow_friendly_preferences=0`;
- retries pass empty preferred values into `pick_port`, preserving the old invariant that bind-failure retries do not keep selecting the same preferred/default port;
- test guidance for bind-failure retry coverage.

## Files Updated
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults/design-spec.md`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults/future-state-runtime-call-stack.md`

## User Clarification Added After Round 2 Resubmission

The user clarified that installer output should provide concrete nvm/Anaconda-style copy-paste commands to make the install directory available in the shell by default. Updated `requirements.md` and `design-spec.md` to require current-shell export plus persistent shell-profile commands such as guarded `grep ... || echo ... >> ~/.bashrc` and `source ~/.bashrc` when automatic profile update is skipped/unavailable/fails.
