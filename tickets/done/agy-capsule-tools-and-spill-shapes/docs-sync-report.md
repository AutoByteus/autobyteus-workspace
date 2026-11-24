# Docs Sync Report — agy-capsule-tools-and-spill-shapes (Task autobyteus-588)

## Scope
- Ticket `agy-capsule-tools-and-spill-shapes` (Small, Low, direct route; SR-002: the tools list stays, a drift warning is added). Base `origin/personal` @ `19e4dce128` (not advanced). Verification: `evidence/DEL-01-post-integration-checks.md`.

## Why Docs Were Updated
The capsule's tool allowlist keeps the CLI's registry names (never the three aliases), and a run start now logs one warning when the CLI's start message lacks a listed name.

## Long-Lived Docs Reviewed
| Doc | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | No change by delivery (updated in the ticket) | the eight registry names, why the aliases are never listed (a list naming both a name and its alias does not start: `tool name conflict`), and the `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<id> names=<list>` warning, which never fails or delays the start; checked against `agy-native-tool-policy.ts` (`agyNativeToolsMissingFromRegistry`) and the factory's `console.warn` (run first, names second) |
| `TESTING.md` | No change | it describes the scripted CLI fixture without listing its knobs; the new `AGY_FAKE_INIT_TOOLS` knob and its default (the eight registry names) are documented in the fixture itself |
| `DESIGN.md`, `RELEASE.md` | No change | no rule touched |

## Discrepancy recorded by the reports
- The requirements doc writes the warning with `names=` before `run=`; the code and the module doc have `run=` first. The module doc is right and nothing outside the requirements doc depends on the order. The requirements doc is the Solution Designer's; I did not change it.

## Docs Updated
None by delivery. New artifact: `release-notes.md`.

## Delivery Continuation
Result `Pass`. FU-1 (`agy-tps-cli.mjs` still emits `init.tools: []`: log noise only) is in `follow-ups.md`; the Solution Designer sends it.
