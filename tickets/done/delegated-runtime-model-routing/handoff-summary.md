# Handoff Summary: delegated-runtime-model-routing (autobyteus-32, Model Router core)

- Status:
  - Verified from the evidence, archived and finalized on `personal`.
  - Released as beta **v1.5.9-beta.11**, as the user asked. Final state in `release-deployment-report.md`.
  - **The user's own desktop-app check is still open.** The Task's "Done when" requires it, so it is not optional. The terminal receipt waits for it.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review: ARCH-REV-001…004 (Pass on SR-017/018).
  - Code review: CRR-006 Pass, 9.4/10; the test reviews CRR-005 and CRR-007 both passed.
  - API/E2E: API-REV-003 Pass, 95%.
- Revisions: SR-018 / ARCH-REV-004 / IR-004 / CRR-007 / API-REV-003 / DR-001.

## What Changed

- **Model Routing**, a node switch, off by default: Settings → Model Routing → Configuration.
  - While it is on, each agent of a new delegated copy gets a launch in this order: its own default, the team's default, the **Model Router**'s choice, the delegating run's launch, or a refusal that says why.
  - A default that cannot run now (signed out, or its model blocked by a used-up limit) is skipped, with a note.
- **The Model Router** is a built-in, internal agent: one long-lived run per node, in its own internal workspace, on the runtime and model the user picks.
  - It reads the node's runtimes and limits (autobyteus-303) and its own `knowledge.md`, which the user teaches through "Talk to the router".
  - It answers with `submit_launch_choices`. It has no collaboration tools.
  - It runs like any auto-approved agent, with no special sandbox; the user decided this in SR-018 (RSK-006).
- **One routing at a time**, within a 40 s budget. A busy, silent or failed router falls back visibly, with the reason.
- **Visible choices:**
  - the `delegate_task` result lines;
  - run Settings rows showing source, task kind and reason, with "View decision";
  - Model Routing → Decisions (by Task, with a filter) and Overview (sources, and runtimes per task kind).
- **Across nodes:** a peer routes with the Task, sends its launches back, and states its Model Routing state when it refuses. A start request waits up to 50 s.
- **Code commits:** IR-001 `d384968700`, `930597c730`, `4979559f7f`, `0cdaa0d480`; IR-002 `161d136c1b`, `03d9860e82`; IR-003 `424e9bdd62`; IR-004 `f48af0176a`.
- **Tests and live-agents fold:** the 303 live-agents fold `bd8948ef14`, `33da12b821`, `75ca9c82ff`; API/E2E `64e5b57932`, `bf4dabf99c`, `9e8ac5e423`.
- **Docs:**
  - By the implementation: `model_routing.md` (new), `settings.md`, `GLOSSARY.md`, `collaboration_model.md`, design case 11.
  - By delivery: `remote_collaboration.md`, `agent_tools.md`, `agent_definition.md`, `workspaces.md`, `agent_runtimes.md`, the `settings.md` tab names and test listings (`docs-sync-report.md`).

## Integration

- Merged `origin/personal` `50e93c2108` (98 commits) as `357936966c`.
  - The base brought embedded browser history, backend port recovery and native command shutdown, MCP secrets, and beta.10.
  - One conflict: `docs/design-cases.md`. Both cases were kept; this ticket's case is now Case 11.
- Post-integration found **DEL-F1**:
  - The base's web copy of the built-in agent IDs lacked the Model Router. While internal agents were shown, a draft `@` list would offer it and the server would refuse it.
  - The same round fixed **DEL-F2**: hints said "Setup" where the tab reads "Configuration".
  - Both were fixed in IR-004 `f48af0176a`, reviewed in CRR-006, and revalidated in API/E2E round 3.
  - Delivery reran the contract test and 30 web tests, and all three guards pass.
- `origin/personal` did not move again before the merge.

## Verification From Evidence

- All critical ACs are proven. The table is in `release-deployment-report.md`. Highlights:
  - MR-01…09 on the merged code: delivery's run 9/9 and round 3's run 9/9.
  - RC-39…41: 41/41, twice.
  - Docker peer: D-1…D-4.
  - Live router on Claude, Codex, Antigravity and AutoByteus in round 3, and Grok in round 2: it learned the owner's rule and routed by it, with no collaboration tools.
  - Page probe MRD-01…08, with no browser errors.
  - The merged desktop build's smoke, run by delivery and again in round 3.
- **The user's check (Done-when) is required.** Beta v1.5.9-beta.11 lets the user do it in their own desktop app: turn on beta updates, then follow `evidence/api-e2e/API-15-desktop/API-15-user-desktop-check.md` from step 1. The isolated `--from-worktree` start also still works.

## Known, Not Blocking

- Failures that are the same on the clean base, and so not from this ticket:
  - **FU-010:** 3 server unit tests.
  - **FU-006:** `definitionMutationCache.spec.ts`. It broke with autobyteus-308, whose web checks ran only the touched specs.
  - Electron port-recovery specs.
  - **FU-007…009:** E2E failures.
- Grok was not rerun live on the merged base: its account usage is used up (HTTP 429).
- **FU-011:** while the router's model is out of usage, the status still reads "active". Delegations still fall back with the reason.
- For Product:
  - The new text `settings.modelRouting.problem.signedOut`.
  - Copies are named by their address.
  - Decisions shows the model ID where Settings rows show its display name.
  - Internal identifiers still say `setup` while the product word is Configuration (optional cleanup).

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

FU-001…FU-004 and FU-006…FU-011. FU-005 is withdrawn (SR-018). Delivery added FU-010 and FU-011.

## Residual Risk

- **RSK-006:** the router runs unconfined with auto-approve and reads web pages, like any auto-approved agent. The user accepted this in SR-018.
- **RSK-003 / FU-002:** routing runs inside the root's gate, so other input of that root waits up to 40 s.
