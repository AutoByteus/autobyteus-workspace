# Aggregated Validation

- stage: 6
- overall-status: Failed then Re-entry (Local Fix)

## Scenario Results (Run 1: tag `v2026.02.26-personal-desktop-e2e.1`)

### Scenario `SCN-REL-001`
- mapped requirement_id: `REQ-REL-002`
- mapped use_case_id: `UC-REL-001`
- source type: Requirement
- validation level: API (build pipeline behavior)
- expected outcome: mac release path is arm64-explicit
- execution command/harness: static workflow + build-script path validation
- result: Passed

### Scenario `SCN-REL-002`
- mapped requirement_id: `REQ-REL-001`
- mapped use_case_id: `UC-REL-001`
- source type: Requirement
- validation level: API (build pipeline behavior)
- expected outcome: personal flavor deterministic in CI build jobs
- execution command/harness: workflow env inspection
- result: Passed

### Scenario `SCN-REL-003`
- mapped requirement_id: `REQ-REL-004`
- mapped use_case_id: `UC-REL-003`
- source type: Requirement
- validation level: API (release workflow)
- expected outcome: publish step matches produced file families for both platforms
- execution command/harness: workflow path inspection + YAML parse
- result: Passed

### Scenario `SCN-REL-004`
- mapped requirement_id: `REQ-REL-005`
- mapped use_case_id: `UC-REL-004`
- source type: Requirement
- validation level: API (build config)
- expected outcome: missing Apple Team ID does not enforce notarization
- execution command/harness: source inspection
- result: Passed

### Scenario `SCN-REL-005`
- mapped requirement_id: `REQ-REL-003`
- mapped use_case_id: `UC-REL-002`, `UC-REL-003`
- source type: Design-Risk
- validation level: E2E (full GitHub tag release run)
- expected outcome: real tag run publishes both Linux and macOS arm64 assets to release page
- execution command/harness: GitHub Actions run on pushed version tag
- run: `https://github.com/AutoByteus/autobyteus-workspace-superrepo/actions/runs/22432049600`
- result: Failed
- failure classification: Local Fix
- failure evidence:
  - failing job: `Build macOS ARM64`
  - failing step: `Build Electron macOS ARM64`
  - root error: `ModuleNotFoundError: No module named 'distutils'`
- escalation decision:
  - scope remains workflow-environment-specific and bounded
  - no requirement/design change needed
  - proceed with local fix in workflow, then rerun Stage 5.5 and Stage 6

## Scenario Results (Run 2: tag `v2026.02.26-personal-desktop-e2e.2`)
- run: `https://github.com/AutoByteus/autobyteus-workspace-superrepo/actions/runs/22432163196`
- `SCN-REL-005` result: Failed
- failure classification: Local Fix
- failure evidence:
  - failing step: `Install Python setuptools for node-gyp`
  - root error: `error: externally-managed-environment` (PEP 668)
- escalation decision:
  - workflow command adjustment only (`pip --user --break-system-packages`) and rerun Stage 6.
