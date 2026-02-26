# Aggregated Validation

- stage: 6
- overall-status: Completed with infeasible CI-only scenario coverage documented

## Scenario Results

### Scenario `SCN-REL-001`
- mapped requirement_id: `REQ-REL-002`
- mapped use_case_id: `UC-REL-001`
- source type: Requirement
- validation level: API (build pipeline behavior)
- expected outcome: mac release path is arm64-explicit
- execution command/harness: static workflow + build-script path validation
- evidence:
  - `.github/workflows/release-desktop.yml` runs `pnpm build:electron:mac -- --arm64`
  - `build.ts` parses `--arm64` and maps mac target to `Arch.arm64`
- result: Passed

### Scenario `SCN-REL-002`
- mapped requirement_id: `REQ-REL-001`
- mapped use_case_id: `UC-REL-001`
- source type: Requirement
- validation level: API (build pipeline behavior)
- expected outcome: personal flavor deterministic in CI build jobs
- execution command/harness: workflow env inspection
- evidence:
  - mac and linux jobs set `AUTOBYTEUS_BUILD_FLAVOR=personal`
- result: Passed

### Scenario `SCN-REL-003`
- mapped requirement_id: `REQ-REL-004`
- mapped use_case_id: `UC-REL-003`
- source type: Requirement
- validation level: API (release workflow)
- expected outcome: publish step matches produced file families for both platforms
- execution command/harness: workflow path inspection + YAML parse
- evidence:
  - upload/publish patterns include dmg/AppImage and latest metadata
  - YAML parse success: `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release-desktop.yml')"`
- result: Passed

### Scenario `SCN-REL-004`
- mapped requirement_id: `REQ-REL-005`
- mapped use_case_id: `UC-REL-004`
- source type: Requirement
- validation level: API (build config)
- expected outcome: missing Apple Team ID does not enforce notarization
- execution command/harness: source inspection
- evidence:
  - workflow sets `APPLE_TEAM_ID=""`
  - `notarize: !!process.env.APPLE_TEAM_ID` in build config
- result: Passed

### Scenario `SCN-REL-005`
- mapped requirement_id: `REQ-REL-003`
- mapped use_case_id: `UC-REL-002`, `UC-REL-003`
- source type: Design-Risk
- validation level: E2E (full GitHub tag release run)
- expected outcome: real tag run publishes both Linux and macOS arm64 assets to release page
- execution command/harness: GitHub Actions run on pushed version tag
- result: Blocked
- infeasibility reason: cannot trigger/observe remote GitHub Actions release execution from this local environment within current task turn.
- compensating automated evidence:
  - build script transpilation passed (`pnpm --dir autobyteus-web transpile-build`)
  - workflow YAML parse passed
  - artifact publish patterns and job dependencies validated in workflow file
- residual risk:
  - runtime CI environment differences could still cause publish-stage issues until one live tag run is executed.

## Escalation Decisions
- No failing scenarios requiring `Local Fix`/`Design Impact`/`Requirement Gap` classification.
