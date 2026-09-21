# Personal nested-Team comparison — ORG-STOPPED-CONFIG-20260917-001

Source-only reference: recorded origin/personal 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793. No claim that all personal versions are identical or that an old binary was run.

| Concern | Original nested Team | Selected Org adaptation |
|---|---|---|
| Settings | ExistingRunConfigEditor loads canonical root draft, explicit Save, inactive gating | Focused Org member panel obtains canonical Org-owned member settings and explicit Save; active inspection remains locked |
| Target | recursive configured Team/Agent addresses, not task instances | direct configured Agent or one mounted flat Team Agent, compound Org/address/Agent identity |
| Validation | RunModelSelectionService: same runtime, verified equal/larger capacity for replacement, schema validation | Reuse exactly this service and existing UI selection/schema fields |
| Persistence | root manager serializes lifecycle and saves root tree with atomic result/readback | Org manager owns its existing transition lane and Org tree write; no standalone manager bypass |
| Return | canonical result/reload on uncertainty | canonical selected-member config-only publication, identity/generation guard; no conversation replacement |
| Broader editing | root/nested Team defaults and linked-child propagation supported | Not copied: approved request is focused Agent model configuration, no bulk defaults/task editor |

The useful original design principle is root-owned durable configuration with explicit leaf identity, not nested container code itself. Current Org runtime ownership remains separate and flat Team semantics remain intact. Source paths and validation limits are in investigation-notes.md. User's follow-up confirms this functionality already exists for Team; no new model-compatibility policy is introduced.

## SR-006 correction: Plus configuration inheritance
The original DS-001 deliberately preserved definition-only Org Plus, which was narrower than the later clarified user expectation. That decision is superseded by approved SR-004/SR-005; not retroactively covered by earlier review. Pinned personal TeamWorkspaceView.createNewTeamRun invokes buildEditableTeamRunSeed(configuration view), installs editable config and clears selection. DS-REV-002 adapts configuration-only projection to Org canonical inspection, parent-relative root/Team/Agent overrides and new draft owner. Preserve UX, not nested runtime objects/history. F-002 model-required versus unavailable is a separate bounded diagnostic correction. This remains source comparison, no original binary replay.
