# Future-State Runtime Call Stacks - Fix Server Docker Build

- Scope Classification: `Medium`
- Call Stack Version: `v9`
- Requirements: `tickets/in-progress/fix-server-docker-build/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/fix-server-docker-build/implementation-plan.md` (solution sketch)

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | Docker build process | Yes/N/A/Yes |
| UC-002 | Requirement | R-002 | Docker compose start process | Yes/N/A/Yes |
| UC-003 | Requirement | AC-005 | Optional runtime Git sync | Yes/N/A/Yes |
| UC-004 | Requirement | AC-003, AC-004 | Docker build with variant & push | Yes/N/A/Yes |
| UC-005 | Requirement | AC-008 to AC-011 | Unified server management | Yes/N/A/Yes |

## Use Case: UC-001 Docker build process

### Goal
Successfully build the `autobyteus-server` Docker image locally.

### Primary Runtime Call Stack

```text
[ENTRY] CLI: ./build.sh
├── build.sh: Set default tags
├── [IO] CLI: docker buildx build --load -f Dockerfile.monorepo -t autobyteus-server:latest .
│   └── [STATE] Image available locally
```

## Use Case: UC-003 Optional runtime Git sync

### Goal
Sync code at runtime if `AUTOBYTEUS_SKIP_SYNC=0`.

### Primary Runtime Call Stack

```text
[ENTRY] CLI: /usr/local/bin/autobyteus-bootstrap.sh
├── bootstrap.sh: if [[ "${SKIP_SYNC}" == "1" ]]; then exit 0; fi
├── bootstrap.sh: setup_git_auth() using GITHUB_PAT
├── bootstrap.sh: sync_repo("autobyteus-ts", ...) [IO]
└── bootstrap.sh: sync_repo("autobyteus-server-ts", ...) [IO]
```

## Use Case: UC-004 Docker build with variant & push

### Goal
Build multi-arch image and push to remote registry.

### Primary Runtime Call Stack

```text
[ENTRY] CLI: ./build-multi-arch.sh --push --variant zh
├── build-multi-arch.sh: Set tags (autobyteus/autobyteus-server:latest-zh)
├── [IO] CLI: docker buildx build --push --platform linux/amd64,linux/arm64 --build-arg BASE_IMAGE_TAG=zh -t autobyteus/autobyteus-server:latest-zh .
│   └── [STATE] Image pushed to remote registry
```

## Use Case: UC-005 Unified server management

### Primary Runtime Call Stack

```text
[ENTRY] CLI: ./docker-start.sh up
├── docker-start.sh: Detect ports
├── docker-start.sh: Generate .env (SKIP_SYNC=1 by default)
├── docker-start.sh: ./build.sh
└── docker-start.sh: docker compose up
```
