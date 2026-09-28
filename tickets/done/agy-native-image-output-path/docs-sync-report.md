# Docs Sync Report — agy-native-image-output-path

## Scope

- Ticket: `agy-native-image-output-path`
- Trigger: Code review CRR-002 passed (API/E2E test-code review). The package was ready for delivery.
- Classification (preserved): `task_size=Small`, `architectural_risk=High`, route `Reviewed`
- Bootstrap base reference: `origin/personal@fcd3e83a4`
- Integrated base reference used for docs sync: `origin/personal@fcd3e83a4`. It was re-fetched on 2026-09-28, had not advanced, and is an ancestor of the ticket branch.
- Post-integration verification reference: `delivery-evidence/delivery-unit-smoke.log` (106 passed / 5 live-gated skipped), `delivery-evidence/delivery-tsc.log` (`tsc -p tsconfig.build.json --noEmit` exit 0), run on checkpoint `315d6f30e`.

## Why Docs Were Updated

- Summary: The canonical AGY runtime doc stated that AutoByteus "does **not** find/copy/serve/index/render/retain image bytes or paths" for native `generate_image`, and that DONE yields `output: null`. It also implied that native image arguments were hidden. The implementation now resolves AGY's reported path from AGY's persisted step output, surfaces `file_path` and the output text, projects one Artifacts entry, and shows the parameters. The doc was therefore stale and contradicted the delivered behavior. The code review had assessed docs impact as `No`. Delivery corrected that assessment after reading the doc against the integrated state.
- Why this should live in long-lived project docs: The step-output lookup relies on undocumented AGY internals and a security-relevant containment policy. It also emits a named operational warning with reason codes. Future maintainers and operators need that contract, the fallback semantics and the drift detectors outside the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Canonical AGY runtime contract, including native `generate_image` semantics | Updated | The native-image paragraph was rewritten |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Generated-output → FILE_CHANGE → content-route flow | No change | Generic flow already covers `generate_image` producing an output path; no runtime-specific exclusion |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Known generated-output tools list | No change | Already lists `generate_image` |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | AGY references | No change | Links to the AGY runtime doc only |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend AGY rendering summary | No change | Still accurate: the backend converts steps and the frontend renders canonical events. No frontend change |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior correction + runtime knowledge promotion | Replaced "no path / `output:null` / AutoByteus never finds paths" with: public parameters; the step-output reader location and policy (≤16 KiB bounded read, no final-symlink follow, `Generated image is saved at` parse, regular non-symlink file with realpath containment in the conversation brain dir); the result shape `{provider_state, output, file_path}`; the single `generated_output` Artifacts entry via the shared pipeline; the fallback to `output:null`; the `AGY_NATIVE_IMAGE_PATH_UNRESOLVED` warning with all reason codes; the never-throw guarantee; the AGY 1.2.12 validation scope; and the gated live e2e drift detectors | Doc contradicted the delivered behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Native image path resolution | AGY's stream omits the path. AutoByteus reads AGY's own step output under the conversation brain dir and accepts only a contained, regular, non-symlink file | `design-spec.md`, `investigation-notes.md` (E-004..E-010) | `antigravity_cli_runtime.md` |
| Fallback + diagnostics | Unresolved stays a successful tool call with `output:null` and logs a content-free warning with reason codes | `design-spec.md`, `code-review-report.md` | `antigravity_cli_runtime.md` |
| Layout-drift risk | Undocumented layout, validated only on AGY 1.2.12; the gated live e2e tests are the detectors | `solution-revision-record.md` (SR-002), `api-e2e-execution-coverage-report.md` | `antigravity_cli_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Hard-coded native image DONE result `{provider_state:"DONE", output:null}` | `nativeImageResult(stepIndex)` resolving via `agy-step-output-reader` | `antigravity_cli_runtime.md` |
| Native `generate_image` arguments forced to `{}` | Provider `parameters` passed through as public arguments | `antigravity_cli_runtime.md` |
| Doc statement "AutoByteus does not find/serve image paths" | Contained step-output lookup + shared Artifacts projection | `antigravity_cli_runtime.md` |

## No-Impact Decision

N/A. Docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Write the handoff summary and hold for explicit user verification.
- Notes: The upstream docs-impact verdict (`No`) was superseded by delivery. No design or requirement impact: the doc now describes exactly the approved and reviewed behavior.
