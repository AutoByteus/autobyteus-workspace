# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-module loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/release-server-dockerhub-publish/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/in-progress/release-server-dockerhub-publish/implementation-plan.md` (solution sketch as lightweight design basis)
- Source Design Version: `v1`
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| `UC-001` | `Requirement` | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005` | `N/A` | Stable release tag publishes version and `latest` | `Yes/Yes/Yes` |
| `UC-002` | `Design-Risk` | `REQ-004`, `REQ-005` | Prevent prerelease tags from overwriting stable `latest` | Prerelease tag publishes only prerelease version tag | `Yes/Yes/Yes` |
| `UC-003` | `Requirement` | `REQ-001`, `REQ-003`, `REQ-004`, `REQ-006` | `N/A` | Manual workflow dispatch re-publishes a release tag | `Yes/Yes/Yes` |

Rules:
- Every in-scope requirement must map to at least one use case in this index.
- `Design-Risk` use cases are allowed only when the technical objective/risk is explicit and testable.

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - move the misplaced nested workflow implementation from `autobyteus-server-ts/.github/workflows/release-docker-image.yml` into a root workflow file
  - remove the nested workflow after the root workflow owns release-time server image publishing
- Retirement plan for temporary logic (if any):
  - no temporary compatibility flow is retained after the move; the nested workflow file is deleted in the same ticket

## Use Case: `UC-001` Stable release tag publishes version and `latest`

### Goal

Publish the server image automatically whenever a stable repository release tag is pushed.

### Preconditions

- git tag push matches the release trigger pattern (for example `v1.2.7`)
- Docker Hub secrets exist in repository settings
- root workflow file exists under `.github/workflows/`

### Expected Outcome

The workflow publishes `autobyteus/autobyteus-server:1.2.7` and `autobyteus/autobyteus-server:latest` (or the configured image name equivalent).

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/release-server-docker.yml:on.push.tags(v1.2.7)
└── .github/workflows/release-server-docker.yml:prepare-release-metadata [STATE]
    ├── .github/workflows/release-server-docker.yml:resolveReleaseRefAndTag(github.ref_name) # release_ref=v1.2.7, release_tag=v1.2.7
    ├── .github/workflows/release-server-docker.yml:normalizeDockerTag(v1.2.7 -> 1.2.7) [STATE]
    ├── .github/workflows/release-server-docker.yml:classifyPrerelease(false) [STATE]
    └── .github/workflows/release-server-docker.yml:emitTags(version=1.2.7, latest=true) [STATE]
        └── .github/workflows/release-server-docker.yml:build-and-push-image [ASYNC]
            ├── actions/checkout:checkout(ref=v1.2.7) [IO]
            ├── docker/setup-qemu-action:setupQemu [IO]
            ├── docker/setup-buildx-action:setupBuildx [IO]
            ├── docker/login-action:loginToDockerHub(secrets.DOCKERHUB_USERNAME, secrets.DOCKERHUB_TOKEN) [IO]
            ├── docker/build-push-action:buildAndPush(context=., file=autobyteus-server-ts/docker/Dockerfile.monorepo, platforms=linux/amd64,linux/arm64, tags=[version,latest]) [IO]
            └── .github/workflows/release-server-docker.yml:publishSummary(version=1.2.7, latest=true) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if image name input is empty
.github/workflows/release-server-docker.yml:prepare-release-metadata
└── .github/workflows/release-server-docker.yml:defaultImageName(env.DEFAULT_IMAGE_NAME) [STATE]
```

```text
[ERROR] if Docker Hub secrets are missing or invalid
docker/login-action:loginToDockerHub(...)
└── GitHub Actions job failure # build-and-push step does not run
```

### State And Data Transformations

- `github.ref_name` -> release metadata tuple (`release_ref`, `release_tag`, `is_prerelease`)
- release tag with leading `v` -> Docker version tag without leading `v`
- metadata tuple -> final docker tags list (`<image>:1.2.7`, `<image>:latest`)

### Observability And Debug Points

- Logs emitted at:
  - metadata resolution step
  - docker build/push step
  - workflow summary step
- Metrics/counters updated at:
  - GitHub Actions job status only
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- whether the default image name should remain `autobyteus/autobyteus-server` or be overridden for this repository

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: `UC-002` Prerelease tag publishes only prerelease version tag

### Goal

Allow prerelease tags to publish a pullable server image without mutating the stable `latest` tag.

### Preconditions

- git tag push matches the release trigger pattern and includes a prerelease suffix (for example `v1.2.7-rc1`)
- Docker Hub secrets exist in repository settings

### Expected Outcome

The workflow publishes `autobyteus/autobyteus-server:1.2.7-rc1` and does not publish `latest`.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/release-server-docker.yml:on.push.tags(v1.2.7-rc1)
└── .github/workflows/release-server-docker.yml:prepare-release-metadata [STATE]
    ├── .github/workflows/release-server-docker.yml:resolveReleaseRefAndTag(github.ref_name) [STATE]
    ├── .github/workflows/release-server-docker.yml:normalizeDockerTag(v1.2.7-rc1 -> 1.2.7-rc1) [STATE]
    ├── .github/workflows/release-server-docker.yml:classifyPrerelease(true) [STATE]
    └── .github/workflows/release-server-docker.yml:emitTags(version=1.2.7-rc1, latest=false) [STATE]
        └── .github/workflows/release-server-docker.yml:build-and-push-image [ASYNC]
            ├── actions/checkout:checkout(ref=v1.2.7-rc1) [IO]
            ├── docker/login-action:loginToDockerHub(...) [IO]
            ├── docker/build-push-action:buildAndPush(context=., file=autobyteus-server-ts/docker/Dockerfile.monorepo, tags=[version-only]) [IO]
            └── .github/workflows/release-server-docker.yml:publishSummary(version=1.2.7-rc1, latest=false) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if prerelease is provided through manual input instead of push tag
.github/workflows/release-server-docker.yml:prepare-release-metadata
└── .github/workflows/release-server-docker.yml:classifyPrereleaseFromReleaseTag(input.release_tag) [STATE]
```

```text
[ERROR] if prerelease detection fails and `latest` would be added incorrectly
.github/workflows/release-server-docker.yml:validateTagClassification(...)
└── GitHub Actions job failure before docker/build-push-action [ERROR]
```

### State And Data Transformations

- prerelease release tag -> normalized prerelease docker tag
- prerelease metadata -> tags list with no `latest`

### Observability And Debug Points

- Logs emitted at:
  - prerelease classification step
  - tag list emission step
- Metrics/counters updated at:
  - GitHub Actions job status only
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- none

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: `UC-003` Manual workflow dispatch re-publishes a release tag

### Goal

Give operators a safe republish path for an existing tag and an optional image-name override.

### Preconditions

- operator manually runs the workflow with `release_tag`
- the specified tag already exists and is reachable for checkout
- Docker Hub secrets exist in repository settings

### Expected Outcome

The workflow checks out the requested release ref, computes tags from the provided `release_tag`, optionally uses the provided image name, and publishes the image.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/release-server-docker.yml:on.workflow_dispatch(release_tag, image_name?)
└── .github/workflows/release-server-docker.yml:prepare-release-metadata [STATE]
    ├── .github/workflows/release-server-docker.yml:validateManualInputs(release_tag != empty) [STATE]
    ├── .github/workflows/release-server-docker.yml:resolveReleaseRefAndTag(input.release_tag) [STATE]
    ├── .github/workflows/release-server-docker.yml:normalizeDockerTag(input.release_tag -> stripped version) [STATE]
    ├── .github/workflows/release-server-docker.yml:resolveImageName(input.image_name || env.DEFAULT_IMAGE_NAME) [STATE]
    └── .github/workflows/release-server-docker.yml:build-and-push-image [ASYNC]
        ├── actions/checkout:checkout(ref=input.release_tag) [IO]
        ├── docker/login-action:loginToDockerHub(...) [IO]
        ├── docker/build-push-action:buildAndPush(context=., file=autobyteus-server-ts/docker/Dockerfile.monorepo, tags=derived) [IO]
        └── .github/workflows/release-server-docker.yml:publishSummary(image=resolvedImageName) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if operator does not supply image_name
.github/workflows/release-server-docker.yml:resolveImageName(...)
└── .github/workflows/release-server-docker.yml:defaultImageName(env.DEFAULT_IMAGE_NAME) [STATE]
```

```text
[ERROR] if release_tag is empty on manual dispatch
.github/workflows/release-server-docker.yml:validateManualInputs(...)
└── GitHub Actions job failure before checkout [ERROR]
```

### State And Data Transformations

- manual inputs -> validated release metadata
- optional image override -> resolved image repository
- release metadata -> docker tags list

### Observability And Debug Points

- Logs emitted at:
  - manual input validation step
  - metadata resolution step
  - workflow summary step
- Metrics/counters updated at:
  - GitHub Actions job status only
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- none

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
