# Docs Sync Report — autobyteus-313 (Model Router: standard launch selector)

## Scope

- Ticket: `model-router-standard-launch-selector` (Project Task autobyteus-313, follow-up FU-012 of autobyteus-32)
- Trigger: API/E2E API-REV-001 Pass on the direct route (Medium / Low)
- Bootstrap base reference: `origin/personal` @ `1c54ffec6a`
- Integrated base reference used for docs sync: `origin/personal` @ `1c54ffec6a` (not advanced; the branch was already current)
- Post-integration verification reference: `evidence/delivery/DEL-01-clean-clone-proof.log`

## Why Docs Were Updated

- Summary: the implementation updated the docs this change affects, and delivery checked them against the code.
  - `model_routing.md`: the new `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG` key, the launch check on save, the rule that any change of runtime, model or model settings starts a new router run, and the extended `setModelRouterLaunch`.
  - `settings.md`: the Configuration tab with the app's launch controls, and the names the page uses.
  - `docs/design-cases.md`: Case 13.
- Why this should live in long-lived project docs: the router's launch now follows the same rules as any agent's launch; future changes to the launch controls apply to it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/model_routing.md` | Settings, router run, GraphQL | No change (implementation's update verified) | Matches `model-routing-settings.ts`, `model-router-agent.ts` and the GraphQL type; old settings read as "no settings" (API-03) |
| `autobyteus-web/docs/settings.md` | Configuration tab, names | No change (implementation's update verified) | Matches the rendered page (`IMP-05-rendered`): `ChatModelMenu`, thinking control, "claude-sonnet-5-5 Claude SDK", "Claude Agent SDK" |
| `docs/design-cases.md` | Case 13 | No change | Accurate |
| `GLOSSARY.md` (Model Routing) | "Model Router agent", "Launch choice" | No change | Still accurate; the router's launch is the ordinary launch configuration |
| Other docs that mention `setModelRouterLaunch` or `routerLaunch` | — | None found | `git grep` outside `tickets/` finds only the two docs above |

## Docs Updated

None by delivery. The implementation's updates are listed above.

## No-Impact Decision

- Docs impact for delivery: `No impact`
- Rationale: the implementation's doc changes already describe the final behavior, which delivery checked against the code and the evidence; no other long-lived doc describes the router's launch.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: clean-clone proof, archive and finalization
