# Investigation Result — team-reload-stale-member-instructions

## Outcome
Investigation Complete; requirements Ready for Approval, SR-002 (unchanged intended-behavior baseline SR-001). Not Architecture Design Complete, not implementation-ready, no fix applied. This is a routine user approval hold, not an external blocker.

## Original Request / Goal
Investigate why English Bridge Team's Worker still displays previous agent.md instructions after Agent Package Creator updates the public package and the user clicks Agent Teams Reload.

## Finding
Public Worker source really is updated to `Work on the request you receive.`, description `Works on received requests.`, 6 tools. Supplied UI shows old instructions, old description and 8 tools. Agent Teams Reload refreshes backend catalogs but queries/publishes only Team definitions in the frontend. Worker content comes from a separate previously loaded Agent definition snapshot; Team/member detail fetches skip refreshing a nonempty Agent catalog. Thus updated Team and stale Worker coexist.

An investigation-only probe executes unchanged real store source with real Pinia/Vue and a controlled Apollo boundary. It asserts this exact split, confirms only Team mutation/query occur after edit, and confirms an explicit network-only Agent read returns/publishes the current Worker. Subsequent user-requested real-app experiment reproduced the full sequence in unchanged-worktree packaged AutoByteus using native UI browser/computer tooling and real isolated HTTP. Team v2 became visible while Worker retained v1 instruction/description/tools. Existing Agents Reload control made same Worker current without source patch/restart. See browser-reproduction-report.md and evidence/ui-observation-excerpts.md/API snapshots. Exact installed production binary/registration was not exercised.

## Proposed Scope / Approval
Make one successful Agent Teams Reload refresh both Team and member content before subsequent inspection; preserve identity/ownership/visibility/source files/saved runs and existing loading/failure/retry UI. No watcher, visual redesign, package rewrite, live-run instruction update, GitHub download policy, schema or migration change. See REQ-001–003 / AC-001–004 in canonical requirements. User approval pending; no supplement changes intended behavior.

## Canonical Artifacts
All absolute paths share ticket root:
`/Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/`
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/requirements-doc.md — intended behavior, Ready for Approval.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/investigation-notes.md — evidence E-001–E-011, supplied screenshot/source paths, limitations and supplement inventory.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/solution-revision-record.md — SR-001.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/investigation-result.md — this full result.
- evidence/store-cache-probe.cjs and store-cache-probe.log — controlled store reproduction.
- evidence/worker-source.md, worker-source-config.json, creator-simplification-result.md, source-pins.txt — snapshots/pins.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/browser-reproduction-report.md — real app reproduction, assertion/control outcomes, isolation and cleanup. All new supplemental paths are listed there and in investigation notes.
- design-spec.md / independent architecture review / implementation/code review/API-E2E/delivery artifacts: N/A — phases not entered.
- Product artifacts: N/A — not requested.
External public source: /Users/normy/autobyteus_org/autobyteus-agents/agent-teams/english-bridge-team; exact creator receipt and all four screenshots linked in investigation notes.

## Workspace / Constraints / Risks
- Isolated worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions
- Branch: codex/team-reload-stale-member-instructions
- Base: refreshed origin/personal d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b
- Prospective finalization target: origin/personal; not authorized/performed now.
- Do not test or write to user's running app/data. No production/package implementation changed. Reporting/evidence only; shared unrelated changes untouched.
- Approval absent. Final task-size/risk classification deferred to completed post-approval design, not guessed from investigation.
- Open uncertainty: user's installed binary/source registration not independently verified. Real unchanged-worktree packaged-app reproduction is now complete; post-fix regressions await approved work. Test instance iso-53752-8cc8 stopped successfully; own temporary data removed and ports released. No user process/data touched.

## Next Expected Action
Return concise findings to user and request explicit approval for the narrow correction. If approved, perform architecture investigation/design, completed-design classification and rule-based routing. Do not hand off implementation prematurely.

## Routing
2026-10-03: get_handoff_rules succeeded. Returned routes concern completed approved architecture (Large/High → /architecture_reviewer; Small or Medium/Low → /implementation_engineer) or delivery-receipt evidence gaps (→ /delivery_engineer). None matches this investigation result / routine pending requirements approval. No message or delegation sent; return findings and approval question to user.

## Updated Expected User Result (SR-002)
Confirm real UI reproduction, not merely a code hypothesis. Explain separate stale Agent snapshot, and report verified temporary workaround: Agents → Reload, then reopen Worker through its Team. No code change/fix approval inferred from requests to experiment. Rule lookup pending for this evidence refinement; prior lookup had no matching route.

## SR-002 Routing Outcome
get_handoff_rules succeeded after updated result persistence. Same three rules returned: approved completed architecture Large/High → architecture reviewer, Small/Medium Low → implementation engineer, delivery receipt evidence gaps → delivery engineer. None matches evidence-only investigation with unapproved fix scope. No handoff sent. Return confirmed experiment result to user; stop investigation work.
